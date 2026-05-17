import { supabase } from './supabase'

export async function listarUltimosMonitoramentos(talhaoIds = []) {
  const ids = Array.from(new Set((talhaoIds || []).filter(Boolean)))
  if (!ids.length) return []

  const { data, error } = await supabase
    .from('monitoramentos')
    .select('id, talhao_id, visitado_em, dano, severidade, observacoes, status, created_at')
    .in('talhao_id', ids)
    .order('visitado_em', { ascending: false })

  if (error) throw error

  const seen = new Set()
  return (data || []).filter(item => {
    if (!item?.talhao_id || seen.has(item.talhao_id)) return false
    seen.add(item.talhao_id)
    return true
  })
}

export async function listarMonitoramentosFazenda(fazendaId, { dataInicio, dataFim, talhaoIds } = {}) {
  const { data: talhoes, error: talErr } = await supabase
    .from('talhoes')
    .select('id, codigo, cultura')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
  if (talErr) throw talErr

  const ids = (talhoes || []).map(t => t.id)
  if (!ids.length) return { monitoramentos: [], talhoesMap: new Map() }

  const allowed = talhaoIds && talhaoIds.length ? ids.filter(id => talhaoIds.includes(id)) : ids
  if (!allowed.length) return { monitoramentos: [], talhoesMap: new Map(talhoes.map(t => [t.id, t])) }

  let q = supabase
    .from('monitoramentos')
    .select('id, talhao_id, visitado_em, dano, severidade, observacoes, status, created_at')
    .in('talhao_id', allowed)
    .order('visitado_em', { ascending: false })
  if (dataInicio) q = q.gte('visitado_em', dataInicio)
  if (dataFim) q = q.lte('visitado_em', dataFim)
  const { data, error } = await q
  if (error) throw error

  return {
    monitoramentos: data || [],
    talhoesMap: new Map((talhoes || []).map(t => [t.id, t]))
  }
}

export async function listarPontosFazenda(fazendaId, { dataInicio, dataFim } = {}) {
  const { monitoramentos } = await listarMonitoramentosFazenda(fazendaId, { dataInicio, dataFim })
  const monIds = monitoramentos.map(m => m.id)
  if (!monIds.length) return []

  const { data, error } = await supabase
    .from('monitoramento_pontos')
    .select('id, monitoramento_id, tipo, latitude, longitude, precisao_m, observacoes, created_at')
    .in('monitoramento_id', monIds)
  if (error) throw error
  return data || []
}

export async function criarMonitoramento({
  talhao_id,
  observacoes,
  dano = 'sem_dano_economico',
  severidade = 'baixa',
  status = 'realizado'
}) {
  const { data, error } = await supabase
    .from('monitoramentos')
    .insert({
      talhao_id,
      dano,
      severidade,
      observacoes: observacoes || null,
      status,
      visitado_em: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function criarMonitoramentoPonto({
  monitoramento_id,
  tipo,
  latitude,
  longitude,
  precisao_m,
  observacoes,
  praga_doenca_id,
  estadio_fenologico,
  severidade,
  percentual_dano,
  recomendacao,
  foto_url,
  tipo_registro,
  dados_especificos
}) {
  const payload = {
    monitoramento_id,
    tipo: tipo || 'ocorrencia',
    latitude: Number(latitude),
    longitude: Number(longitude),
    precisao_m: Number(precisao_m || 0),
    observacoes: observacoes || null
  }
  if (praga_doenca_id !== undefined) payload.praga_doenca_id = praga_doenca_id || null
  if (estadio_fenologico !== undefined) payload.estadio_fenologico = estadio_fenologico || null
  if (severidade !== undefined) payload.severidade = severidade || null
  if (percentual_dano !== undefined) payload.percentual_dano = percentual_dano == null ? null : Number(percentual_dano)
  if (recomendacao !== undefined) payload.recomendacao = recomendacao || null
  if (foto_url !== undefined) payload.foto_url = foto_url || null
  if (tipo_registro !== undefined) payload.tipo_registro = tipo_registro || 'ocorrencia'
  if (dados_especificos !== undefined) payload.dados_especificos = dados_especificos || null

  const { data, error } = await supabase.from('monitoramento_pontos').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function salvarCaminhamento(monitoramentoId, trilha, iniciadoEm) {
  if (!monitoramentoId || !Array.isArray(trilha) || trilha.length === 0) return null
  const { data, error } = await supabase
    .from('monitoramento_caminhamentos')
    .insert({
      monitoramento_id: monitoramentoId,
      trilha,
      iniciado_em: iniciadoEm || new Date().toISOString(),
      finalizado_em: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listarPontosDoMonitoramento(monitoramentoId) {
  const { data, error } = await supabase
    .from('monitoramento_pontos')
    .select(
      'id, tipo, latitude, longitude, precisao_m, observacoes, created_at, ' +
        'praga_doenca_id, estadio_fenologico, severidade, percentual_dano, recomendacao, foto_url, ' +
        'praga_doenca:pragas_doencas(id, nome_comum, nome_cientifico, tipo, nivel_dano_economico)'
    )
    .eq('monitoramento_id', monitoramentoId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export const ESCALAS_SEVERIDADE = [
  { id: 'leve', label: 'Leve', cor: '#7EC850' },
  { id: 'moderada', label: 'Moderada', cor: '#E8A84C' },
  { id: 'severa', label: 'Severa', cor: '#E85A3A' },
  { id: 'nde', label: 'NDE atingido', cor: '#B0271F' }
]

export function getSeveridadeInfo(severidade) {
  return ESCALAS_SEVERIDADE.find(s => s.id === severidade) || null
}

export const TIPOS_PONTO = [
  { id: 'ponto', label: 'Ponto de scouting' },
  { id: 'ocorrencia', label: 'Ocorrência' },
  { id: 'armadilha', label: 'Armadilha' },
  { id: 'amostragem', label: 'Amostragem' }
]

