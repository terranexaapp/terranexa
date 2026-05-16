import { supabase } from './supabase'

export const CATEGORIAS = [
  { id: 'plantio', label: 'Plantio', cor: '#5AAE38' },
  { id: 'colheita', label: 'Colheita', cor: '#E8A84C' },
  { id: 'adubacao_plantio', label: 'Adubacao de Plantio', cor: '#3D8A22' },
  { id: 'adubacao_cobertura', label: 'Adubacao de Cobertura', cor: '#3D8A22' },
  { id: 'dessecacao_pre_plantio', label: 'Dessecacao Pre-Plantio', cor: '#8A6038' },
  { id: 'dessecacao_pre_colheita', label: 'Dessecacao Pre-Colheita', cor: '#8A6038' },
  { id: 'dessecacao_pos_colheita', label: 'Dessecacao Pos-Colheita', cor: '#8A6038' },
  { id: 'pre_emergente', label: 'Pre-Emergente', cor: '#A0714F' },
  { id: 'pos_emergente', label: 'Pos-Emergente', cor: '#A0714F' },
  { id: 'fungicida_terrestre', label: 'Fungicida Terrestre', cor: '#7A8838' },
  { id: 'fungicida_aereo', label: 'Fungicida Aereo', cor: '#7A8838' },
  { id: 'inseticida_terrestre', label: 'Inseticida Terrestre', cor: '#C4881C' },
  { id: 'inseticida_aereo', label: 'Inseticida Aereo', cor: '#C4881C' },
  { id: 'micronutriente', label: 'Micronutriente', cor: '#5A9038' },
  { id: 'biologico', label: 'Biologico', cor: '#9AAA50' }
]

export function getCategoriaInfo(id) {
  return CATEGORIAS.find(c => c.id === id) || { id, label: id, cor: '#8A9070' }
}

export async function listarOperacoes(talhaoId) {
  const { data, error } = await supabase
    .from('operacoes')
    .select(
      `id, categoria, tipo, data_operacao, custo_aplicacao, observacoes, receituario_agronomo, receituario_crea, created_at, insumos:operacao_insumos(id, dose, dose_unidade, quantidade_total, custo_total, insumo:insumos(id, nome, classe, unidade, custo_unitario, carencia_dias))`
    )
    .eq('talhao_id', talhaoId)
    .order('data_operacao', { ascending: false })
  if (error) throw error
  return data || []
}

export async function criarOperacao({
  talhao_id,
  safra_id,
  categoria,
  data_operacao,
  custo_aplicacao,
  observacoes,
  receituario_agronomo,
  receituario_crea,
  receituario_emissao,
  insumos_usados
}) {
  const catInfo = getCategoriaInfo(categoria)
  const { data: op, error: opErr } = await supabase
    .from('operacoes')
    .insert({
      talhao_id,
      safra_id: safra_id || null,
      categoria,
      tipo: catInfo.label,
      data_operacao,
      custo_aplicacao: Number(custo_aplicacao) || 0,
      observacoes: observacoes || null,
      receituario_agronomo: receituario_agronomo || null,
      receituario_crea: receituario_crea || null,
      receituario_emissao: receituario_emissao || null
    })
    .select()
    .single()
  if (opErr) throw opErr
  if (insumos_usados && insumos_usados.length > 0) {
    const { error: insErr } = await supabase
      .from('operacao_insumos')
      .insert(
        insumos_usados.map(i => ({
          operacao_id: op.id,
          insumo_id: i.insumo_id,
          dose: Number(i.dose),
          dose_unidade: i.dose_unidade,
          quantidade_total: Number(i.quantidade_total),
          custo_total: Number(i.custo_total)
        }))
      )
    if (insErr) throw insErr
  }
  return op
}

export async function resumoCustosPorCategoria(talhaoId) {
  const { data, error } = await supabase.from('v_custo_por_categoria').select('*').eq('talhao_id', talhaoId)
  if (error) throw error
  return data || []
}

export async function listarSafras(fazendaId) {
  const { data, error } = await supabase
    .from('safras')
    .select('id, nome, ativa')
    .eq('fazenda_id', fazendaId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export function calcularCustoInsumo(custoUnitario, dose, areaHa) {
  return Number(custoUnitario) * Number(dose) * Number(areaHa)
}
