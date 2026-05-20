import { supabase } from './supabase'
import { enviarEmailConviteFazenda } from './conviteEmail'

export const PAPEIS_CONVIDADOS_FAZENDA = ['gerente', 'agronomo', 'tecnico', 'coordenador_equipe', 'operador']

export function conviteSenhaPath(token) {
  return `/aceitar-convite?token=${encodeURIComponent(token)}&setup=senha`
}

export function fazendaPath(fazendaId) {
  return fazendaId ? `/fazenda/${encodeURIComponent(fazendaId)}` : '/'
}

function newInviteToken() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined
}

export async function convidarMembro({ fazenda_id, email, nome = '', papel }) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const payload = {
    fazenda_id,
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    papel,
    convidado_por: user.id,
    status: 'pendente',
    user_id: null,
    aceito_em: null
  }
  const token = newInviteToken()
  if (token) payload.token = token

  const { data, error } = await supabase
    .from('fazenda_membros')
    .upsert(payload, { onConflict: 'fazenda_id,email' })
    .select()
    .single()
  if (error) throw error
  try {
    const emailStatus = await enviarEmailConviteFazenda({
      fazendaId: fazenda_id,
      email: payload.email,
      nome: payload.nome,
      papel,
      conviteToken: data.token
    })
    return { ...data, emailStatus }
  } catch (err) {
    return { ...data, emailError: err.message || 'Convite criado, mas o e-mail nao foi enviado.' }
  }
}

export async function listarMembros(fazendaId) {
  const { data, error } = await supabase
    .from('fazenda_membros')
    .select('id, nome, email, papel, status, token, criado_em, aceito_em, user_id, profiles:user_id(nome)')
    .eq('fazenda_id', fazendaId)
    .neq('status', 'revogado')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data || []
}

export async function revogarConvite(id) {
  const { error } = await supabase.from('fazenda_membros').update({ status: 'revogado' }).eq('id', id)
  if (error) throw error
}

export async function atualizarPapelMembro(id, papel) {
  const { data, error } = await supabase
    .from('fazenda_membros')
    .update({ papel })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function buscarConviteInfo(token) {
  const { data, error } = await supabase.rpc('buscar_convite_info', { p_token: token })
  if (error) throw error
  return data
}

export async function buscarConvitePendentePorEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return null

  const { data, error } = await supabase
    .from('fazenda_membros')
    .select('token, email, status, criado_em')
    .eq('email', normalizedEmail)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function consultarVinculosAceitos({ userId, email }) {
  let query = supabase
    .from('fazenda_membros')
    .select('fazenda_id, papel, status, aceito_em, criado_em, user_id, email')
    .eq('status', 'aceito')
    .order('aceito_em', { ascending: false })
    .order('criado_em', { ascending: false })

  if (userId) query = query.eq('user_id', userId)
  else if (email) query = query.eq('email', email)
  else return []

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function listarVinculosAceitosDoUsuario(email = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  let vinculos = await consultarVinculosAceitos({ userId: user?.id })
  if (vinculos.length === 0 && normalizedEmail) {
    vinculos = await consultarVinculosAceitos({ email: normalizedEmail })
  }
  return vinculos.filter(vinculo => PAPEIS_CONVIDADOS_FAZENDA.includes(vinculo.papel))
}

export async function buscarPrimeiroVinculoAceitoDoUsuario(email = '') {
  const vinculos = await listarVinculosAceitosDoUsuario(email)
  return vinculos[0] || null
}

export async function buscarDestinoAposLogin(email = '') {
  const pendingInvite = await buscarConvitePendentePorEmail(email)
  if (pendingInvite?.token) return conviteSenhaPath(pendingInvite.token)

  const acceptedInvite = await buscarPrimeiroVinculoAceitoDoUsuario(email)
  if (acceptedInvite?.fazenda_id) return fazendaPath(acceptedInvite.fazenda_id)

  return '/'
}

export async function aceitarConvite(token) {
  const { data, error } = await supabase.rpc('aceitar_convite', { p_token: token })
  if (error) throw error
  return data
}

export function gerarLinkConvite(token) {
  const base = window.location.origin
  return `${base}${conviteSenhaPath(token)}`
}
