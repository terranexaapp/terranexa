import { useCallback, useEffect, useRef, useState } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

export function useDevicePosition(enabled = true) {
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) return undefined

    let watchId = null
    let cancelled = false
    let permStatus = null
    const handlePermChange = () => {
      if (cancelled) return
      if (permStatus?.state === 'granted' && watchId == null) startWatch()
      else if (permStatus?.state !== 'granted' && watchId != null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }
    }

    function startWatch() {
      if (cancelled || watchId != null) return
      watchId = navigator.geolocation.watchPosition(
        result => {
          const coords = result.coords || {}
          setPosition({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            updatedAt: result.timestamp
          })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 8000 }
      )
    }

    // Em mobile, disparar geolocation sem gesto do usuário (estado 'prompt')
    // costuma cair em auto-denial silencioso e pode invalidar prompts futuros
    // na mesma sessão. Só ligamos o watch automático quando já temos permissão.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(status => {
          if (cancelled) return
          permStatus = status
          if (status.state === 'granted') startWatch()
          status.addEventListener?.('change', handlePermChange)
        })
        .catch(() => {})
    }
    // Sem Permissions API: não ativamos watch automático. O usuário precisa
    // tocar o botão GPS (useGpsRequest) para conceder e iniciar o tracking.

    return () => {
      cancelled = true
      permStatus?.removeEventListener?.('change', handlePermChange)
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
    }
  }, [enabled])

  return position
}

// Hook robusto disparado por interação do usuário (clique no botão GPS).
// Em mobile (iOS Safari em especial) o prompt de permissão só aparece em
// resposta a um gesto, então separamos request() do efeito automático.
export function useGpsRequest() {
  const [state, setState] = useState({
    status: 'idle',
    position: null,
    error: null,
    blockedReason: null
  })
  const watchRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(
    () => () => {
      mountedRef.current = false
      if (watchRef.current != null && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current)
        watchRef.current = null
      }
    },
    []
  )

  const onSuccess = useCallback(result => {
    if (!mountedRef.current) return
    const coords = result.coords || {}
    setState({
      status: 'active',
      position: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        updatedAt: result.timestamp
      },
      error: null,
      blockedReason: null
    })
  }, [])

  const onError = useCallback(err => {
    if (!mountedRef.current) return
    let status = 'error'
    if (err?.code === 1) status = 'denied'
    else if (err?.code === 2) status = 'unavailable'
    else if (err?.code === 3) status = 'timeout'
    setState(prev => ({
      status: prev.position ? 'active' : status,
      position: prev.position,
      error: err?.message || null,
      blockedReason: prev.blockedReason
    }))

    // Quando deu denied, consulta Permissions API pra distinguir bloqueio
    // permanente (state='denied') de prompt fechado/expirado (state='prompt'
    // — comum em iOS Safari quando o usuário não responde a tempo).
    if (err?.code === 1 && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(perm => {
          if (!mountedRef.current) return
          setState(prev =>
            prev.status === 'denied'
              ? { ...prev, blockedReason: perm.state === 'denied' ? 'blocked' : 'prompt-dismissed' }
              : prev
          )
        })
        .catch(() => {})
    }
  }, [])

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        status: 'unsupported',
        position: null,
        error: null,
        blockedReason: null
      })
      return
    }
    if (!window.isSecureContext) {
      setState({
        status: 'unsupported',
        position: null,
        error: 'GPS requer HTTPS',
        blockedReason: null
      })
      return
    }
    setState(prev => ({ status: 'requesting', position: prev.position, error: null, blockedReason: null }))

    // getCurrentPosition entrega o 1o fix rápido. Só ligamos o watch contínuo
    // depois do sucesso — assim, em caso de denied, evitamos disparar 2 erros
    // (e 2 prompts em alguns browsers) e o usuário recebe um aviso claro.
    navigator.geolocation.getCurrentPosition(
      result => {
        onSuccess(result)
        if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
        watchRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 25000
        })
      },
      onError,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
  }, [onSuccess, onError])

  const clear = useCallback(() => {
    if (watchRef.current != null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setState({ status: 'idle', position: null, error: null, blockedReason: null })
  }, [])

  return { ...state, request, clear }
}
