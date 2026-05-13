import { supabase } from './supabase'
import { getCategoriaInfo } from './operacoes'

export async function listarOS(fazendaId, status = null) {
  let query = supabase.from('ordens_servico')
    .select(`id, numero, status, prioridade, prazo, created_at, data_execucao, observacoes_execucao, categoria, operacao_recomendada, talhao:talhoes(id, codigo, cultura, area_ha), criada_por:profiles!ordens_servico_criada_por_id_fkey(nome), operacao_executada_id, os_insumos:os_insumos(id, dose_recomendada, dose_unidade, dose_real, quantidade_real, custo_real, insumo:insumos(id, nome, classe, unidade, custo_unitario, carencia_dias))`)
    .eq('fazenda_id', fazendaId)
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function criarOS({ fazenda_id, talhao_id, categoria, prioridade, prazo, observacoes, receituario_agronomo, receituario_crea, insumos_recomendados }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')
  const { data: numero, error: numErr } = await supabase.rpc('proximo_numero_os', { p_fazenda_id: fazenda_id })
  if (numErr) throw numErr
  const catInfo = getCategoriaInfo(categoria)
  const { data: os, error: osErr } = await supabase.from('ordens_servico')
    .insert({ fazenda_id, talhao_id, numero, operacao_recomendada: catInfo.label, categoria, prioridade: prioridade||'media', status:'pendente', prazo: prazo||null, observacoes: observacoes||null, receituario_agronomo: receituario_agronomo||null, receituario_crea: receituario_crea||null, criada_por_id: user.id })
    .select().single()
  if (osErr) throw osErr
  if (insumos_recomendados && insumos_recomendados.length > 0) {
    const { error: insErr } = await supabase.from('os_insumos')
      .insert(insumos_recomendados.map(i => ({ os_id: os.id, insumo_id: i.insumo_id, dose_recomendada: Number(i.dose_recomendada), dose_unidade: i.dose_unidade, dose_real: Number(i.dose_recomendada), quantidade_real: 0, custo_real: 0 })))
    if (insErr) throw insErr
  }
  return os
}

export async function atualizarInsumosReais(osId, insumosReais) {
  for (const ins of insumosReais) {
    const { error } = await supabase.from('os_insumos')
      .update({ dose_real: Number(ins.dose_real)||0, quantidade_real: Number(ins.quantidade_real)||0, custo_real: Number(ins.custo_real)||0 })
      .eq('id', ins.id)
    if (error) throw error
  }
}

export async function fecharOS({ os_id, data_execucao, custo_aplicacao, observacoes, receituario_agronomo, receituario_crea, insumos_reais }) {
  if (insumos_reais && insumos_reais.length > 0) await atualizarInsumosReais(os_id, insumos_reais)
  const { data, error } = await supabase.rpc('fechar_os', { p_os_id: os_id, p_data_execucao: data_execucao, p_custo_aplicacao: Number(custo_aplicacao)||0, p_observacoes: observacoes||null, p_receituario_agronomo: receituario_agronomo||null, p_receituario_crea: receituario_crea||null })
  if (error) throw error
  return data
}

export async function cancelarOS(osId) {
  const { error } = await supabase.from('ordens_servico').update({ status:'cancelada', updated_at: new Date().toISOString() }).eq('id', osId)
  if (error) throw error
}

export const STATUS_OS = {
  pendente:  { label:'Pendente',  cor:'#E8A84C', bg:'#FBEFD8' },
  concluida: { label:'Concluida', cor:'#5AAE38', bg:'#E8F4DC' },
  cancelada: { label:'Cancelada', cor:'#8A9070', bg:'#F0EEE8' },
}

export const PRIORIDADE_OS = {
  alta:  { label:'Alta',  cor:'#E85A3A' },
  media: { label:'Media', cor:'#E8A84C' },
  baixa: { label:'Baixa', cor:'#5AAE38' },
}
