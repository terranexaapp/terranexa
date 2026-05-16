import { MONITORING_STORAGE_KEY } from './constants'

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
