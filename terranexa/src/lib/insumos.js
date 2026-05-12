import { supabase } from './supabase'

export async function listarInsumos(fazendaId) {
  const { data, error } = await supabase
    .from('insumos')
    .select(`id, nome, classe, unidade, custo_unitario, carencia_dias, fornecedor, ativo, estoque:estoque(quantidade_atual, quantidade_inicial, quantidade_minima, status)`)
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('classe')
    .order('nome')
  if (error) throw error
  return (data || []).map(i => ({ ...i, estoque: i.estoque?.[0] || { quantidade_atual: 0, quantidade_inicial: 0, quantidade_minima: 0, status: 'vazio' } }))
}

export async function criarInsumo({ fazenda_id, nome, classe, unidade, custo_unitario, carencia_dias, fornecedor }) {
  const { data: insumo, error } = await supabase.from('insumos')
    .insert({ fazenda_id, nome, classe, unidade, custo_unitario: Number(custo_unitario) || 0, carencia_dias: Number(carencia_dias) || 0, fornecedor })
    .select().single()
  if (error) throw error
  await supabase.from('estoque').insert({ insumo_id: insumo.id, quantidade_atual: 0, quantidade_inicial: 0, quantidade_minima: 0 })
  return insumo
}

export async function atualizarInsumo(id, updates) {
  const { data, error } = await supabase.from('insumos')
    .update({ nome: updates.nome, classe: updates.classe, unidade: updates.unidade, custo_unitario: Number(updates.custo_unitario) || 0, carencia_dias: Number(updates.carencia_dias) || 0, fornecedor: updates.fornecedor })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function desativarInsumo(id) {
  const { error } = await supabase.from('insumos').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

export async function atualizarEstoque(insumoId, { quantidade_atual, quantidade_inicial, quantidade_minima }) {
  const { data, error } = await supabase.from('estoque')
    .update({ quantidade_atual: Number(quantidade_atual) || 0, quantidade_inicial: Number(quantidade_inicial) || 0, quantidade_minima: Number(quantidade_minima) || 0 })
    .eq('insumo_id', insumoId).select().single()
  if (error) throw error
  return data
}

export async function popularCatalogoBase(fazendaId) {
  const { data, error } = await supabase.rpc('popular_catalogo_base', { p_fazenda_id: fazendaId })
  if (error) throw error
  return data
}

export const CLASSES_INSUMO = [
  { id: 'herbicida',     label: 'Herbicida',      cor: '#A0714F' },
  { id: 'fungicida',     label: 'Fungicida',      cor: '#7A8838' },
  { id: 'inseticida',    label: 'Inseticida',     cor: '#C4881C' },
  { id: 'fertilizante',  label: 'Fertilizante',   cor: '#3D8A22' },
  { id: 'micronutriente',label: 'Micronutriente', cor: '#5A9038' },
  { id: 'biologico',     label: 'Biologico',      cor: '#9AAA50' },
  { id: 'semente',       label: 'Semente',        cor: '#E8A84C' },
  { id: 'adjuvante',     label: 'Adjuvante',      cor: '#4A8AB8' },
  { id: 'outro',         label: 'Outro',          cor: '#8A9070' },
]

export function getClasseInfo(classe) {
  return CLASSES_INSUMO.find(c => c.id === classe) || CLASSES_INSUMO[CLASSES_INSUMO.length - 1]
}

export function statusEstoqueInfo(status) {
  const map = {
    ok:      { label: 'OK',       cor: '#7EC850', bg: '#E8F4DC' },
    baixo:   { label: 'BAIXO',    cor: '#C4881C', bg: '#FBEFD8' },
    critico: { label: 'CRITICO',  cor: '#E85A3A', bg: '#FBE0D8' },
    vazio:   { label: 'ESGOTADO', cor: '#8A9070', bg: '#F0EEE8' },
  }
  return map[status] || map.vazio
}
