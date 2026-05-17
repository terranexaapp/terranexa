import { supabase } from './supabase'

export const TIPOS_MAQUINA = [
  { id: 'trator', label: 'Trator', cor: '#3D8A22' },
  { id: 'colheitadeira', label: 'Colheitadeira', cor: '#C4881C' },
  { id: 'pulverizador', label: 'Pulverizador', cor: '#4A8AB8' },
  { id: 'plantadeira', label: 'Plantadeira', cor: '#7A8838' },
  { id: 'grade', label: 'Grade / Subsolador', cor: '#A0714F' },
  { id: 'arado', label: 'Arado', cor: '#8A5A3F' },
  { id: 'caminhao', label: 'Caminhão', cor: '#5A7080' },
  { id: 'outro', label: 'Outro', cor: '#8A9070' }
]

export function getTipoMaquinaInfo(tipo) {
  return TIPOS_MAQUINA.find(t => t.id === tipo) || TIPOS_MAQUINA[TIPOS_MAQUINA.length - 1]
}

export async function listarMaquinas(fazendaId, { incluirInativas = false } = {}) {
  let query = supabase.from('maquinas').select('*').eq('fazenda_id', fazendaId).order('nome')
  if (!incluirInativas) query = query.eq('ativa', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function criarMaquina(payload) {
  const { data, error } = await supabase
    .from('maquinas')
    .insert(normalizePayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarMaquina(id, payload) {
  const { data, error } = await supabase
    .from('maquinas')
    .update({ ...normalizePayload(payload), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarMaquina(id) {
  const { error } = await supabase
    .from('maquinas')
    .update({ ativa: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function reativarMaquina(id) {
  const { error } = await supabase
    .from('maquinas')
    .update({ ativa: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

function normalizePayload({
  fazenda_id,
  nome,
  tipo,
  marca,
  modelo,
  ano,
  capacidade,
  custo_hora,
  horimetro_atual,
  observacoes,
  centro_custo_padrao_id
}) {
  return {
    ...(fazenda_id !== undefined && { fazenda_id }),
    nome: (nome || '').trim(),
    tipo: tipo || null,
    marca: marca?.trim() || null,
    modelo: modelo?.trim() || null,
    ano: ano ? Number(ano) : null,
    capacidade: capacidade?.trim() || null,
    custo_hora: Number(custo_hora) || 0,
    horimetro_atual: Number(horimetro_atual) || 0,
    observacoes: observacoes?.trim() || null,
    centro_custo_padrao_id: centro_custo_padrao_id || null
  }
}
