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
    const watchId = navigator.geolocation.watchPosition(
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
    return () => navigator.geolocation.clearWatch(watchId)
  }, [enabled])

  return position
}

// Hook robusto disparado por interação do usuário (clique no botão GPS).
// Em mobile (iOS Safari em especial) o prompt de permissão só aparece em
// resposta a um gesto, então separamos request() do efeito automático.
export function useGpsRequest() {
  const [state, setState] = useState({ status: 'idle', position: null, error: null })
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
      error: null
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
      error: err?.message || 'Nao foi possivel obter a localizacao'
    }))
  }, [])

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        status: 'unsupported',
        position: null,
        error: 'Geolocalizacao indisponivel neste navegador'
      })
      return
    }
    if (!window.isSecureContext) {
      setState({
        status: 'unsupported',
        position: null,
        error: 'GPS requer HTTPS'
      })
      return
    }
    setState(prev => ({ status: 'requesting', position: prev.position, error: null }))

    // Tira fix imediato (com cache curto pra responder rápido) + dispara watch
    // contínuo. O watch sozinho pode demorar pro 1o ping no iOS.
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000
    })

    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current)
    }
    watchRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 25000
    })
  }, [onSuccess, onError])

  const clear = useCallback(() => {
    if (watchRef.current != null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setState({ status: 'idle', position: null, error: null })
  }, [])

  return { ...state, request, clear }
}
