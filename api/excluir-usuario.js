import { createClient } from '@supabase/supabase-js'

const INTERNAL_ROLES = ['terranexa_admin', 'comercial', 'suporte']

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
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

function notFoundAuthError(error) {
  const text = `${error?.message || ''} ${error?.code || ''} ${error?.status || ''}`.toLowerCase()
  return text.includes('not found') || text.includes('404') || text.includes('user_not_found')
}

async function findTargetProfile(adminClient, userId, email) {
  if (userId) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, nome, email, papel')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('id, nome, email, papel')
    .eq('email', email)
    .maybeSingle()
  if (error) throw error
  return data
}

async function updateCount(query) {
  const { data, error } = await query.select('id')
  if (error) throw error
  return data?.length || 0
}

async function revogarVinculosFazenda(adminClient, target) {
  const updatedAt = new Date().toISOString()
  const updates = [
    adminClient
      .from('fazenda_membros')
      .update({
        status: 'revogado',
        user_id: null,
        aceito_em: null,
        updated_at: updatedAt
      })
      .eq('user_id', target.id)
      .neq('status', 'revogado')
  ]

  const targetEmail = normalizeEmail(target.email)
  if (targetEmail) {
    updates.push(
      adminClient
        .from('fazenda_membros')
        .update({
          status: 'revogado',
          user_id: null,
          aceito_em: null,
          updated_at: updatedAt
        })
        .eq('email', targetEmail)
        .neq('status', 'revogado')
    )
  }

  let total = 0
  for (const query of updates) {
    total += await updateCount(query)
  }
  return total
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
      message: 'Configure SUPABASE_SERVICE_ROLE_KEY no ambiente de producao para excluir usuarios.'
    })
  }

  const token = getBearerToken(req)
  if (!token) return json(res, 401, { error: 'nao_autenticado' })

  const body = parseBody(req.body)
  if (body === null) return json(res, 400, { error: 'json_invalido' })

  const userId = body?.userId || body?.user_id || ''
  const email = normalizeEmail(body?.email)
  if (!userId && !email) return json(res, 400, { error: 'usuario_obrigatorio' })
  if (userId && !isUuid(userId)) return json(res, 400, { error: 'usuario_invalido' })
  if (email && !email.includes('@')) return json(res, 400, { error: 'email_invalido' })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const {
    data: { user: actor },
    error: actorError
  } = await userClient.auth.getUser()
  if (actorError || !actor) return json(res, 401, { error: 'sessao_invalida' })

  const { data: actorProfile, error: actorProfileError } = await adminClient
    .from('profiles')
    .select('id, email, papel')
    .eq('id', actor.id)
    .maybeSingle()
  if (actorProfileError) return json(res, 500, { error: 'perfil_operador_falhou', message: actorProfileError.message })
  if (actorProfile?.papel !== 'terranexa_admin') {
    return json(res, 403, {
      error: 'acesso_negado',
      message: 'Somente terranexa_admin pode excluir usuarios pela Central TerraNexa.'
    })
  }

  let target
  try {
    target = await findTargetProfile(adminClient, userId, email)
  } catch (err) {
    return json(res, 500, { error: 'usuario_consulta_falhou', message: err.message })
  }

  if (!target) return json(res, 404, { error: 'usuario_nao_encontrado' })
  if (target.id === actor.id) {
    return json(res, 409, {
      error: 'autoexclusao_bloqueada',
      message: 'Voce nao pode excluir o proprio usuario logado.'
    })
  }
  if (INTERNAL_ROLES.includes(target.papel)) {
    return json(res, 409, {
      error: 'usuario_interno_protegido',
      message: 'Usuarios internos TerraNexa devem ser removidos manualmente com dupla conferencia.'
    })
  }

  const { count: fazendasProprias, error: fazendasError } = await adminClient
    .from('fazendas')
    .select('id', { count: 'exact', head: true })
    .eq('proprietario_id', target.id)
  if (fazendasError) return json(res, 500, { error: 'fazendas_consulta_falhou', message: fazendasError.message })
  if (fazendasProprias > 0) {
    return json(res, 409, {
      error: 'usuario_possui_fazendas',
      message: 'Este usuario e proprietario de fazenda. Transfira ou regularize as fazendas antes de excluir o login.'
    })
  }

  try {
    const fazendaVinculosRevogados = await revogarVinculosFazenda(adminClient, {
      ...target,
      email: target.email || email
    })
    const contaVinculosRemovidos = await updateCount(
      adminClient
        .from('conta_membros')
        .update({ status: 'removido', updated_at: new Date().toISOString() })
        .eq('user_id', target.id)
        .neq('status', 'removido')
    )

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target.id, false)
    if (authDeleteError && !notFoundAuthError(authDeleteError)) throw authDeleteError

    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', target.id)
    if (profileDeleteError) throw profileDeleteError

    return json(res, 200, {
      ok: true,
      message: 'Usuario excluido da autenticacao e dos vinculos operacionais.',
      usuario: { id: target.id, email: target.email },
      fazendaVinculosRevogados,
      contaVinculosRemovidos
    })
  } catch (err) {
    return json(res, 500, {
      error: 'exclusao_falhou',
      message: err.message || 'Nao foi possivel excluir o usuario.'
    })
  }
}
