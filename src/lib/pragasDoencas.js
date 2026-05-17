import { supabase } from './supabase'

export const TIPOS_PRAGA_DOENCA = [
  { id: 'praga', label: 'Praga', cor: '#E85A3A' },
  { id: 'doenca', label: 'Doença', cor: '#C4881C' },
  { id: 'daninha', label: 'Planta daninha', cor: '#7A8838' },
  { id: 'deficiencia', label: 'Deficiência nutricional', cor: '#4A8AB8' },
  { id: 'outro', label: 'Outro', cor: '#8A9070' }
]

export const CULTURAS_PRAGA = [
  { id: 'soja', label: 'Soja' },
  { id: 'milho', label: 'Milho' },
  { id: 'algodao', label: 'Algodão' },
  { id: 'feijao', label: 'Feijão' },
  { id: 'sorgo', label: 'Sorgo' },
  { id: 'cana', label: 'Cana' },
  { id: 'cafe', label: 'Café' },
  { id: 'multi', label: 'Multi-cultura' }
]

export function getTipoPragaInfo(tipo) {
  return TIPOS_PRAGA_DOENCA.find(t => t.id === tipo) || TIPOS_PRAGA_DOENCA[TIPOS_PRAGA_DOENCA.length - 1]
}

export async function listarPragasDoencas(fazendaId, { incluirInativas = false, cultura, tipo } = {}) {
  let q = supabase
    .from('pragas_doencas')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('tipo', { ascending: true })
    .order('nome_comum', { ascending: true })
  if (!incluirInativas) q = q.eq('ativo', true)
  if (cultura && cultura !== 'todas') q = q.in('cultura_alvo', [cultura, 'multi'])
  if (tipo && tipo !== 'todos') q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function criarPragaDoenca(payload) {
  const { data, error } = await supabase.from('pragas_doencas').insert(normalize(payload)).select().single()
  if (error) throw error
  return data
}

export async function atualizarPragaDoenca(id, payload) {
  const { data, error } = await supabase
    .from('pragas_doencas')
    .update({ ...normalize(payload), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarPragaDoenca(id) {
  const { error } = await supabase
    .from('pragas_doencas')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function reativarPragaDoenca(id) {
  const { error } = await supabase
    .from('pragas_doencas')
    .update({ ativo: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

function normalize({
  fazenda_id,
  codigo,
  nome_comum,
  nome_cientifico,
  tipo,
  cultura_alvo,
  sintomas,
  nivel_dano_economico,
  manejo_recomendado,
  insumo_sugerido_id
}) {
  return {
    ...(fazenda_id !== undefined && { fazenda_id }),
    codigo: normalizeCodigo(codigo),
    nome_comum: (nome_comum || '').trim(),
    nome_cientifico: nome_cientifico?.trim() || null,
    tipo: tipo || 'praga',
    cultura_alvo: cultura_alvo || null,
    sintomas: sintomas?.trim() || null,
    nivel_dano_economico: nivel_dano_economico?.trim() || null,
    manejo_recomendado: manejo_recomendado?.trim() || null,
    insumo_sugerido_id: insumo_sugerido_id || null
  }
}

function normalizeCodigo(codigo) {
  return String(codigo || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 24)
}
