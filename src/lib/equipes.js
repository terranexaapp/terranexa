import { supabase } from './supabase'

export async function listarEquipes(fazendaId) {
  const { data, error } = await supabase.from('equipes').select('*').eq('fazenda_id', fazendaId).eq('ativa', true).order('nome')
  if (error) throw error
  return data || []
}

export async function criarEquipe({ fazenda_id, nome, responsavel }) {
  const { data, error } = await supabase.from('equipes').insert({ fazenda_id, nome, responsavel }).select().single()
  if (error) throw error
  return data
}

export async function atualizarEquipe(id, { nome, responsavel }) {
  const { data, error } = await supabase.from('equipes').update({ nome, responsavel, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function desativarEquipe(id) {
  const { error } = await supabase.from('equipes').update({ ativa: false }).eq('id', id)
  if (error) throw error
}
