import { supabase } from './supabase'

function conviteRedirectUrl(token) {
  if (!token || typeof window === 'undefined') return null
  return `${window.location.origin}/aceitar-convite?token=${token}&setup=senha`
}

async function enviarMagicLinkConvite({ email, nome, conviteToken, fazendaId, papel }) {
  const emailRedirectTo = conviteRedirectUrl(conviteToken)
  if (!emailRedirectTo) throw new Error('Convite criado, mas nao foi possivel montar o link de acesso.')

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
      data: {
        origem: 'terranexa_convite',
        nome: nome || null,
        convite_token: conviteToken,
        fazenda_id: fazendaId,
        papel
      }
    }
  })
  if (error) throw error
  return { sent: true, metodo: 'magic_link', redirectTo: emailRedirectTo }
}

export async function enviarEmailConviteFazenda({ fazendaId, email, nome, papel, conviteToken }) {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session?.access_token) throw new Error('Sessao expirada. Faca login novamente para enviar o convite.')

  let response
  try {
    response = await fetch('/api/enviar-convite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ fazendaId, email, nome, papel })
    })
  } catch {
    return enviarMagicLinkConvite({ email, nome, conviteToken, fazendaId, papel })
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok && payload.error === 'configuracao_indisponivel') {
    return enviarMagicLinkConvite({ email, nome, conviteToken, fazendaId, papel })
  }
  if (!response.ok) {
    throw new Error(payload.message || 'Convite criado, mas o e-mail nao foi enviado.')
  }
  return payload
}
