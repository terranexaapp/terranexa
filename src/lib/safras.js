import { supabase } from './supabase'

export async function listarSafras(fazendaId, { incluirInativas = false } = {}) {
  let query = supabase.from('safras').select('*').eq('fazenda_id', fazendaId).order('inicio', { ascending: false })
  if (!incluirInativas) query = query.eq('ativa', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function criarSafra({ fazenda_id, nome, cultura, inicio, fim }) {
  const { data, error } = await supabase
    .from('safras')
    .insert({
      fazenda_id,
      nome: (nome || '').trim(),
      cultura: cultura || null,
      inicio: inicio || null,
      fim: fim || null
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarSafra(id, { nome, cultura, inicio, fim }) {
  const { data, error } = await supabase
    .from('safras')
    .update({
      nome: (nome || '').trim(),
      cultura: cultura || null,
      inicio: inicio || null,
      fim: fim || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarSafra(id) {
  const { error } = await supabase
    .from('safras')
    .update({ ativa: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function reativarSafra(id) {
  const { error } = await supabase
    .from('safras')
    .update({ ativa: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
