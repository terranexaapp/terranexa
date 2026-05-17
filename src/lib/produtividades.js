import { supabase } from './supabase'

export const UNIDADES_PRODUTIVIDADE = [
  { id: 'sacas', label: 'Sacas (60 kg)', fatorKg: 60 },
  { id: 'kg', label: 'Quilogramas (kg)', fatorKg: 1 },
  { id: 'ton', label: 'Toneladas (t)', fatorKg: 1000 },
  { id: 'arrobas', label: 'Arrobas (15 kg)', fatorKg: 15 },
  { id: 'l', label: 'Litros (l)', fatorKg: null },
  { id: 'outro', label: 'Outra', fatorKg: null }
]

export function getUnidadeInfo(unidade) {
  return UNIDADES_PRODUTIVIDADE.find(u => u.id === unidade) || UNIDADES_PRODUTIVIDADE[0]
}

export async function listarProdutividades(fazendaId, { incluirInativas = false } = {}) {
  let query = supabase
    .from('produtividades')
    .select(
      `id, fazenda_id, talhao_id, safra_id, data_colheita, quantidade_colhida,
       unidade, area_colhida_ha, preco_unitario, observacoes, ativa,
       talhao:talhoes(id, codigo, cultura, area_ha),
       safra:safras(id, nome, cultura)`
    )
    .eq('fazenda_id', fazendaId)
    .order('data_colheita', { ascending: false })
  if (!incluirInativas) query = query.eq('ativa', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function criarProdutividade(payload) {
  const { data, error } = await supabase
    .from('produtividades')
    .insert(normalizePayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarProdutividade(id, payload) {
  const { data, error } = await supabase
    .from('produtividades')
    .update({ ...normalizePayload(payload), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarProdutividade(id) {
  const { error } = await supabase
    .from('produtividades')
    .update({ ativa: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export function calcularProdutividadePorHa(registro) {
  const area = Number(registro.area_colhida_ha) || Number(registro.talhao?.area_ha) || 0
  const qtd = Number(registro.quantidade_colhida) || 0
  if (area <= 0) return null
  return qtd / area
}

export function calcularReceita(registro) {
  const qtd = Number(registro.quantidade_colhida) || 0
  const preco = Number(registro.preco_unitario) || 0
  return qtd * preco
}

function normalizePayload({
  fazenda_id,
  talhao_id,
  safra_id,
  data_colheita,
  quantidade_colhida,
  unidade,
  area_colhida_ha,
  preco_unitario,
  observacoes
}) {
  return {
    ...(fazenda_id !== undefined && { fazenda_id }),
    ...(talhao_id !== undefined && { talhao_id }),
    safra_id: safra_id || null,
    data_colheita: data_colheita || null,
    quantidade_colhida: Number(quantidade_colhida) || 0,
    unidade: unidade || 'sacas',
    area_colhida_ha: area_colhida_ha ? Number(area_colhida_ha) : null,
    preco_unitario: preco_unitario ? Number(preco_unitario) : null,
    observacoes: observacoes?.trim() || null
  }
}
