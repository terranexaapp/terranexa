import { supabase } from './supabase'

export async function listarEquipes(fazendaId, { incluirInativas = false } = {}) {
  let query = supabase.from('equipes').select('*').eq('fazenda_id', fazendaId).order('nome')
  if (!incluirInativas) query = query.eq('ativa', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function criarEquipe({ fazenda_id, nome, responsavel }) {
  const { data, error } = await supabase
    .from('equipes')
    .insert({ fazenda_id, nome: (nome || '').trim(), responsavel: responsavel || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarEquipe(id, { nome, responsavel }) {
  const { data, error } = await supabase
    .from('equipes')
    .update({
      nome: (nome || '').trim(),
      responsavel: responsavel || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarEquipe(id) {
  const { error } = await supabase
    .from('equipes')
    .update({ ativa: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function reativarEquipe(id) {
  const { error } = await supabase
    .from('equipes')
    .update({ ativa: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
