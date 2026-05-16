import { supabase } from './supabase'

function safeFileName(name = 'arquivo') {
  return (
    String(name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'arquivo'
  )
}

export async function uploadArquivoFazenda({ fazendaId, file, bucket = 'mapas', folder = 'geral' }) {
  if (!fazendaId) throw new Error('Fazenda nao informada para upload')
  if (!file) throw new Error('Arquivo nao informado para upload')

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Nao autenticado')

  const fileName = safeFileName(file.name)
  const path = `${user.id}/${fazendaId}/${folder}/${Date.now()}-${fileName}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || 'application/octet-stream',
    upsert: false
  })
  if (error) throw error

  return {
    bucket,
    path,
    nome: file.name
  }
}
