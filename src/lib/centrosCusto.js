import { supabase } from './supabase'

export async function listarCentrosCusto(fazendaId, { incluirInativos = false } = {}) {
  let query = supabase
    .from('centros_custo')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
  if (!incluirInativos) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function criarCentroCusto({ fazenda_id, codigo, nome, descricao, ordem }) {
  const { data, error } = await supabase
    .from('centros_custo')
    .insert({
      fazenda_id,
      codigo: normalizeCodigo(codigo),
      nome: (nome || '').trim(),
      descricao: descricao?.trim() || null,
      ordem: Number(ordem) || 0
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCentroCusto(id, { codigo, nome, descricao, ordem }) {
  const payload = { updated_at: new Date().toISOString() }
  if (codigo !== undefined) payload.codigo = normalizeCodigo(codigo)
  if (nome !== undefined) payload.nome = (nome || '').trim()
  if (descricao !== undefined) payload.descricao = descricao?.trim() || null
  if (ordem !== undefined) payload.ordem = Number(ordem) || 0
  const { data, error } = await supabase.from('centros_custo').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function desativarCentroCusto(id) {
  const { error } = await supabase
    .from('centros_custo')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function reativarCentroCusto(id) {
  const { error } = await supabase
    .from('centros_custo')
    .update({ ativo: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

function normalizeCodigo(codigo) {
  return String(codigo || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 12)
}
