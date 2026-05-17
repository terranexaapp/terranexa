import { supabase } from './supabase'

/**
 * Agrega gastos por centro de custo na fazenda.
 *
 * Carrega operações + insumos + custo de aplicação, soma tudo por
 * centro_custo_id e retorna ordenado por total desc.
 *
 * @param {string} fazendaId
 * @param {object} [opts]
 * @param {string} [opts.safraId] — filtrar por safra (opcional)
 * @param {string} [opts.dataInicio] — YYYY-MM-DD (opcional)
 * @param {string} [opts.dataFim] — YYYY-MM-DD (opcional)
 * @returns {Promise<Array<{
 *   centro_custo_id: string|null,
 *   codigo: string,
 *   nome: string,
 *   total: number,
 *   total_aplicacao: number,
 *   total_insumos: number,
 *   qtd_operacoes: number,
 *   ativo: boolean
 * }>>}
 */
export async function agregarCustosPorCC(fazendaId, { safraId, dataInicio, dataFim } = {}) {
  const { data: talhoes, error: talErr } = await supabase
    .from('talhoes')
    .select('id')
    .eq('fazenda_id', fazendaId)
  if (talErr) throw talErr
  const talhaoIds = (talhoes || []).map(t => t.id)
  if (talhaoIds.length === 0) return []

  let opsQuery = supabase
    .from('operacoes')
    .select(
      `id, centro_custo_id, custo_aplicacao, data_operacao, safra_id,
       insumos:operacao_insumos(custo_total)`
    )
    .in('talhao_id', talhaoIds)
  if (safraId) opsQuery = opsQuery.eq('safra_id', safraId)
  if (dataInicio) opsQuery = opsQuery.gte('data_operacao', dataInicio)
  if (dataFim) opsQuery = opsQuery.lte('data_operacao', dataFim)
  const { data: ops, error: opsErr } = await opsQuery
  if (opsErr) throw opsErr

  const ccs = await listarCentrosCusto(fazendaId, { incluirInativos: true })
  const ccMap = new Map(ccs.map(c => [c.id, c]))

  const buckets = new Map()
  for (const op of ops || []) {
    const ccId = op.centro_custo_id || null
    if (!buckets.has(ccId)) {
      const cc = ccId ? ccMap.get(ccId) : null
      buckets.set(ccId, {
        centro_custo_id: ccId,
        codigo: cc?.codigo || 'SEM_CC',
        nome: cc?.nome || 'Sem centro de custo',
        ativo: cc?.ativo ?? false,
        total: 0,
        total_aplicacao: 0,
        total_insumos: 0,
        qtd_operacoes: 0
      })
    }
    const b = buckets.get(ccId)
    const aplic = Number(op.custo_aplicacao) || 0
    const ins = (op.insumos || []).reduce((s, i) => s + (Number(i.custo_total) || 0), 0)
    b.total_aplicacao += aplic
    b.total_insumos += ins
    b.total += aplic + ins
    b.qtd_operacoes += 1
  }

  return Array.from(buckets.values()).sort((a, b) => b.total - a.total)
}

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
