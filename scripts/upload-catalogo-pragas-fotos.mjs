import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const repoRoot = process.cwd()
const manifestPath = path.resolve(repoRoot, '.tmp/fotos_appterranexa_catalogado/MANIFESTO_FOTOS.json')
const imageBaseDir = path.resolve(repoRoot, '.tmp/fotos_appterranexa_catalogado')
const bucket = 'catalogo-pragas'
const prefix = 'v1'
const dryRun = process.argv.includes('--dry-run')

function parseEnv(content) {
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

async function loadEnvFile(file) {
  try {
    const content = await fs.readFile(path.resolve(repoRoot, file), 'utf8')
    return parseEnv(content)
  } catch {
    return {}
  }
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function storagePath(row) {
  const ext = path.extname(row.arquivo_catalogado).toLowerCase() || '.jpg'
  return `${prefix}/${row.codigo}${ext}`
}

const localEnv = await loadEnvFile('.env.local')
const uploadEnv = await loadEnvFile('.env.upload.local')
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || uploadEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || uploadEnv.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL nao encontrado.')
}
if (!serviceRoleKey && !dryRun) {
  throw new Error('Crie .env.upload.local com SUPABASE_SERVICE_ROLE_KEY=... antes de executar sem --dry-run.')
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const supabase = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null

const results = []
for (const row of manifest) {
  const sourcePath = path.resolve(imageBaseDir, row.arquivo_catalogado)
  const targetPath = storagePath(row)
  const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${targetPath}`

  if (!dryRun) {
    const file = await fs.readFile(sourcePath)
    const { error: uploadError } = await supabase.storage.from(bucket).upload(targetPath, file, {
      contentType: contentTypeFor(sourcePath),
      cacheControl: '31536000',
      upsert: true
    })
    if (uploadError) throw uploadError

    const { error: updateError } = await supabase
      .from('catalogo_pragas')
      .update({ foto_url: publicUrl })
      .eq('codigo', row.codigo)
    if (updateError) throw updateError
  }

  results.push({ codigo: row.codigo, arquivo: row.arquivo_catalogado, storage_path: targetPath, foto_url: publicUrl })
}

await fs.writeFile(
  path.resolve(repoRoot, '.tmp/fotos_appterranexa_catalogado/UPLOAD_RESULTADO.json'),
  JSON.stringify(results, null, 2)
)

console.log(JSON.stringify({ dryRun, total: results.length, bucket, prefix }, null, 2))
