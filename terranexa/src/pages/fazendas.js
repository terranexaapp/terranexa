/**
 * TerraNexa · Operações de Fazendas e Talhões
 */

import { supabase } from './supabase'

/* ── FAZENDAS ─────────────────────────────────────────────── */

export async function listarFazendas() {
  const { data, error } = await supabase
    .from('fazendas')
    .select(`
      id, nome, municipio, estado, area_total_ha,
      latitude, longitude, ativa, created_at,
      talhoes:talhoes(id, codigo, cultura, area_ha, fase, saude, ativo)
    `)
    .eq('ativa', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function buscarFazenda(id) {
  const { data, error } = await supabase
    .from('fazendas')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function criarFazenda({ nome, municipio, estado, endereco, latitude, longitude }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('fazendas')
    .insert({
      proprietario_id: user.id,
      nome,
      municipio,
      estado,
      endereco,
      latitude,
      longitude,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function atualizarFazenda(id, updates) {
  const { data, error } = await supabase
    .from('fazendas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarFazenda(id) {
  const { error } = await supabase
    .from('fazendas')
    .update({ ativa: false })
    .eq('id', id)
  if (error) throw error
}

/* ── TALHÕES ──────────────────────────────────────────────── */

export async function listarTalhoes(fazendaId) {
  const { data, error } = await supabase
    .from('talhoes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('codigo')
  if (error) throw error
  return data || []
}

export async function criarTalhao({ fazenda_id, codigo, nome, cultura, area_ha, fase, geometria }) {
  const { data, error } = await supabase
    .from('talhoes')
    .insert({
      fazenda_id,
      codigo,
      nome,
      cultura,
      area_ha,
      fase: fase || 'preparo',
      geometria,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function criarTalhoesEmLote(fazenda_id, talhoes) {
  const payload = talhoes.map(t => ({
    fazenda_id,
    codigo: t.codigo,
    nome: t.nome,
    cultura: t.cultura,
    area_ha: t.area_ha,
    fase: t.fase || 'preparo',
    geometria: t.geometria,
  }))

  const { data, error } = await supabase
    .from('talhoes')
    .insert(payload)
    .select()

  if (error) throw error
  return data
}

export async function atualizarTalhao(id, updates) {
  const { data, error } = await supabase
    .from('talhoes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarTalhao(id) {
  const { error } = await supabase
    .from('talhoes')
    .update({ ativo: false })
    .eq('id', id)
  if (error) throw error
}

/* ── HELPERS ──────────────────────────────────────────────── */

export async function proximoCodigoTalhao(fazendaId) {
  const { data, error } = await supabase
    .from('talhoes')
    .select('codigo')
    .eq('fazenda_id', fazendaId)

  if (error) throw error

  const codigos = (data || [])
    .map(t => parseInt(t.codigo.replace(/\D/g, '')))
    .filter(n => !isNaN(n))

  const proximo = codigos.length === 0 ? 1 : Math.max(...codigos) + 1
  return `T${proximo}`
}
