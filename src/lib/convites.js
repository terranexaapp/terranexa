import { supabase } from './supabase'

function newInviteToken() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined
}

export async function convidarMembro({ fazenda_id, email, papel }) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const payload = {
    fazenda_id,
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
  return data
}

export async function listarMembros(fazendaId) {
  const { data, error } = await supabase
    .from('fazenda_membros')
    .select('id, email, papel, status, token, criado_em, aceito_em, user_id, profiles:user_id(nome)')
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

export async function aceitarConvite(token) {
  const { data, error } = await supabase.rpc('aceitar_convite', { p_token: token })
  if (error) throw error
  return data
}

export function gerarLinkConvite(token) {
  const base = window.location.origin
  return `${base}/aceitar-convite?token=${token}`
}
