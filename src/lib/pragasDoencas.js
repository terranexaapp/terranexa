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

export const FOTOS_PRAGA_TIPO = {
  praga: 'https://images.unsplash.com/photo-1593069567131-53a0614dde1d?w=600&q=70',
  doenca: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&q=70',
  daninha: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&q=70',
  deficiencia: 'https://images.unsplash.com/photo-1416664806563-bb6be3be8a0c?w=600&q=70',
  outro: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=70'
}

export function getTipoPragaInfo(tipo) {
  return TIPOS_PRAGA_DOENCA.find(t => t.id === tipo) || TIPOS_PRAGA_DOENCA[TIPOS_PRAGA_DOENCA.length - 1]
}

export function getFotoPragaDoenca(item, fallbackUrl = null) {
  const foto = item?.foto_url?.trim?.() || item?.foto_url || ''
  return foto || fallbackUrl || FOTOS_PRAGA_TIPO[item?.tipo] || FOTOS_PRAGA_TIPO.outro
}

export async function listarPragasDoencas(fazendaId, { incluirInativas = false, cultura, tipo } = {}) {
  let q = supabase
    .from('pragas_doencas')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('tipo', { ascending: true })
    .order('nome_comum', { ascending: true })
  if (!incluirInativas) q = q.eq('ativo', true)
  if (tipo && tipo !== 'todos') q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw error
  const items = data || []
  if (cultura && cultura !== 'todas') return items.filter(item => itemPertenceCultura(item, cultura))
  return items
}

export function itemPertenceCultura(item, cultura) {
  const culturaKey = normalizeCulturaAlvo(cultura)
  if (!culturaKey || culturaKey === 'todas') return true
  const culturas = String(item?.cultura_alvo || '')
    .split(',')
    .map(normalizeCulturaAlvo)
    .filter(Boolean)
  if (!culturas.length) return true
  return culturas.includes(culturaKey) || culturas.includes('multi') || culturas.includes('todas')
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
  insumo_sugerido_id,
  foto_url
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
    insumo_sugerido_id: insumo_sugerido_id || null,
    foto_url: foto_url?.trim() || null
  }
}

function normalizeCodigo(codigo) {
  return String(codigo || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 24)
}

function normalizeCulturaAlvo(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
