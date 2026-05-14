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

export async function criarMonitoramento({ talhao_id, observacoes, dano = 'sem_dano_economico', severidade = 'baixa', status = 'realizado' }) {
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

export async function criarMonitoramentoPonto({ monitoramento_id, tipo, latitude, longitude, precisao_m, observacoes }) {
  const { data, error } = await supabase
    .from('monitoramento_pontos')
    .insert({
      monitoramento_id,
      tipo: tipo || 'ponto',
      latitude: Number(latitude),
      longitude: Number(longitude),
      precisao_m: Number(precisao_m || 0),
      observacoes: observacoes || null
    })
    .select()
    .single()

  if (error) throw error
  return data
}
