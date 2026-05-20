import { createClient } from '@supabase/supabase-js'

const INTERNAL_ROLES = ['terranexa_admin', 'comercial', 'suporte']
const OPTIONAL_SYNC_COLUMNS = ['foto_url', 'instrucoes_monitoramento', 'campos_monitoramento']
const UPSERT_BATCH_SIZE = 300

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

function parseBody(body) {
  if (!body) return {}
  if (typeof body !== 'string') return body
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  )
}

function uniqueCulturas(values) {
  if (!Array.isArray(values)) return null
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
}

function httpError(status, error, message) {
  const err = new Error(message || error)
  err.status = status
  err.error = error
  return err
}

function isMissingColumnError(error, column) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return text.includes(column.toLowerCase()) && (text.includes('column') || text.includes('schema cache'))
}

function withoutColumns(rows, columns) {
  return rows.map(row => {
    const next = { ...row }
    for (const column of columns) delete next[column]
    return next
  })
}

async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) throw error

    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function requireInternalUser({ userClient, adminClient }) {
  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser()
  if (userError || !user) throw httpError(401, 'sessao_invalida', 'Sessao expirada. Entre novamente na Central TerraNexa.')

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, email, papel')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw httpError(500, 'perfil_operador_falhou', profileError.message)
  if (!INTERNAL_ROLES.includes(profile?.papel)) {
    throw httpError(403, 'acesso_negado', 'Somente usuarios internos TerraNexa podem editar o catalogo central.')
  }

  return { user, profile }
}

async function validarCulturas(adminClient, culturaIds) {
  if (!culturaIds.length) return

  const { data, error } = await adminClient.from('catalogo_culturas').select('id').in('id', culturaIds)
  if (error) throw httpError(500, 'culturas_consulta_falhou', error.message)

  const validIds = new Set((data || []).map(cultura => cultura.id))
  const invalidas = culturaIds.filter(culturaId => !validIds.has(culturaId))
  if (invalidas.length) {
    throw httpError(400, 'culturas_invalidas', `Culturas invalidas: ${invalidas.join(', ')}`)
  }
}

async function salvarVinculosCatalogo(adminClient, catalogoPragaId, culturaIds) {
  const { data: praga, error: pragaError } = await adminClient
    .from('catalogo_pragas')
    .select('id, nome_comum')
    .eq('id', catalogoPragaId)
    .maybeSingle()
  if (pragaError) throw httpError(500, 'catalogo_consulta_falhou', pragaError.message)
  if (!praga) throw httpError(404, 'catalogo_praga_nao_encontrado', 'Item do catalogo nao encontrado.')

  await validarCulturas(adminClient, culturaIds)

  const { data: anteriores, error: anterioresError } = await adminClient
    .from('catalogo_praga_culturas')
    .select('catalogo_praga_id, cultura_id')
    .eq('catalogo_praga_id', catalogoPragaId)
  if (anterioresError) throw httpError(500, 'culturas_anteriores_falharam', anterioresError.message)

  const { error: deleteError } = await adminClient
    .from('catalogo_praga_culturas')
    .delete()
    .eq('catalogo_praga_id', catalogoPragaId)
  if (deleteError) throw httpError(500, 'culturas_remocao_falhou', deleteError.message)

  if (culturaIds.length) {
    const rows = culturaIds.map(culturaId => ({
      catalogo_praga_id: catalogoPragaId,
      cultura_id: culturaId
    }))
    const { error: insertError } = await adminClient.from('catalogo_praga_culturas').insert(rows)
    if (insertError) {
      if (anteriores?.length) await adminClient.from('catalogo_praga_culturas').insert(anteriores)
      throw httpError(500, 'culturas_gravacao_falhou', insertError.message)
    }
  }

  const { error: updateError } = await adminClient
    .from('catalogo_pragas')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', catalogoPragaId)
  if (updateError) throw httpError(500, 'catalogo_atualizacao_falhou', updateError.message)

  return praga
}

async function listarCatalogoAtivo(adminClient) {
  const fullSelect =
    'id, codigo, nome_comum, nome_cientifico, tipo, sintomas, nivel_dano_economico, foto_url, instrucoes_monitoramento, campos_monitoramento'
  try {
    const items = await fetchAll(() => adminClient.from('catalogo_pragas').select(fullSelect).eq('ativo', true))
    return { items, extras: true }
  } catch (fullError) {
    if (!isMissingColumnError(fullError, 'instrucoes_monitoramento') && !isMissingColumnError(fullError, 'campos_monitoramento')) {
      throw httpError(500, 'catalogo_sync_consulta_falhou', fullError.message)
    }

    const items = await fetchAll(() =>
      adminClient
        .from('catalogo_pragas')
        .select('id, codigo, nome_comum, nome_cientifico, tipo, sintomas, nivel_dano_economico, foto_url')
        .eq('ativo', true)
    )
    return { items, extras: false }
  }
}

async function listarExistentesPorFazendaCodigo(adminClient) {
  try {
    const rows = await fetchAll(() => adminClient.from('pragas_doencas').select('fazenda_id, codigo, foto_url'))
    return new Map(rows.map(row => [`${row.fazenda_id}:${row.codigo}`, row]))
  } catch (error) {
    if (!isMissingColumnError(error, 'foto_url')) {
      throw httpError(500, 'catalogo_sync_existentes_falharam', error.message)
    }

    const rows = await fetchAll(() => adminClient.from('pragas_doencas').select('fazenda_id, codigo'))
    return new Map(rows.map(row => [`${row.fazenda_id}:${row.codigo}`, row]))
  }
}

async function upsertPragasDoencas(adminClient, rows) {
  let payload = rows
  let removedColumns = []

  for (let attempt = 0; attempt < OPTIONAL_SYNC_COLUMNS.length + 1; attempt += 1) {
    let failed = null

    for (let index = 0; index < payload.length; index += UPSERT_BATCH_SIZE) {
      const batch = payload.slice(index, index + UPSERT_BATCH_SIZE)
      const { error } = await adminClient.from('pragas_doencas').upsert(batch, {
        onConflict: 'fazenda_id,codigo'
      })
      if (error) {
        failed = error
        break
      }
    }

    if (!failed) return removedColumns

    const missingColumns = OPTIONAL_SYNC_COLUMNS.filter(
      column => !removedColumns.includes(column) && isMissingColumnError(failed, column)
    )
    if (!missingColumns.length) throw httpError(500, 'catalogo_sync_gravacao_falhou', failed.message)

    removedColumns = [...removedColumns, ...missingColumns]
    payload = withoutColumns(payload, missingColumns)
  }

  return removedColumns
}

async function sincronizarCatalogoPragasTodasFazendas(adminClient) {
  let fazendas
  try {
    fazendas = await fetchAll(() => adminClient.from('fazendas').select('id'))
  } catch (err) {
    throw httpError(500, 'fazendas_sync_consulta_falhou', err.message)
  }
  if (!fazendas?.length) return { totalFazendas: 0, avisos: [] }

  const [{ items: catalogo }, vinculos, existentes] = await Promise.all([
    listarCatalogoAtivo(adminClient),
    fetchAll(() => adminClient.from('catalogo_praga_culturas').select('catalogo_praga_id, cultura_id')),
    listarExistentesPorFazendaCodigo(adminClient)
  ])

  const culturasPorItem = (vinculos || []).reduce((acc, vinculo) => {
    if (!acc[vinculo.catalogo_praga_id]) acc[vinculo.catalogo_praga_id] = []
    acc[vinculo.catalogo_praga_id].push(vinculo.cultura_id)
    return acc
  }, {})

  const now = new Date().toISOString()
  const rows = []
  for (const fazenda of fazendas) {
    for (const item of catalogo) {
      const culturas = [...new Set(culturasPorItem[item.id] || [])].sort()
      const existente = existentes.get(`${fazenda.id}:${item.codigo}`)
      rows.push({
        fazenda_id: fazenda.id,
        catalogo_praga_id: item.id,
        codigo: item.codigo,
        nome_comum: item.nome_comum,
        nome_cientifico: item.nome_cientifico,
        tipo: item.tipo,
        cultura_alvo: culturas.length ? culturas.join(',') : 'multi',
        sintomas: item.sintomas,
        nivel_dano_economico: item.nivel_dano_economico,
        foto_url: existente?.foto_url || item.foto_url || null,
        instrucoes_monitoramento: item.instrucoes_monitoramento || null,
        campos_monitoramento: item.campos_monitoramento || [],
        ativo: true,
        updated_at: now
      })
    }
  }

  const removedColumns = await upsertPragasDoencas(adminClient, rows)
  const avisos = removedColumns.length ? [`Colunas opcionais ausentes ignoradas na sincronizacao: ${removedColumns.join(', ')}`] : []
  return { totalFazendas: fazendas.length, avisos }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (req.method !== 'POST') return json(res, 405, { error: 'metodo_nao_permitido' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(res, 500, {
      error: 'configuracao_indisponivel',
      message: 'Configure SUPABASE_SERVICE_ROLE_KEY no ambiente de producao para salvar culturas do catalogo.'
    })
  }

  const token = getBearerToken(req)
  if (!token) return json(res, 401, { error: 'nao_autenticado' })

  const body = parseBody(req.body)
  if (body === null) return json(res, 400, { error: 'json_invalido' })

  const catalogoPragaId = body?.catalogoPragaId || body?.catalogo_praga_id
  const culturaIds = uniqueCulturas(body?.culturaIds || body?.culturas || [])
  if (!isUuid(catalogoPragaId)) return json(res, 400, { error: 'catalogo_praga_invalido' })
  if (!culturaIds) return json(res, 400, { error: 'culturas_invalidas' })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  try {
    await requireInternalUser({ userClient, adminClient })
    const praga = await salvarVinculosCatalogo(adminClient, catalogoPragaId, culturaIds)
    const sync = await sincronizarCatalogoPragasTodasFazendas(adminClient)

    return json(res, 200, {
      ok: true,
      message: 'Culturas do catalogo salvas e fazendas sincronizadas.',
      catalogoPraga: { id: praga.id, nome_comum: praga.nome_comum },
      culturaIds,
      totalFazendas: sync.totalFazendas,
      avisos: sync.avisos
    })
  } catch (err) {
    return json(res, err.status || 500, {
      error: err.error || 'catalogo_culturas_falhou',
      message: err.message || 'Nao foi possivel salvar as culturas do catalogo.'
    })
  }
}
