import { LEAFLET_SCRIPT_URL, LEAFLET_STYLESHEET_URL } from './constants'

let leafletLoadPromise = null

export function loadLeafletAssets() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Leaflet indisponivel fora do navegador'))
  }
  if (window.L) return Promise.resolve(window.L)

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = LEAFLET_STYLESHEET_URL
    document.head.appendChild(link)
  }

  if (!leafletLoadPromise) {
    leafletLoadPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById('leaflet-js')
      if (existing) {
        existing.addEventListener('load', () => resolve(window.L), { once: true })
        existing.addEventListener('error', () => reject(new Error('Nao foi possivel carregar o Leaflet')), {
          once: true
        })
        return
      }
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = LEAFLET_SCRIPT_URL
      script.async = true
      script.onload = () => resolve(window.L)
      script.onerror = () => reject(new Error('Nao foi possivel carregar o Leaflet'))
      document.body.appendChild(script)
    })
  }

  return leafletLoadPromise
}
