import { supabase } from './supabase'

export async function getCurrentUserIdentity() {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return { user: null, id: null, email: '', nome: '' }

  let profile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('nome, email')
      .eq('id', user.id)
      .maybeSingle()
    profile = data || null
  } catch {}

  const email = profile?.email || user.email || ''
  const metadataName = user.user_metadata?.nome || user.user_metadata?.name || ''
  const nome = profile?.nome || metadataName || email

  return {
    user,
    id: user.id,
    email,
    nome
  }
}
