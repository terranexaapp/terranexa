import { supabase } from './supabase'

export const OPERACOES_MAE = [
  { id:'aplicacao_tratorizada', label:'Aplicação Tratorizada Terrestre', servicos:[
    { id:'dessecacao_pre_plantio',  label:'Dessecação Pré-Plantio',  categoria:'dessecacao_pre_plantio' },
    { id:'dessecacao_pre_colheita', label:'Dessecação Pré-Colheita', categoria:'dessecacao_pre_colheita' },
    { id:'pre_emergente',           label:'Pré-Emergente',           categoria:'pre_emergente' },
    { id:'pos_emergente',           label:'Pós-Emergente',           categoria:'pos_emergente' },
    { id:'fungicida',               label:'Fungicida',               categoria:'fungicida_terrestre' },
    { id:'inseticida',              label:'Inseticida',              categoria:'inseticida_terrestre' },
    { id:'micronutriente',          label:'Micronutriente',          categoria:'micronutriente' },
    { id:'biologico',               label:'Biológico',               categoria:'biologico' },
    { id:'adubacao_cobertura',      label:'Adubação de Cobertura',   categoria:'adubacao_cobertura' },
  ]},
  { id:'aplicacao_aerea', label:'Aplicação Aérea', servicos:[
    { id:'dessecacao_aerea',     label:'Dessecação Aérea',    categoria:'dessecacao_pre_plantio' },
    { id:'fungicida_aereo',      label:'Fungicida Aéreo',     categoria:'fungicida_aereo' },
    { id:'inseticida_aereo',     label:'Inseticida Aéreo',    categoria:'inseticida_aereo' },
    { id:'micronutriente_aereo', label:'Micronutriente Aéreo',categoria:'micronutriente' },
    { id:'biologico_aereo',      label:'Biológico Aéreo',     categoria:'biologico' },
  ]},
  { id:'adubacao_autopropelido', label:'Adubação Autopropelido', servicos:[
    { id:'adubacao_plantio',        label:'Adubação de Plantio',   categoria:'adubacao_plantio' },
    { id:'adubacao_cobertura_auto', label:'Adubação de Cobertura', categoria:'adubacao_cobertura' },
  ]},
  { id:'adubacao_aerea', label:'Adubação Aérea', servicos:[
    { id:'adubacao_plantio_aerea',   label:'Adubação de Plantio Aérea',   categoria:'adubacao_plantio' },
    { id:'adubacao_cobertura_aerea', label:'Adubação de Cobertura Aérea', categoria:'adubacao_cobertura' },
  ]},
  { id:'plantio', label:'Plantio', servicos:[
    { id:'plantio_convencional', label:'Plantio Convencional', categoria:'plantio' },
    { id:'plantio_direto',       label:'Plantio Direto',       categoria:'plantio' },
    { id:'plantio_cobertura',    label:'Plantio de Cobertura', categoria:'plantio' },
  ]},
  { id:'colheita', label:'Colheita', servicos:[
    { id:'colheita_propria',      label:'Colheita Própria',      categoria:'colheita' },
    { id:'colheita_terceirizada', label:'Colheita Terceirizada', categoria:'colheita' },
  ]},
  { id:'outras', label:'Outras Operações', servicos:[
    { id:'aplicacao_manual',    label:'Aplicação Manual',       categoria:'biologico' },
    { id:'tratamento_sementes', label:'Tratamento de Sementes', categoria:'plantio' },
  ]},
]

export function getOperacaoMae(id) { return OPERACOES_MAE.find(o => o.id === id) }

export const STATUS_OS = {
  pendente:  { label:'Pendente',  cor:'#E8A84C', bg:'#FBEFD8' },
  concluida: { label:'Concluída', cor:'#5AAE38', bg:'#E8F4DC' },
  cancelada: { label:'Cancelada', cor:'#8A9070', bg:'#F0EEE8' },
}

export const PRIORIDADE_OS = {
  alta:  { label:'Alta',  cor:'#E85A3A' },
  media: { label:'Média', cor:'#E8A84C' },
  baixa: { label:'Baixa', cor:'#5AAE38' },
}

export const CULTURAS_ALVO = ['Soja','Milho','Algodão','Feijão','Sorgo','Cana','Café','Braquiária','Capim','Vegetação espontânea','Outra']

export const BICOS_COMUNS = ['Leque TT 110-02','Leque TT 110-03','Leque TT 110-04','Cônico JD 14-4','Cônico JD 14-6','Induzido ADGA 110-02','Induzido ADGA 110-03','Turbo TeeJet TJ 60-11002','Turbo TeeJet TJ 60-11004','Outro']

export async function listarOS(fazendaId) {
  const { data, error } = await supabase.from('ordens_servico')
    .select(`id, numero, status, prioridade, prazo, created_at, data_execucao, observacoes_execucao, observacoes, categoria, operacao_recomendada, operacao_mae, servico, cultura_alvo, vazao_lha, bico, area_parcial_ha, area_percentual, fazenda_id, talhao:talhoes(id, codigo, cultura, area_ha), equipe:equipes(id, nome, responsavel), criada_por:profiles!ordens_servico_criada_por_id_fkey(nome), os_talhoes:os_talhoes(talhao:talhoes(id, codigo, cultura, area_ha)), os_insumos:os_insumos(id, dose_recomendada, dose_unidade, dose_real, quantidade_real, custo_real, insumo:insumos(id, nome, classe, unidade, custo_unitario, carencia_dias))`)
    .eq('fazenda_id', fazendaId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function criarOS({ fazenda_id, talhao_ids, operacao_mae, servico, categoria, prioridade, prazo, observacoes, receituario_agronomo, receituario_crea, equipe_id, cultura_alvo, vazao_lha, bico, area_parcial_ha, area_percentual, insumos_recomendados }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: numero, error: numErr } = await supabase.rpc('proximo_numero_os', { p_fazenda_id: fazenda_id })
  if (numErr) throw numErr
  const maeInfo = getOperacaoMae(operacao_mae)
  const servInfo = maeInfo?.servicos.find(s => s.id === servico)
  const { data: os, error: osErr } = await supabase.from('ordens_servico')
    .insert({ fazenda_id, talhao_id: talhao_ids[0], numero, operacao_mae, servico, operacao_recomendada: servInfo?.label || servico, categoria: servInfo?.categoria || categoria, prioridade: prioridade||'media', status:'pendente', prazo: prazo||null, observacoes: observacoes||null, receituario_agronomo: receituario_agronomo||null, receituario_crea: receituario_crea||null, equipe_id: equipe_id||null, cultura_alvo: cultura_alvo||null, vazao_lha: vazao_lha?Number(vazao_lha):null, bico: bico||null, area_parcial_ha: area_parcial_ha?Number(area_parcial_ha):null, area_percentual: area_percentual?Number(area_percentual):null, criada_por_id: user.id })
    .select().single()
  if (osErr) throw osErr
  if (talhao_ids.length > 0) await supabase.from('os_talhoes').insert(talhao_ids.map(tid => ({ os_id: os.id, talhao_id: tid })))
  if (insumos_recomendados?.length > 0) {
    const { error: insErr } = await supabase.from('os_insumos').insert(insumos_recomendados.map(i => ({ os_id: os.id, insumo_id: i.insumo_id, dose_recomendada: Number(i.dose_recomendada), dose_unidade: i.dose_unidade, dose_real: Number(i.dose_recomendada), quantidade_real: 0, custo_real: 0 })))
    if (insErr) throw insErr
  }
  return os
}

export async function fecharOSCompleta({ os_id, talhoes_ids, data_execucao, custo_aplicacao, observacoes, receituario_agronomo, receituario_crea, insumos_reais }) {
  for (const ins of (insumos_reais || [])) {
    await supabase.from('os_insumos').update({ dose_real: Number(ins.dose_real)||0, quantidade_real: Number(ins.quantidade_real)||0, custo_real: Number(ins.custo_real)||0 }).eq('id', ins.id)
  }
  const operacaoIds = []
  for (const talhao_id of talhoes_ids) {
    const { data, error } = await supabase.rpc('fechar_os_v2', { p_os_id: os_id, p_talhao_id: talhao_id, p_data_execucao: data_execucao, p_custo_aplicacao: Number(custo_aplicacao)||0, p_observacoes: observacoes||null, p_receituario_agronomo: receituario_agronomo||null, p_receituario_crea: receituario_crea||null })
    if (error) throw error
    operacaoIds.push(data)
  }
  await supabase.from('ordens_servico').update({ status:'concluida', data_execucao, custo_aplicacao_real: Number(custo_aplicacao)||0, observacoes_execucao: observacoes, receituario_agronomo, receituario_crea, updated_at: new Date().toISOString() }).eq('id', os_id)
  return operacaoIds
}

export async function cancelarOS(osId) {
  const { error } = await supabase.from('ordens_servico').update({ status:'cancelada', updated_at: new Date().toISOString() }).eq('id', osId)
  if (error) throw error
}
