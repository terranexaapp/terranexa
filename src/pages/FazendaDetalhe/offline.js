import { MONITORING_STORAGE_KEY } from './constants'
import {
  criarMonitoramento,
  criarMonitoramentoPonto,
  salvarCaminhamento
} from '../../lib/monitoramentos'
import { uploadFotoMonitoramento, getPublicUrl } from '../../lib/storage'

const DB_NAME = 'terranexa-offline'
const DB_VERSION = 1
const MONITORING_STORE = 'monitoramento_sessions'

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDb() {
  if (!hasIndexedDb()) return Promise.reject(new Error('IndexedDB indisponivel neste navegador'))

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(MONITORING_STORE)) {
        const store = db.createObjectStore(MONITORING_STORE, { keyPath: 'id' })
        store.createIndex('fazendaId', 'fazendaId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Falha ao abrir banco offline'))
  })
}

async function withStore(mode, callback) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MONITORING_STORE, mode)
    const store = tx.objectStore(MONITORING_STORE)
    let result

    tx.oncomplete = () => {
      db.close()
      resolve(result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error || new Error('Falha no armazenamento offline'))
    }

    result = callback(store)
  })
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Operacao offline falhou'))
  })
}

function localId(prefix = 'local') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}:${crypto.randomUUID()}`
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

async function getSession(id) {
  if (!id) return null
  return withStore('readonly', store => requestToPromise(store.get(id)))
}

async function putSession(session) {
  return withStore('readwrite', store => requestToPromise(store.put(session)))
}

async function deleteSession(id) {
  return withStore('readwrite', store => requestToPromise(store.delete(id)))
}

async function getAllSessions() {
  return withStore('readonly', store => requestToPromise(store.getAll()))
}

function normalizeContext(context = {}) {
  return {
    fazendaId: context.fazendaId || null,
    fazendaNome: context.fazendaNome || '',
    talhaoId: context.talhaoId || null,
    talhaoCodigo: context.talhaoCodigo || ''
  }
}

function createSession(sessionId, context, monitoramento = {}) {
  const normalized = normalizeContext(context)
  const createdAt = nowIso()
  return {
    id: sessionId || localId('monitoramento'),
    type: 'monitoramento-session',
    status: 'pending',
    ...normalized,
    monitoramento: {
      talhao_id: normalized.talhaoId,
      observacoes: monitoramento.observacoes || 'Monitoramento por app TerraNexa',
      dano: monitoramento.dano || 'sem_dano_economico',
      severidade: monitoramento.severidade || 'baixa',
      status: monitoramento.status || 'realizado',
      visitado_em: monitoramento.visitado_em || createdAt
    },
    pontos: [],
    caminhamentos: [],
    remoteMonitoramentoId: null,
    createdAt,
    updatedAt: createdAt,
    lastError: null
  }
}

async function fileToDataUrl(file) {
  if (!file) return null
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({
        name: file.name || `foto-${Date.now()}.jpg`,
        type: file.type || 'image/jpeg',
        size: file.size || 0,
        dataUrl: reader.result
      })
    reader.onerror = () => reject(reader.error || new Error('Nao foi possivel ler a foto offline'))
    reader.readAsDataURL(file)
  })
}

function dataUrlToBlob(dataUrl, type = 'application/octet-stream') {
  const [header, base64] = String(dataUrl || '').split(',')
  const contentType = /data:([^;]+)/.exec(header || '')?.[1] || type
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: contentType })
}

function pendingSessionsOnly(session) {
  if (!session || session.type !== 'monitoramento-session') return false
  if (session.status === 'synced') return false
  const hasPoints = (session.pontos || []).some(point => !point.remoteId)
  const hasTracks = (session.caminhamentos || []).some(track => !track.remoteId)
  return hasPoints || hasTracks || !session.remoteMonitoramentoId
}

function sessionMatchesFazenda(session, fazendaId) {
  return !fazendaId || session.fazendaId === fazendaId
}

export async function requestOfflineStorage() {
  if (typeof navigator === 'undefined') return { ok: false, message: 'Armazenamento offline indisponivel' }
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) {
      return { ok: true, message: 'Armazenamento offline permitido' }
    }
    if (navigator.storage?.persist) {
      const ok = await navigator.storage.persist()
      return { ok, message: ok ? 'Armazenamento offline permitido' : 'Armazenamento offline temporario' }
    }
  } catch {
    return { ok: false, message: 'Nao foi possivel confirmar armazenamento offline' }
  }
  return { ok: true, message: 'Dados salvos no aparelho para uso offline' }
}

export async function saveMonitoringBatchOffline({
  sessionId,
  context,
  monitoramento,
  points = []
}) {
  if (!hasIndexedDb()) throw new Error('Armazenamento offline indisponivel neste navegador')
  const existing = await getSession(sessionId)
  const session = existing || createSession(sessionId, context, monitoramento)
  const createdAt = nowIso()
  const nextPoints = []

  for (const point of points) {
    const foto = point.fotoFile ? await fileToDataUrl(point.fotoFile) : null
    const payload = { ...point }
    delete payload.fotoFile
    nextPoints.push({
      ...payload,
      localId: payload.localId || localId('ponto'),
      created_at: payload.created_at || createdAt,
      foto,
      remoteId: null,
      syncedAt: null,
      lastError: null
    })
  }

  session.pontos = [...(session.pontos || []), ...nextPoints]
  session.updatedAt = createdAt
  session.status = 'pending'
  session.lastError = null
  await putSession(session)
  return session
}

export async function saveMonitoringTrackOffline({
  sessionId,
  context,
  monitoramento,
  trilha,
  iniciadoEm,
  finalizadoEm
}) {
  if (!Array.isArray(trilha) || trilha.length === 0) return null
  if (!hasIndexedDb()) throw new Error('Armazenamento offline indisponivel neste navegador')
  const existing = await getSession(sessionId)
  const session = existing || createSession(sessionId, context, monitoramento)
  const createdAt = nowIso()
  session.caminhamentos = [
    ...(session.caminhamentos || []),
    {
      localId: localId('caminhamento'),
      trilha,
      iniciado_em: iniciadoEm || createdAt,
      finalizado_em: finalizadoEm || createdAt,
      created_at: createdAt,
      remoteId: null,
      syncedAt: null,
      lastError: null
    }
  ]
  session.updatedAt = createdAt
  session.status = 'pending'
  session.lastError = null
  await putSession(session)
  return session
}

export async function listPendingMonitoringSessions({ fazendaId } = {}) {
  if (!hasIndexedDb()) return []
  const sessions = await getAllSessions()
  return (sessions || [])
    .filter(pendingSessionsOnly)
    .filter(session => sessionMatchesFazenda(session, fazendaId))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

export async function countPendingMonitoringSessions(fazendaId) {
  const sessions = await listPendingMonitoringSessions({ fazendaId })
  return sessions.reduce(
    (acc, session) => {
      acc.sessions += 1
      acc.points += (session.pontos || []).filter(point => !point.remoteId).length
      acc.tracks += (session.caminhamentos || []).filter(track => !track.remoteId).length
      return acc
    },
    { sessions: 0, points: 0, tracks: 0 }
  )
}

async function uploadOfflinePhoto(session, point) {
  if (point.foto_url) return point.foto_url
  if (!point.foto?.dataUrl || !session.fazendaId) return null
  const blob = dataUrlToBlob(point.foto.dataUrl, point.foto.type)
  const file = new File([blob], point.foto.name || `foto-${point.localId}.jpg`, {
    type: point.foto.type || blob.type || 'image/jpeg'
  })
  const uploaded = await uploadFotoMonitoramento({ fazendaId: session.fazendaId, file })
  return getPublicUrl(uploaded)
}

async function syncOneSession(original) {
  let session = { ...original, status: 'syncing', lastError: null, updatedAt: nowIso() }
  await putSession(session)

  try {
    if (!session.remoteMonitoramentoId) {
      const remote = await criarMonitoramento({
        talhao_id: session.monitoramento?.talhao_id || session.talhaoId,
        observacoes: session.monitoramento?.observacoes,
        dano: session.monitoramento?.dano,
        severidade: session.monitoramento?.severidade,
        status: session.monitoramento?.status,
        visitado_em: session.monitoramento?.visitado_em || session.createdAt
      })
      session.remoteMonitoramentoId = remote.id
      session.updatedAt = nowIso()
      await putSession(session)
    }

    const points = [...(session.pontos || [])]
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]
      if (point.remoteId) continue

      let fotoUrl = point.foto_url || null
      if (!fotoUrl && point.foto?.dataUrl) {
        fotoUrl = await uploadOfflinePhoto(session, point)
        point.foto_url = fotoUrl
      }

      const dadosEspecificos = {
        ...(point.dados_especificos || {}),
        ...(fotoUrl ? { foto_url: fotoUrl } : {})
      }

      const saved = await criarMonitoramentoPonto({
        monitoramento_id: session.remoteMonitoramentoId,
        tipo: point.tipo || 'ocorrencia',
        tipo_registro: point.tipo_registro,
        latitude: point.latitude,
        longitude: point.longitude,
        precisao_m: point.precisao_m,
        praga_doenca_id: point.praga_doenca_id,
        estadio_fenologico: point.estadio_fenologico,
        severidade: point.severidade,
        percentual_dano: point.percentual_dano,
        recomendacao: point.recomendacao,
        observacoes: point.observacoes,
        foto_url: fotoUrl,
        dados_especificos: Object.keys(dadosEspecificos).length ? dadosEspecificos : null,
        ponto_grupo_id: point.ponto_grupo_id
      })

      point.remoteId = saved.id
      point.syncedAt = nowIso()
      point.lastError = null
      points[index] = point
      session = { ...session, pontos: points, updatedAt: nowIso() }
      await putSession(session)
    }

    const caminhamentos = [...(session.caminhamentos || [])]
    for (let index = 0; index < caminhamentos.length; index += 1) {
      const track = caminhamentos[index]
      if (track.remoteId) continue
      const saved = await salvarCaminhamento(
        session.remoteMonitoramentoId,
        track.trilha,
        track.iniciado_em || session.createdAt
      )
      track.remoteId = saved?.id || localId('caminhamento-remoto')
      track.syncedAt = nowIso()
      track.lastError = null
      caminhamentos[index] = track
      session = { ...session, caminhamentos, updatedAt: nowIso() }
      await putSession(session)
    }

    await deleteSession(session.id)
    return { ok: true, sessionId: session.id }
  } catch (error) {
    session.status = 'error'
    session.lastError = error.message || 'Falha ao sincronizar monitoramento'
    session.updatedAt = nowIso()
    await putSession(session)
    return { ok: false, sessionId: session.id, error: session.lastError }
  }
}

export async function syncPendingMonitoringSessions({ fazendaId } = {}) {
  if (!hasIndexedDb()) throw new Error('Armazenamento offline indisponivel neste navegador')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Sem internet no aparelho. Tente sincronizar quando a conexao voltar.')
  }

  const sessions = await listPendingMonitoringSessions({ fazendaId })
  const result = {
    total: sessions.length,
    synced: 0,
    failed: 0,
    errors: []
  }

  for (const session of sessions) {
    const item = await syncOneSession(session)
    if (item.ok) result.synced += 1
    else {
      result.failed += 1
      result.errors.push(item.error)
    }
  }

  return result
}

export function saveMonitoringPointOffline(point, context) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(MONITORING_STORAGE_KEY)
    const registros = raw ? JSON.parse(raw) : []
    const next = Array.isArray(registros) ? registros : []
    next.push({ ...context, ...point, savedAt: new Date().toISOString() })
    window.localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(next.slice(-600)))
  } catch {
    // Offline persistence is best-effort; GPS capture should keep working.
  }
}
