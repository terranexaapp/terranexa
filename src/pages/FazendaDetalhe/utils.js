import { theme } from '../../styles/theme'
import {
  MAP_DEFAULT_BOUNDS,
  TILE_SIZE,
  TILE_MIN_ZOOM,
  TILE_MAX_ZOOM,
  MONITORAMENTO_LEGEND
} from './constants'

const C = theme.normal

export function formatCultura(cultura = '') {
  if (!cultura) return 'Sem cultura'
  return cultura.charAt(0).toUpperCase() + cultura.slice(1)
}

export function money(value) {
  return `R$ ${Number(value || 0).toFixed(2)}`
}

export function formatShortDate(value) {
  if (!value) return 'Sem data'
  const [year, month, day] = String(value).split('-')
  if (year && month && day) return `${day}/${month}/${year}`
  return String(value)
}

export function formatMonitoramentoDate(value) {
  if (!value) return 'Sem data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatShortDate(value)
  return date.toLocaleDateString('pt-BR')
}

export function daysSinceDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.max(0, Math.floor((todayStart - dateStart) / 86400000))
}

export function getMonitoramentoMeta(registro) {
  if (!registro?.visitado_em) {
    const tone = MONITORAMENTO_LEGEND.find(item => item.key === 'never')
    return {
      ...tone,
      status: 'never',
      days: null,
      title: 'Nunca monitorado',
      detail: 'Sem visita registrada',
      shortLabel: 'Nunca'
    }
  }

  const days = daysSinceDate(registro.visitado_em)
  if (days === null) return getMonitoramentoMeta(null)
  const key = days <= 5 ? 'recent' : days <= 10 ? 'attention' : 'late'
  const tone = MONITORAMENTO_LEGEND.find(item => item.key === key) || MONITORAMENTO_LEGEND[3]
  const dayText = days === 0 ? 'Monitorado hoje' : days === 1 ? '1 dia sem monitoramento' : `${days} dias sem monitoramento`

  return {
    ...tone,
    status: key,
    days,
    title: dayText,
    detail: `Ultima visita: ${formatMonitoramentoDate(registro.visitado_em)}`,
    shortLabel: days === 0 ? 'Hoje' : `${days}d`
  }
}

export function indexMonitoramentosByTalhao(items = []) {
  return (items || []).reduce((acc, item) => {
    if (item?.talhao_id) acc[item.talhao_id] = item
    return acc
  }, {})
}

export function calcularAreaGeo(feature) {
  if (!feature?.geometry?.coordinates?.[0]) return 0
  try {
    const ring = feature.geometry.coordinates[0]
    let area = 0
    const R = 6371000
    for (let i = 0; i < ring.length - 1; i++) {
      const [lon1, lat1] = ring[i]
      const [lon2, lat2] = ring[i + 1]
      area += (lon2 - lon1) * Math.PI / 180 * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180))
    }
    return Math.round(Math.abs(area * R * R / 2 / 10000) * 100) / 100
  } catch {
    return 0
  }
}

export function parseKmlText(text) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')
  if (xml.querySelector('parsererror')) throw new Error('Arquivo KML inválido')
  const features = []
  xml.querySelectorAll('Placemark').forEach((placemark, idx) => {
    const coordsEl = placemark.querySelector('coordinates')
    if (!coordsEl) return
    const name = placemark.querySelector('name')?.textContent || `Talhão ${idx + 1}`
    const coordinates = coordsEl.textContent.trim().split(/\s+/).map(item => {
      const [lng, lat] = item.split(',').map(Number)
      return [lng, lat]
    }).filter(([lng, lat]) => !Number.isNaN(lng) && !Number.isNaN(lat))
    if (coordinates.length < 3) return
    const first = coordinates[0]
    const last = coordinates[coordinates.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) coordinates.push(first)
    features.push({ type: 'Feature', properties: { name }, geometry: { type: 'Polygon', coordinates: [coordinates] } })
  })
  if (!features.length) throw new Error('KML não contém polígonos válidos')
  return { type: 'FeatureCollection', features }
}

export function featureName(feature, index = 0) {
  const props = feature?.properties || {}
  return props.name || props.nome || props.NOME || props.talhao || props.TALHAO || `Talhão ${index + 1}`
}

export function featureCode(feature, index = 0) {
  const name = featureName(feature, index)
  const clean = String(name).replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase()
  return clean || `T${index + 1}`
}

export function getFeatureRing(feature) {
  if (!feature?.geometry) return null
  if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates?.[0] || null
  if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates?.[0]?.[0] || null
  return null
}

export function getMapBounds(features) {
  const coords = features.flatMap(feature => getFeatureRing(feature) || [])
  if (!coords.length) return MAP_DEFAULT_BOUNDS
  const lngs = coords.map(([lng]) => lng)
  const lats = coords.map(([, lat]) => lat)
  const padLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 0.12, 0.01)
  const padLat = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.12, 0.01)
  return {
    minLng: Math.min(...lngs) - padLng,
    maxLng: Math.max(...lngs) + padLng,
    minLat: Math.min(...lats) - padLat,
    maxLat: Math.max(...lats) + padLat
  }
}

export function projectCoord([lng, lat], bounds) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
  const y = (1 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100
  return [x, y]
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function lngLatToWorld([lng, lat], zoom) {
  const scale = TILE_SIZE * (2 ** zoom)
  const safeLat = clamp(Number(lat) || 0, -85.05112878, 85.05112878)
  const safeLng = Number(lng) || 0
  const sin = Math.sin((safeLat * Math.PI) / 180)
  return {
    x: ((safeLng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  }
}

export function worldToLngLat(x, y, zoom) {
  const scale = TILE_SIZE * (2 ** zoom)
  const safeY = clamp(y, 0, scale)
  const lng = (((x / scale) * 360 - 180 + 540) % 360) - 180
  const n = Math.PI - (2 * Math.PI * safeY) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return [lng, clamp(lat, -85.05112878, 85.05112878)]
}

export function getBoundsCenter(bounds) {
  return [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2]
}

export function getFitZoom(bounds, size, fullBleed) {
  if (!size.width || !size.height) return fullBleed ? 15 : 14
  const usableWidth = size.width * (fullBleed ? 0.76 : 0.68)
  const usableHeight = size.height * (fullBleed ? 0.74 : 0.66)
  for (let zoom = TILE_MAX_ZOOM; zoom >= TILE_MIN_ZOOM; zoom--) {
    const nw = lngLatToWorld([bounds.minLng, bounds.maxLat], zoom)
    const se = lngLatToWorld([bounds.maxLng, bounds.minLat], zoom)
    if (Math.abs(se.x - nw.x) <= usableWidth && Math.abs(se.y - nw.y) <= usableHeight) return zoom
  }
  return TILE_MIN_ZOOM
}

export function getSatelliteInitialView(features, size, fullBleed) {
  const bounds = getMapBounds(features)
  const [lng, lat] = getBoundsCenter(bounds)
  return { lng, lat, zoom: getFitZoom(bounds, size, fullBleed) }
}

export function getRingLabelCoord(ring) {
  if (!ring?.length) return null
  const lngs = ring.map(([lng]) => lng)
  const lats = ring.map(([, lat]) => lat)
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2
  ]
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]))
}

export function ringToLatLngs(ring) {
  return (ring || [])
    .map(([lng, lat]) => [Number(lat), Number(lng)])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
}

export function fitLeafletToFeatures(L, map, normalized, fullBleed) {
  const points = normalized.flatMap(({ feature }) => ringToLatLngs(getFeatureRing(feature)))
  if (!points.length) {
    const [lng, lat] = getBoundsCenter(MAP_DEFAULT_BOUNDS)
    map.setView([lat, lng], fullBleed ? 12 : 11)
    return
  }
  const bounds = L.latLngBounds(points)
  map.fitBounds(bounds, {
    padding: fullBleed ? [26, 26] : [18, 18],
    maxZoom: fullBleed ? 16 : 15,
    animate: false
  })
}

export function getLeafletPolygonStyle(feature, selected, selectedMode) {
  const monitoramento = feature.properties?.monitoramento || getMonitoramentoMeta(null)
  const fillColor = selectedMode === 'chuvas'
    ? '#3791d2'
    : selectedMode === 'monitoramento'
      ? monitoramento.color
      : selected
        ? C.amber
        : C.greenDp
  const baseFillOpacity = selectedMode === 'monitoramento' ? 0.54 : 0.28

  return {
    color: selected ? '#ffffff' : selectedMode === 'monitoramento' ? monitoramento.stroke : 'rgba(255,255,255,0.70)',
    weight: selected ? 2.2 : 1.1,
    opacity: selected ? 0.98 : 0.82,
    fillColor,
    fillOpacity: selected ? Math.max(baseFillOpacity, 0.46) : baseFillOpacity
  }
}

export function leafletLabelHtml(label, selected, fullBleed) {
  const fontSize = selected ? (fullBleed ? 12 : 11) : (fullBleed ? 10 : 9)
  return `<span style="
    display:inline-block;
    color:#fff;
    font-size:${fontSize}px;
    font-weight:900;
    line-height:1;
    text-shadow:0 1px 2px rgba(0,0,0,.85),0 -1px 2px rgba(0,0,0,.65);
    pointer-events:none;
    white-space:nowrap;
  ">${escapeHtml(label)}</span>`
}

export function leafletPluviometroHtml(marker, selectedMode, intensity) {
  const rain = selectedMode === 'chuvas' ? `<small style="display:block;font-size:9px;font-weight:900;margin-top:3px;">${intensity.toFixed(0)} mm</small>` : ''
  return `<span style="
    display:grid;
    place-items:center;
    min-width:74px;
    color:#fff;
    font-size:9px;
    font-weight:900;
    text-shadow:0 1px 3px rgba(0,0,0,.82);
  ">
    <i style="width:24px;height:24px;border-radius:999px;background:rgba(255,255,255,.94);border:2px solid ${selectedMode === 'chuvas' ? C.blue : C.greenDp};display:grid;place-items:center;color:${C.greenDp};font-style:normal;box-shadow:0 7px 18px rgba(0,0,0,.28);">
      <span style="width:8px;height:13px;border:2px solid currentColor;border-top:none;border-radius:0 0 7px 7px;display:block;"></span>
    </i>
    <b style="display:block;margin-top:4px;">${escapeHtml(marker.nome)}</b>
    ${rain}
  </span>`
}

export function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpointBetween(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function pointInPolygon(point, polygon) {
  if (!polygon?.length) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects = ((yi > point.y) !== (yj > point.y)) && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

export function normalizeFeature(raw, codigo = 'T1') {
  if (!raw) return null
  let feature = raw
  if (typeof raw === 'string') {
    try { feature = JSON.parse(raw) } catch { return null }
  }
  if (feature.type === 'FeatureCollection') feature = feature.features?.[0]
  if (feature.type !== 'Feature' && feature.type) feature = { type: 'Feature', properties: {}, geometry: feature }
  if (!feature?.geometry) return null
  return { ...feature, properties: { ...(feature.properties || {}), codigo: feature.properties?.codigo || codigo } }
}

export function pointInFeatureCoord([lng, lat], feature) {
  const ring = getFeatureRing(feature) || []
  return pointInPolygon({ x: lng, y: lat }, ring.map(([ringLng, ringLat]) => ({ x: ringLng, y: ringLat })))
}

export function findTalhaoForCoord(talhoes, lng, lat) {
  return talhoes.find(talhao => {
    const feature = normalizeFeature(talhao.geometria, talhao.codigo)
    return feature ? pointInFeatureCoord([lng, lat], feature) : false
  }) || null
}

export function pointToCoord(point) {
  const lng = MAP_DEFAULT_BOUNDS.minLng + (point.x / 100) * (MAP_DEFAULT_BOUNDS.maxLng - MAP_DEFAULT_BOUNDS.minLng)
  const lat = MAP_DEFAULT_BOUNDS.maxLat - (point.y / 100) * (MAP_DEFAULT_BOUNDS.maxLat - MAP_DEFAULT_BOUNDS.minLat)
  return [lng, lat]
}

export function pointsToFeature(points, codigo = 'Novo talhão') {
  if (points.length < 3) return null
  const coordinates = points.map(pointToCoord)
  coordinates.push(coordinates[0])
  return { type: 'Feature', properties: { codigo, name: codigo }, geometry: { type: 'Polygon', coordinates: [coordinates] } }
}
