import { createClient } from '@supabase/supabase-js'

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

function getBaseUrl(req) {
  const configured = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (configured) return configured.startsWith('http') ? configured : `https://${configured}`
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

function isAlreadyRegistered(error) {
  const msg = `${error?.message || ''} ${error?.code || ''}`.toLowerCase()
  return msg.includes('already') || msg.includes('registered') || msg.includes('exists')
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (req.method !== 'POST') return json(res, 405, { error: 'metodo_nao_permitido' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(res, 500, {
      error: 'configuracao_indisponivel',
      message: 'Configure SUPABASE_SERVICE_ROLE_KEY no ambiente de producao para enviar convites por e-mail.'
    })
  }

  const token = getBearerToken(req)
  if (!token) return json(res, 401, { error: 'nao_autenticado' })

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return json(res, 400, { error: 'json_invalido' })
    }
  }

  const email = String(body?.email || '').trim().toLowerCase()
  const fazendaId = body?.fazendaId || body?.fazenda_id
  if (!email || !email.includes('@')) return json(res, 400, { error: 'email_invalido' })
  if (!fazendaId) return json(res, 400, { error: 'fazenda_obrigatoria' })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser()
  if (userError || !user) return json(res, 401, { error: 'sessao_invalida' })

  const { data: permitido, error: permissaoError } = await userClient.rpc('usuario_tem_permissao_fazenda', {
    p_fazenda_id: fazendaId,
    p_permissao: 'membros'
  })
  if (permissaoError) return json(res, 403, { error: 'permissao_indisponivel', message: permissaoError.message })
  if (!permitido) return json(res, 403, { error: 'acesso_negado' })

  const { data: membro, error: membroError } = await adminClient
    .from('fazenda_membros')
    .select('id, email, token, status, papel')
    .eq('fazenda_id', fazendaId)
    .eq('email', email)
    .neq('status', 'revogado')
    .maybeSingle()

  if (membroError) return json(res, 500, { error: 'convite_consulta_falhou', message: membroError.message })
  if (!membro?.token) return json(res, 404, { error: 'convite_nao_encontrado' })

  const redirectTo = `${getBaseUrl(req)}/aceitar-convite?token=${membro.token}&setup=senha`
  const metadata = {
    origem: 'terranexa_convite',
    convite_token: membro.token,
    fazenda_id: fazendaId,
    papel: membro.papel
  }

  const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: metadata
  })

  if (!inviteResult.error) {
    return json(res, 200, { sent: true, metodo: 'invite', redirectTo })
  }

  if (isAlreadyRegistered(inviteResult.error)) {
    const { error: resetError } = await publicClient.auth.resetPasswordForEmail(email, { redirectTo })
    if (resetError) {
      return json(res, 500, {
        error: 'email_existente_falhou',
        message: resetError.message
      })
    }
    return json(res, 200, { sent: true, metodo: 'password_reset', redirectTo })
  }

  return json(res, 500, {
    error: 'envio_convite_falhou',
    message: inviteResult.error.message
  })
}
