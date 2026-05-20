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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (req.method !== 'POST') return json(res, 405, { error: 'metodo_nao_permitido' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(res, 500, {
      error: 'configuracao_indisponivel',
      message: 'Configure SUPABASE_SERVICE_ROLE_KEY no ambiente de producao para atualizar nomes de usuarios.'
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

  const vinculoId = body?.vinculoId || body?.vinculo_id
  const nome = String(body?.nome || '').trim()
  if (!vinculoId) return json(res, 400, { error: 'vinculo_obrigatorio' })
  if (!nome) return json(res, 400, { error: 'nome_obrigatorio' })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
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

  const { data: membro, error: membroError } = await adminClient
    .from('fazenda_membros')
    .select('id, fazenda_id, email, user_id')
    .eq('id', vinculoId)
    .maybeSingle()

  if (membroError) return json(res, 500, { error: 'consulta_falhou', message: membroError.message })
  if (!membro) return json(res, 404, { error: 'vinculo_nao_encontrado' })

  const { data: permitido, error: permissaoError } = await userClient.rpc('usuario_tem_permissao_fazenda', {
    p_fazenda_id: membro.fazenda_id,
    p_permissao: 'membros'
  })
  if (permissaoError) return json(res, 403, { error: 'permissao_indisponivel', message: permissaoError.message })
  if (!permitido) return json(res, 403, { error: 'acesso_negado' })

  const { error: updateMembroError } = await adminClient
    .from('fazenda_membros')
    .update({ nome, updated_at: new Date().toISOString() })
    .eq('id', vinculoId)

  if (updateMembroError) {
    return json(res, 500, { error: 'nome_membro_falhou', message: updateMembroError.message })
  }

  if (membro.user_id) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ nome, updated_at: new Date().toISOString() })
      .eq('id', membro.user_id)
    if (profileError) return json(res, 500, { error: 'nome_profile_falhou', message: profileError.message })
  } else if (membro.email) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ nome, updated_at: new Date().toISOString() })
      .eq('email', membro.email)
    if (profileError) return json(res, 500, { error: 'nome_profile_falhou', message: profileError.message })
  }

  return json(res, 200, { ok: true, nome })
}
