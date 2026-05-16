import { useEffect, useRef, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  MAPBOX_TOKEN,
  MAPBOX_SATELLITE_TILE_URL,
  MAPBOX_ATTRIBUTION,
  ESRI_ATTRIBUTION,
  SATELLITE_TILE_URL,
  TILE_MIN_ZOOM,
  TILE_MAX_ZOOM
} from './constants'
import { useMediaQuery } from './hooks'
import { loadLeafletAssets } from './leafletLoader'
import {
  normalizeFeature,
  getFeatureRing,
  ringToLatLngs,
  getLeafletPolygonStyle,
  leafletLabelHtml,
  leafletPluviometroHtml,
  fitLeafletToFeatures,
  getMapBounds,
  projectCoord,
  getRingLabelCoord,
  getMonitoramentoMeta
} from './utils'
import {
  simpleMapStyle,
  simpleMapFullStyle,
  leafletMapCanvasStyle,
  satelliteShadeStyle,
  satelliteControlsStyle,
  satelliteControlsMobileStyle,
  satelliteControlButtonStyle,
  satelliteGpsButtonStyle,
  satelliteBadgeStyle,
  mapEmptyHintStyle,
  mapDrawHintStyle
} from './styles'

const C = theme.normal

export function SimpleFarmMap({ features = [], drawPoints = [], onMapClick, onFeatureClick, height = 340, drawing = false, selectedCode = null, selectedMode = 'timeline', fullBleed = false, pluviometros = [], placingPluviometro = false, onMapPoint, onPluviometroClick, devicePosition = null }) {
  const normalized = features.map((feature, index) => ({ feature: normalizeFeature(feature, feature?.properties?.codigo || `T${index + 1}`), index })).filter(item => item.feature)
  if (drawing || onMapClick) {
    return (
      <VectorFarmMap
        normalized={normalized}
        drawPoints={drawPoints}
        onMapClick={onMapClick}
        onFeatureClick={onFeatureClick}
        height={height}
        drawing={drawing}
        selectedCode={selectedCode}
        selectedMode={selectedMode}
        fullBleed={fullBleed}
      />
    )
  }
  return (
    <LeafletFarmMap
      normalized={normalized}
      onFeatureClick={onFeatureClick}
      height={height}
      selectedCode={selectedCode}
      selectedMode={selectedMode}
      fullBleed={fullBleed}
      pluviometros={pluviometros}
      placingPluviometro={placingPluviometro}
      onMapPoint={onMapPoint}
      onPluviometroClick={onPluviometroClick}
      devicePosition={devicePosition}
    />
  )
}

function LeafletFarmMap({ normalized = [], onFeatureClick, height = 340, selectedCode = null, selectedMode = 'timeline', fullBleed = false, pluviometros = [], placingPluviometro = false, onMapPoint, onPluviometroClick, devicePosition = null }) {
  const mapNodeRef = useRef(null)
  const mapRef = useRef(null)
  const featureLayerRef = useRef(null)
  const markerLayerRef = useRef(null)
  const rainLayerRef = useRef(null)
  const deviceLayerRef = useRef(null)
  const tileLayerRef = useRef(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const [leafletError, setLeafletError] = useState('')
  const [manualDevicePosition, setManualDevicePosition] = useState(null)
  const [locatingDevice, setLocatingDevice] = useState(false)
  const controlsOnRight = useMediaQuery('(max-width: 899px)')
  const featureSignature = normalized.map(({ feature, index }) => {
    const ring = getFeatureRing(feature) || []
    return `${feature.properties?.codigo || index}:${ring.map(coord => coord.join(',')).join(';')}`
  }).join('|')
  const activePluviometros = pluviometros
    .map((item, index) => ({
      ...item,
      index,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      nome: item.nome || `Pluviometro ${index + 1}`
    }))
    .filter(item => item.ativo !== false && Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
  const liveDevicePosition = devicePosition || manualDevicePosition
  const deviceMarker = Number.isFinite(Number(liveDevicePosition?.latitude)) && Number.isFinite(Number(liveDevicePosition?.longitude))
    ? { latitude: Number(liveDevicePosition.latitude), longitude: Number(liveDevicePosition.longitude), accuracy: Number(liveDevicePosition.accuracy || 0) }
    : null

  useEffect(() => {
    let disposed = false
    loadLeafletAssets().then(L => {
      if (disposed || !mapNodeRef.current || mapRef.current) return
      const map = L.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        tap: true,
        inertia: true
      })
      featureLayerRef.current = L.layerGroup().addTo(map)
      markerLayerRef.current = L.layerGroup().addTo(map)
      rainLayerRef.current = L.layerGroup().addTo(map)
      deviceLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setLeafletReady(true)
      window.setTimeout(() => {
        map.invalidateSize()
        fitLeafletToFeatures(L, map, normalized, fullBleed)
      }, 0)
    }).catch(error => {
      if (!disposed) setLeafletError(error.message || 'Nao foi possivel carregar o mapa')
    })

    return () => {
      disposed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      featureLayerRef.current = null
      markerLayerRef.current = null
      rainLayerRef.current = null
      deviceLayerRef.current = null
      tileLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current) return undefined
    const L = window.L
    const map = mapRef.current
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
    const hasMapbox = Boolean(MAPBOX_TOKEN)
    tileLayerRef.current = L.tileLayer(
      hasMapbox ? MAPBOX_SATELLITE_TILE_URL : `${SATELLITE_TILE_URL}/{z}/{y}/{x}`,
      {
        minZoom: TILE_MIN_ZOOM,
        maxZoom: hasMapbox ? 22 : TILE_MAX_ZOOM,
        tileSize: 256,
        attribution: hasMapbox ? MAPBOX_ATTRIBUTION : ESRI_ATTRIBUTION,
        crossOrigin: true
      }
    ).addTo(map)
    return undefined
  }, [leafletReady])

  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current) return
    const map = mapRef.current
    window.setTimeout(() => {
      map.invalidateSize()
      fitLeafletToFeatures(window.L, map, normalized, fullBleed)
    }, 0)
  }, [leafletReady, featureSignature, fullBleed, height])

  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current || !featureLayerRef.current) return
    const L = window.L
    const layer = featureLayerRef.current
    layer.clearLayers()

    normalized.forEach(({ feature, index }) => {
      const ring = getFeatureRing(feature) || []
      const latLngs = ringToLatLngs(ring)
      if (latLngs.length < 3) return
      const selected = selectedCode && feature.properties?.codigo === selectedCode
      const polygon = L.polygon(latLngs, {
        ...getLeafletPolygonStyle(feature, selected, selectedMode),
        interactive: Boolean(onFeatureClick)
      })
      polygon.on('click', event => {
        L.DomEvent.stopPropagation(event)
        onFeatureClick?.(index, feature)
      })
      polygon.addTo(layer)

      const labelCoord = getRingLabelCoord(ring)
      if (labelCoord) {
        const label = L.marker([labelCoord[1], labelCoord[0]], {
          interactive: false,
          icon: L.divIcon({
            className: 'terranexa-talhao-label',
            html: leafletLabelHtml(feature.properties?.codigo, selected, fullBleed),
            iconSize: [72, 18],
            iconAnchor: [36, 9]
          })
        })
        label.addTo(layer)
      }
    })
  }, [leafletReady, featureSignature, selectedCode, selectedMode, onFeatureClick, fullBleed])

  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current || !markerLayerRef.current || !rainLayerRef.current) return
    const L = window.L
    markerLayerRef.current.clearLayers()
    rainLayerRef.current.clearLayers()

    if (selectedMode === 'chuvas') {
      activePluviometros.forEach((marker, index) => {
        const intensity = rainIntensityForMarker(marker, index)
        const color = intensity > 105 ? C.red : intensity > 76 ? C.amber : C.blue
        L.circle([marker.latitude, marker.longitude], {
          radius: 1800 + intensity * 18,
          stroke: false,
          fillColor: color,
          fillOpacity: 0.34,
          interactive: false
        }).addTo(rainLayerRef.current)
      })
    }

    activePluviometros.forEach((marker, index) => {
      const intensity = rainIntensityForMarker(marker, index)
      const item = L.marker([marker.latitude, marker.longitude], {
        interactive: Boolean(onPluviometroClick),
        icon: L.divIcon({
          className: 'terranexa-pluviometro-marker',
          html: leafletPluviometroHtml(marker, selectedMode, intensity),
          iconSize: [74, selectedMode === 'chuvas' ? 62 : 48],
          iconAnchor: [37, 24]
        })
      })
      item.on('click', event => {
        L.DomEvent.stopPropagation(event)
        onPluviometroClick?.(marker)
      })
      item.addTo(markerLayerRef.current)
    })
  }, [leafletReady, selectedMode, pluviometros, onPluviometroClick])

  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current || !deviceLayerRef.current) return
    const L = window.L
    deviceLayerRef.current.clearLayers()
    if (!deviceMarker) return
    const position = [deviceMarker.latitude, deviceMarker.longitude]
    if (deviceMarker.accuracy > 0) {
      L.circle(position, {
        radius: deviceMarker.accuracy,
        color: 'rgba(255,255,255,0.72)',
        weight: 1,
        fillColor: '#2f91ff',
        fillOpacity: 0.18,
        interactive: false
      }).addTo(deviceLayerRef.current)
    }
    L.circleMarker(position, {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#2f91ff',
      fillOpacity: 1,
      interactive: false
    }).addTo(deviceLayerRef.current)
  }, [leafletReady, deviceMarker?.latitude, deviceMarker?.longitude, deviceMarker?.accuracy])

  useEffect(() => {
    if (!leafletReady || !mapRef.current) return undefined
    const map = mapRef.current
    const handleMapClick = event => {
      if (placingPluviometro && onMapPoint) onMapPoint({ lng: event.latlng.lng, lat: event.latlng.lat })
    }
    map.on('click', handleMapClick)
    return () => map.off('click', handleMapClick)
  }, [leafletReady, placingPluviometro, onMapPoint])

  function rainIntensityForMarker(marker, index) {
    const seed = String(marker.id || marker.nome || index).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return 42 + (seed % 86)
  }

  function changeZoom(e, delta) {
    e.stopPropagation()
    if (!mapRef.current) return
    if (delta > 0) mapRef.current.zoomIn(1)
    else mapRef.current.zoomOut(1)
  }

  function centerDeviceMarker(marker) {
    if (!mapRef.current) return
    mapRef.current.setView([marker.latitude, marker.longitude], Math.max(mapRef.current.getZoom(), 16), { animate: true })
  }

  function centerOnDevice(e) {
    e.stopPropagation()
    if (deviceMarker) {
      centerDeviceMarker(deviceMarker)
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation || locatingDevice) return
    setLocatingDevice(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = position.coords || {}
        const marker = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        }
        setManualDevicePosition(marker)
        centerDeviceMarker(marker)
        setLocatingDevice(false)
      },
      () => setLocatingDevice(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    )
  }

  return (
    <div style={{ ...(fullBleed ? { ...simpleMapFullStyle, minHeight: height } : simpleMapStyle), height, cursor: placingPluviometro ? 'crosshair' : 'grab' }}>
      <div ref={mapNodeRef} style={leafletMapCanvasStyle} />
      <div style={satelliteShadeStyle} />
      <div style={controlsOnRight ? satelliteControlsMobileStyle : satelliteControlsStyle} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
        <button type="button" aria-label="Aproximar mapa" onClick={e => changeZoom(e, 1)} style={satelliteControlButtonStyle}>+</button>
        <button type="button" aria-label="Afastar mapa" onClick={e => changeZoom(e, -1)} style={satelliteControlButtonStyle}>-</button>
        <button type="button" aria-label="Centralizar no GPS" title="Centralizar no GPS" onClick={centerOnDevice} style={satelliteGpsButtonStyle}>
          {locatingDevice ? '...' : 'GPS'}
        </button>
      </div>
      <div style={satelliteBadgeStyle}>{MAPBOX_TOKEN ? 'Mapbox Satelite' : 'Satelite'}</div>
      {leafletError && <div style={mapEmptyHintStyle}>{leafletError}</div>}
      {!leafletError && normalized.length === 0 && <div style={mapEmptyHintStyle}>Nenhum talhão com geometria cadastrada</div>}
    </div>
  )
}

function VectorFarmMap({ normalized = [], drawPoints = [], onMapClick, onFeatureClick, height = 340, drawing = false, selectedCode = null, selectedMode = 'timeline', fullBleed = false }) {
  const bounds = getMapBounds(normalized.map(item => item.feature))
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const canPan = fullBleed && !drawing

  function handleClick(e) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!onMapClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    onMapClick({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
  }

  function handlePointerDown(e) {
    if (!canPan || e.button !== 0) return
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!canPan || !dragRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dxPx = e.clientX - dragRef.current.x
    const dyPx = e.clientY - dragRef.current.y
    if (Math.abs(dxPx) + Math.abs(dyPx) > 2) suppressClickRef.current = true
    setViewTransform(current => ({
      ...current,
      x: current.x + (dxPx / rect.width) * 100,
      y: current.y + (dyPx / rect.height) * 100
    }))
    dragRef.current = { x: e.clientX, y: e.clientY }
  }

  function handlePointerUp(e) {
    if (!dragRef.current) return
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  function handleWheel(e) {
    if (!canPan) return
    e.preventDefault()
    setViewTransform(current => ({
      ...current,
      scale: Math.min(3.2, Math.max(0.75, current.scale * (e.deltaY > 0 ? 0.92 : 1.08)))
    }))
  }

  return (
    <div
      style={{ ...(fullBleed ? { ...simpleMapFullStyle, minHeight: height } : simpleMapStyle), height, cursor: canPan ? 'grab' : 'crosshair' }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="farmGlowA" cx="35%" cy="35%" r="42%">
            <stop offset="0%" stopColor="rgba(78,132,72,0.95)" />
            <stop offset="100%" stopColor="rgba(18,58,36,0.18)" />
          </radialGradient>
          <radialGradient id="farmGlowB" cx="72%" cy="66%" r="44%">
            <stop offset="0%" stopColor="rgba(200,136,28,0.78)" />
            <stop offset="100%" stopColor="rgba(18,58,36,0.12)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="#18281a" />
        <rect x="0" y="0" width="100" height="100" fill="url(#farmGlowA)" />
        <rect x="0" y="0" width="100" height="100" fill="url(#farmGlowB)" />
        <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.18)" />
        <g transform={`translate(${viewTransform.x} ${viewTransform.y}) scale(${viewTransform.scale})`}>
          {Array.from({ length: 11 }).map((_, i) => <line key={`v-${i}`} x1={i * 10} y1="0" x2={i * 10 + 18} y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />)}
          {Array.from({ length: 8 }).map((_, i) => <line key={`h-${i}`} x1="0" y1={i * 14} x2="100" y2={i * 14 + 8} stroke="rgba(255,255,255,0.07)" strokeWidth="0.2" />)}
          {normalized.map(({ feature, index }) => {
            const ring = getFeatureRing(feature) || []
            const points = ring.map(coord => projectCoord(coord, bounds).join(',')).join(' ')
            const centerCoord = getRingLabelCoord(ring)
            const center = centerCoord ? projectCoord(centerCoord, bounds) : [50, 50]
            const selected = selectedCode && feature.properties?.codigo === selectedCode
            const monitoramento = feature.properties?.monitoramento || getMonitoramentoMeta(null)
            const monitoringFill = monitoramento.fill || 'rgba(138,144,112,0.52)'
            const monitoringStroke = monitoramento.stroke || 'rgba(230,230,215,0.74)'
            const selectedFill = selectedMode === 'chuvas' ? 'rgba(70,158,205,0.52)' : selectedMode === 'monitoramento' ? monitoringFill : 'rgba(232,168,76,0.46)'
            const baseFill = selectedMode === 'monitoramento' ? monitoringFill : 'rgba(61,138,34,0.34)'
            const baseStroke = selectedMode === 'monitoramento' ? monitoringStroke : 'rgba(255,255,255,0.74)'
            return (
              <g key={`${feature.properties?.codigo || index}-${index}`} onClick={e => { e.stopPropagation(); if (suppressClickRef.current) { suppressClickRef.current = false; return }; onFeatureClick?.(index, feature) }} style={{ cursor: onFeatureClick ? 'pointer' : 'default' }}>
                <polygon points={points} fill={selected ? selectedFill : baseFill} stroke={selected ? 'rgba(255,255,255,0.98)' : baseStroke} strokeWidth={selected ? '1.4' : '0.7'} vectorEffect="non-scaling-stroke" />
                <text x={center[0]} y={center[1]} fill="white" fontSize="2.25" fontWeight="800" textAnchor="middle" dominantBaseline="middle" paintOrder="stroke" stroke="rgba(0,0,0,0.58)" strokeWidth="0.55">{feature.properties?.codigo}</text>
              </g>
            )
          })}
          {drawPoints.length > 0 && (
            <>
              <polyline points={drawPoints.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="white" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              {drawPoints.map((point, index) => <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="1.5" fill="white" />)}
            </>
          )}
        </g>
      </svg>
      {drawing && <div style={mapDrawHintStyle}>Clique no mapa para marcar os vértices do talhão</div>}
      {normalized.length === 0 && !drawing && <div style={mapEmptyHintStyle}>Nenhum talhão com geometria cadastrada</div>}
    </div>
  )
}
