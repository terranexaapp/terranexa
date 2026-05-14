import { supabase } from './supabase'

export async function listarPluviometros(fazendaId) {
  const { data, error } = await supabase
    .from('pluviometros')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function criarPluviometro({ fazenda_id, nome, latitude, longitude, talhao_id }) {
  const { data, error } = await supabase
    .from('pluviometros')
    .insert({
      fazenda_id,
      nome,
      latitude: Number(latitude),
      longitude: Number(longitude),
      talhao_id: talhao_id || null
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarPluviometro(id, payload) {
  const update = {}
  if (payload.nome !== undefined) update.nome = payload.nome
  if (payload.latitude !== undefined) update.latitude = Number(payload.latitude)
  if (payload.longitude !== undefined) update.longitude = Number(payload.longitude)
  if (payload.talhao_id !== undefined) update.talhao_id = payload.talhao_id || null

  const { data, error } = await supabase
    .from('pluviometros')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarPluviometro(id) {
  const { error } = await supabase
    .from('pluviometros')
    .update({ ativo: false })
    .eq('id', id)
  if (error) throw error
}
