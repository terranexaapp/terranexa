import { useEffect, useState } from 'react'

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
