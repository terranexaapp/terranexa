import { supabase } from './supabase'
import { FAZENDA_PAPEIS, getFazendaPapelMeta } from './fazendaPapeis'
import { enviarEmailConviteFazenda } from './conviteEmail'

const QUEUE_STATUSES = ['pendente_validacao', 'em_analise', 'aguardando_documentos']

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function indexById(rows) {
  return (rows || []).reduce((acc, row) => {
    acc[row.id] = row
    return acc
  }, {})
}

function indexByEmail(rows) {
  return (rows || []).reduce((acc, row) => {
    if (row.email) acc[String(row.email).trim().toLowerCase()] = row
    return acc
  }, {})
}

function toLowerEmail(email) {
  return String(email || '').trim().toLowerCase()
}

async function fetchByIds(table, ids, select = '*') {
  if (!ids.length) return {}
  const { data, error } = await supabase.from(table).select(select).in('id', ids)
  if (error) throw error
  return indexById(data)
}

export async function listarResumoContas() {
  const { data, error } = await supabase
    .from('v_contas_hectares')
    .select('*')
    .order('hectares_ativos', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listarUsuariosCadastrados() {
  const [profilesResult, membrosResult, contasResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, papel, created_at, updated_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('conta_membros')
      .select('id, conta_id, user_id, papel, status, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('contas')
      .select('id, nome, status, plano_nome, hectares_contratados, hectares_tolerancia, controle_hectares_ativo')
      .order('nome', { ascending: true })
  ])

  if (profilesResult.error) throw profilesResult.error
  if (membrosResult.error) throw membrosResult.error
  if (contasResult.error) throw contasResult.error

  const contasById = indexById(contasResult.data || [])
  const vinculosPorUsuario = (membrosResult.data || []).reduce((acc, membro) => {
    const vinculo = { ...membro, conta: contasById[membro.conta_id] || null }
    acc[membro.user_id] = [...(acc[membro.user_id] || []), vinculo]
    return acc
  }, {})

  return (profilesResult.data || []).map(profile => ({
    ...profile,
    vinculos: vinculosPorUsuario[profile.id] || []
  }))
}

async function listarFazendaPapeisDisponiveis(avisos) {
  const { data, error } = await supabase
    .from('fazenda_papeis')
    .select('papel, label, nivel_hierarquia, descricao, permissoes, ativo')
    .eq('ativo', true)
    .order('nivel_hierarquia', { ascending: false })

  if (error) {
    avisos.push('Rode a migration 009 para carregar a matriz de papeis direto do banco.')
    return FAZENDA_PAPEIS
  }

  return (data || []).map(item => ({
    papel: item.papel,
    label: item.label,
    nivel_hierarquia: item.nivel_hierarquia,
    resumo: item.descricao,
    permissoes: item.permissoes || {}
  }))
}

export async function listarHierarquiaUsuariosFazendas() {
  const avisos = []
  const [profilesResult, fazendasResult, contasResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, papel, created_at, updated_at')
      .order('nome', { ascending: true }),
    supabase
      .from('fazendas')
      .select('id, nome, municipio, estado, area_total_ha, ativa, proprietario_id, conta_id, status_liberacao')
      .order('nome', { ascending: true }),
    supabase
      .from('contas')
      .select('id, nome, status, plano_nome, hectares_contratados, hectares_tolerancia, controle_hectares_ativo')
      .order('nome', { ascending: true })
  ])

  if (profilesResult.error) throw profilesResult.error
  if (fazendasResult.error) throw fazendasResult.error
  if (contasResult.error) throw contasResult.error

  const membrosResult = await supabase
    .from('fazenda_membros')
    .select('id, fazenda_id, convidado_por, email, papel, status, token, user_id, criado_em, aceito_em, updated_at')
    .neq('status', 'revogado')
    .order('criado_em', { ascending: false })

  const membros = membrosResult.error ? [] : membrosResult.data || []
  if (membrosResult.error) {
    avisos.push('Rode a migration 009 para liberar a Central a auditar membros por fazenda.')
  }

  const papeis = await listarFazendaPapeisDisponiveis(avisos)
  const papeisById = papeis.reduce((acc, item) => {
    acc[item.papel] = item
    return acc
  }, {})
  const profiles = profilesResult.data || []
  const fazendas = fazendasResult.data || []
  const contasById = indexById(contasResult.data || [])
  const profilesById = indexById(profiles)
  const profilesByEmail = indexByEmail(profiles)

  const membrosPorFazenda = membros.reduce((acc, membro) => {
    const usuario = profilesById[membro.user_id] || profilesByEmail[toLowerEmail(membro.email)] || null
    const papelMeta = papeisById[membro.papel] || getFazendaPapelMeta(membro.papel)
    const item = {
      ...membro,
      usuario,
      papelMeta
    }
    acc[membro.fazenda_id] = [...(acc[membro.fazenda_id] || []), item]
    return acc
  }, {})

  const fazendasComVinculos = fazendas.map(fazenda => {
    const proprietario = profilesById[fazenda.proprietario_id] || null
    return {
      ...fazenda,
      conta: contasById[fazenda.conta_id] || null,
      proprietario,
      membros: membrosPorFazenda[fazenda.id] || []
    }
  })

  const grupos = new Map()
  for (const fazenda of fazendasComVinculos) {
    const key = fazenda.proprietario_id || '__sem_proprietario'
    if (!grupos.has(key)) {
      grupos.set(key, {
        id: key,
        proprietario: fazenda.proprietario || {
          id: key,
          nome: 'Sem proprietario definido',
          email: '',
          papel: ''
        },
        fazendas: [],
        total_ha: 0,
        contas_ids: new Set()
      })
    }
    const grupo = grupos.get(key)
    grupo.fazendas.push(fazenda)
    grupo.total_ha += Number(fazenda.area_total_ha || 0)
    if (fazenda.conta_id) grupo.contas_ids.add(fazenda.conta_id)
  }

  return {
    proprietarios: [...grupos.values()].map(grupo => ({
      ...grupo,
      contas_total: grupo.contas_ids.size,
      contas_ids: [...grupo.contas_ids]
    })),
    fazendas: fazendasComVinculos,
    papeis,
    avisos
  }
}

export async function vincularUsuarioFazenda({ fazendaId, email, papel, userId = null, convidadoPor = null }) {
  const normalizedEmail = toLowerEmail(email)
  if (!fazendaId) throw new Error('Selecione a fazenda.')
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Informe um e-mail valido.')
  if (!papel) throw new Error('Selecione o papel do usuario.')

  const payload = {
    fazenda_id: fazendaId,
    email: normalizedEmail,
    papel,
    status: userId ? 'aceito' : 'pendente',
    user_id: userId || null,
    convidado_por: convidadoPor || null,
    aceito_em: userId ? new Date().toISOString() : null
  }

  const { data, error } = await supabase
    .from('fazenda_membros')
    .upsert(payload, { onConflict: 'fazenda_id,email' })
    .select()
    .single()
  if (error) throw error
  if (!userId) {
    try {
      const emailStatus = await enviarEmailConviteFazenda({
        fazendaId,
        email: normalizedEmail,
        papel,
        conviteToken: data.token
      })
      return { ...data, emailStatus }
    } catch (err) {
      return { ...data, emailError: err.message || 'Vinculo criado, mas o e-mail de convite nao foi enviado.' }
    }
  }
  return data
}

export async function atualizarPapelUsuarioFazenda(vinculoId, papel) {
  const { data, error } = await supabase
    .from('fazenda_membros')
    .update({ papel })
    .eq('id', vinculoId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarPermissoesPapelFazenda(papel, permissoes) {
  const { data, error } = await supabase
    .from('fazenda_papeis')
    .update({
      permissoes: permissoes || {},
      updated_at: new Date().toISOString()
    })
    .eq('papel', papel)
    .select('papel, label, nivel_hierarquia, descricao, permissoes, ativo')
    .single()
  if (error) throw error
  return {
    papel: data.papel,
    label: data.label,
    nivel_hierarquia: data.nivel_hierarquia,
    resumo: data.descricao,
    permissoes: data.permissoes || {}
  }
}

export async function listarCatalogoPragasCulturas() {
  const [culturasResult, pragasResult, vinculosResult] = await Promise.all([
    supabase
      .from('catalogo_culturas')
      .select('id, nome, ordem, ativo')
      .eq('ativo', true)
      .order('ordem', { ascending: true }),
    supabase
      .from('catalogo_pragas')
      .select('id, codigo, nome_comum, nome_cientifico, tipo, ativo, sintomas, nivel_dano_economico, foto_url, foto_credito, foto_fonte_url, instrucoes_monitoramento, campos_monitoramento')
      .order('tipo', { ascending: true })
      .order('nome_comum', { ascending: true }),
    supabase
      .from('catalogo_praga_culturas')
      .select('catalogo_praga_id, cultura_id')
  ])

  if (culturasResult.error) throw culturasResult.error
  if (pragasResult.error) throw pragasResult.error
  if (vinculosResult.error) throw vinculosResult.error

  const culturasPorPraga = (vinculosResult.data || []).reduce((acc, vinculo) => {
    acc[vinculo.catalogo_praga_id] = [...(acc[vinculo.catalogo_praga_id] || []), vinculo.cultura_id]
    return acc
  }, {})

  return {
    culturas: culturasResult.data || [],
    pragas: (pragasResult.data || []).map(praga => ({
      ...praga,
      culturaIds: culturasPorPraga[praga.id] || []
    }))
  }
}

function normalizeCatalogoPraga(payload) {
  const campos = Array.isArray(payload.campos_monitoramento) ? payload.campos_monitoramento : []
  return {
    codigo: String(payload.codigo || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .slice(0, 48),
    nome_comum: String(payload.nome_comum || '').trim(),
    nome_cientifico: payload.nome_cientifico?.trim() || null,
    tipo: payload.tipo || 'praga',
    ativo: payload.ativo !== false,
    sintomas: payload.sintomas?.trim() || null,
    nivel_dano_economico: payload.nivel_dano_economico?.trim() || null,
    foto_url: payload.foto_url?.trim() || null,
    foto_credito: payload.foto_credito?.trim() || null,
    foto_fonte_url: payload.foto_fonte_url?.trim() || null,
    instrucoes_monitoramento: payload.instrucoes_monitoramento?.trim() || null,
    campos_monitoramento: campos
      .map((campo, index) => ({
        id: String(campo.id || campo.label || `campo_${index + 1}`)
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 40),
        label: String(campo.label || '').trim(),
        tipo: campo.tipo || 'texto',
        unidade: campo.unidade?.trim() || null,
        opcoes: campo.opcoes?.trim() || null,
        obrigatorio: Boolean(campo.obrigatorio)
      }))
      .filter(campo => campo.id && campo.label)
  }
}

export async function salvarCatalogoPraga(payload) {
  const normalized = normalizeCatalogoPraga(payload)
  if (!normalized.codigo) throw new Error('Informe um codigo para o item do catalogo.')
  if (!normalized.nome_comum) throw new Error('Informe o nome comum.')

  const query = payload.id
    ? supabase
        .from('catalogo_pragas')
        .update({ ...normalized, updated_at: new Date().toISOString() })
        .eq('id', payload.id)
    : supabase.from('catalogo_pragas').insert(normalized)

  const { data, error } = await query
    .select('id, codigo, nome_comum, nome_cientifico, tipo, ativo, sintomas, nivel_dano_economico, foto_url, foto_credito, foto_fonte_url, instrucoes_monitoramento, campos_monitoramento')
    .single()
  if (error) throw error

  await supabase.rpc('sincronizar_catalogo_pragas_todas_fazendas').catch(() => null)
  return { ...data, culturaIds: payload.culturaIds || [] }
}

export async function salvarCulturasPraga({ catalogoPragaId, culturaIds }) {
  const { data, error } = await supabase.rpc('definir_culturas_catalogo_praga', {
    p_catalogo_praga_id: catalogoPragaId,
    p_culturas: culturaIds || []
  })
  if (error) throw error
  return data
}

export async function listarSolicitacoesLiberacao({ status = 'fila' } = {}) {
  let query = supabase.from('solicitacoes_liberacao').select('*').order('created_at', { ascending: true })

  if (status === 'fila') {
    query = query.in('status', QUEUE_STATUSES)
  } else if (status && status !== 'todas') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error

  const solicitacoes = data || []
  const [contas, fazendas, talhoes, perfis] = await Promise.all([
    fetchByIds(
      'contas',
      unique(solicitacoes.map(item => item.conta_id)),
      'id, nome, documento, documento_tipo, status, plano_nome, hectares_contratados, hectares_tolerancia, controle_hectares_ativo'
    ),
    fetchByIds('fazendas', unique(solicitacoes.map(item => item.fazenda_id)), 'id, nome, municipio, estado, area_total_ha, ativa'),
    fetchByIds(
      'talhoes',
      unique(solicitacoes.map(item => item.talhao_id)),
      'id, codigo, nome, cultura, area_ha, ativo, liberacao_status, bloqueio_comercial_motivo'
    ),
    fetchByIds(
      'profiles',
      unique([
        ...solicitacoes.map(item => item.criado_por),
        ...solicitacoes.map(item => item.atribuido_para),
        ...solicitacoes.map(item => item.decidido_por)
      ]),
      'id, nome, email, papel'
    )
  ])

  return solicitacoes.map(item => ({
    ...item,
    conta: contas[item.conta_id],
    fazenda: fazendas[item.fazenda_id],
    talhao: talhoes[item.talhao_id],
    criadoPor: perfis[item.criado_por],
    atribuidoPara: perfis[item.atribuido_para],
    decididoPor: perfis[item.decidido_por]
  }))
}

export async function buscarDossieSolicitacao(solicitacao) {
  if (!solicitacao) return { evidencias: [], revisoes: [], eventos: [] }

  const [evidenciasResult, revisoesResult, eventosResult] = await Promise.all([
    supabase
      .from('solicitacao_evidencias')
      .select('*')
      .eq('solicitacao_id', solicitacao.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('solicitacao_revisoes')
      .select('*')
      .eq('solicitacao_id', solicitacao.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('audit_events')
      .select('*')
      .or(`solicitacao_id.eq.${solicitacao.id},conta_id.eq.${solicitacao.conta_id}`)
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  if (evidenciasResult.error) throw evidenciasResult.error
  if (revisoesResult.error) throw revisoesResult.error
  if (eventosResult.error) throw eventosResult.error

  return {
    evidencias: evidenciasResult.data || [],
    revisoes: revisoesResult.data || [],
    eventos: eventosResult.data || []
  }
}

export async function registrarRevisao({ solicitacaoId, acao, statusAnterior, statusNovo, observacao, userId }) {
  const { error } = await supabase.from('solicitacao_revisoes').insert({
    solicitacao_id: solicitacaoId,
    acao,
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    observacao,
    criado_por: userId
  })
  if (error) throw error
}

export async function iniciarAnalise(solicitacao, userId) {
  const { error } = await supabase
    .from('solicitacoes_liberacao')
    .update({ status: 'em_analise', atribuido_para: userId })
    .eq('id', solicitacao.id)
  if (error) throw error

  await registrarRevisao({
    solicitacaoId: solicitacao.id,
    acao: 'iniciar_analise',
    statusAnterior: solicitacao.status,
    statusNovo: 'em_analise',
    observacao: 'Analise iniciada.',
    userId
  })
}

export async function pedirDocumentos(solicitacao, observacao, userId) {
  const { error } = await supabase
    .from('solicitacoes_liberacao')
    .update({ status: 'aguardando_documentos', atribuido_para: userId, decisao_observacao: observacao })
    .eq('id', solicitacao.id)
  if (error) throw error

  await registrarRevisao({
    solicitacaoId: solicitacao.id,
    acao: 'pedir_documento',
    statusAnterior: solicitacao.status,
    statusNovo: 'aguardando_documentos',
    observacao,
    userId
  })
}

export async function rejeitarSolicitacao(solicitacao, observacao, userId) {
  const { error } = await supabase
    .from('solicitacoes_liberacao')
    .update({
      status: 'rejeitado',
      decidido_por: userId,
      decidido_em: new Date().toISOString(),
      decisao_observacao: observacao
    })
    .eq('id', solicitacao.id)
  if (error) throw error

  if (solicitacao.talhao_id) {
    const { error: talhaoError } = await supabase
      .from('talhoes')
      .update({
        ativo: false,
        liberacao_status: 'rejeitado',
        bloqueio_comercial_motivo: observacao || 'Liberacao comercial rejeitada.'
      })
      .eq('id', solicitacao.talhao_id)
    if (talhaoError) throw talhaoError
  }

  await registrarRevisao({
    solicitacaoId: solicitacao.id,
    acao: 'rejeitar',
    statusAnterior: solicitacao.status,
    statusNovo: 'rejeitado',
    observacao,
    userId
  })
}

export async function aprovarSolicitacao(solicitacao, observacao, userId) {
  const { error } = await supabase
    .from('solicitacoes_liberacao')
    .update({
      status: 'aprovado',
      decidido_por: userId,
      decidido_em: new Date().toISOString(),
      decisao_observacao: observacao
    })
    .eq('id', solicitacao.id)
  if (error) throw error

  if (solicitacao.talhao_id) {
    const { error: talhaoError } = await supabase
      .from('talhoes')
      .update({
        ativo: true,
        liberacao_status: 'aprovado_manual',
        bloqueio_comercial_motivo: null,
        liberacao_validada_por: userId,
        liberacao_validada_em: new Date().toISOString()
      })
      .eq('id', solicitacao.talhao_id)
    if (talhaoError) throw talhaoError
  }

  await registrarRevisao({
    solicitacaoId: solicitacao.id,
    acao: 'aprovar',
    statusAnterior: solicitacao.status,
    statusNovo: 'aprovado',
    observacao,
    userId
  })
}

export async function atualizarContratoConta(contaId, payload, userId) {
  const contrato = {
    plano_nome: payload.plano_nome,
    hectares_contratados: Number(payload.hectares_contratados || 0),
    hectares_tolerancia: Number(payload.hectares_tolerancia || 0),
    status: 'ativa',
    criado_por: userId
  }

  const { error: encerrarError } = await supabase
    .from('assinaturas')
    .update({ status: 'encerrada', fim_em: new Date().toISOString() })
    .eq('conta_id', contaId)
    .eq('status', 'ativa')
  if (encerrarError) throw encerrarError

  const { error: assinaturaError } = await supabase.from('assinaturas').insert({ conta_id: contaId, ...contrato })
  if (assinaturaError) throw assinaturaError

  const { error: contaError } = await supabase
    .from('contas')
    .update({
      plano_nome: contrato.plano_nome,
      hectares_contratados: contrato.hectares_contratados,
      hectares_tolerancia: contrato.hectares_tolerancia,
      controle_hectares_ativo: payload.controle_hectares_ativo,
      status: payload.status || 'ativa'
    })
    .eq('id', contaId)
  if (contaError) throw contaError
}
