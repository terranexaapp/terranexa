/**
 * TerraNexa · Mapa interativo com Leaflet
 *
 * Usa tiles gratuitos (OpenStreetMap + Esri Satellite) e suporta:
 * - desenho de polígonos
 * - exibição de polígonos existentes
 * - toggle entre vista satélite e mapa de ruas
 */

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { theme } from '../styles/theme'

const C = theme.normal

// Fix do ícone padrão do Leaflet (problema conhecido com bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export function MapView({
  center = [-9.3891, -40.5028], // Petrolina, PE
  zoom = 13,
  height = 360,
  allowDrawing = false,
  onPolygonDrawn = null,
  existingFeatures = null, // GeoJSON FeatureCollection
  highlightFeatureId = null,
  onFeatureClick = null,
}) {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const drawnItemsRef = useRef(null)
  const existingLayerRef = useRef(null)
  const tileLayerRef = useRef(null)
  const [mode, setMode] = useState('satellite')

  /* ── Inicialização do mapa ────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: false,
    })
    mapRef.current = map

    // Tile inicial (satélite)
    tileLayerRef.current = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Esri' }
    ).addTo(map)

    // Layer para polígonos desenhados
    drawnItemsRef.current = new L.FeatureGroup().addTo(map)

    // Layer para features existentes (vindo do banco ou de upload)
    existingLayerRef.current = new L.FeatureGroup().addTo(map)

    // Controle de desenho
    if (allowDrawing) {
      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            metric: true,
            shapeOptions: {
              color: C.greenDp,
              fillColor: C.green,
              weight: 3,
              fillOpacity: 0.35,
            },
          },
          rectangle: false,
          circle: false,
          marker: false,
          polyline: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItemsRef.current,
          remove: true,
        },
      })
      map.addControl(drawControl)

      map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer
        drawnItemsRef.current.clearLayers() // só um polígono por vez
        drawnItemsRef.current.addLayer(layer)
        const geojson = layer.toGeoJSON()
        onPolygonDrawn?.(geojson)
      })

      map.on(L.Draw.Event.EDITED, (e) => {
        const layers = e.layers.getLayers()
        if (layers.length > 0) {
          const geojson = layers[0].toGeoJSON()
          onPolygonDrawn?.(geojson)
        }
      })

      map.on(L.Draw.Event.DELETED, () => {
        onPolygonDrawn?.(null)
      })
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Troca de tile (satélite/ruas) ────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return
    mapRef.current.removeLayer(tileLayerRef.current)

    const url = mode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    const attribution = mode === 'satellite' ? 'Esri' : '© OpenStreetMap'

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom: 19,
      attribution,
    }).addTo(mapRef.current)
  }, [mode])

  /* ── Renderiza features existentes ────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !existingLayerRef.current) return

    existingLayerRef.current.clearLayers()

    if (!existingFeatures || !existingFeatures.features?.length) return

    existingFeatures.features.forEach((f, idx) => {
      const isHighlight = highlightFeatureId !== null && idx === highlightFeatureId
      const color = isHighlight ? C.amber : C.greenDp
      const fillColor = isHighlight ? C.amber : C.green

      const layer = L.geoJSON(f, {
        style: {
          color,
          fillColor,
          weight: isHighlight ? 4 : 2.5,
          fillOpacity: 0.35,
        },
      })

      if (onFeatureClick) {
        layer.on('click', () => onFeatureClick(idx, f))
      }

      // Label no centro
      try {
        const bounds = layer.getBounds()
        const center = bounds.getCenter()
        const label = f.properties?.codigo || f.properties?.nome || `T${idx + 1}`
        L.marker(center, {
          icon: L.divIcon({
            className: 'tn-label',
            html: `<div style="
              background: rgba(255,255,255,0.92);
              color: ${C.textDk};
              padding: 3px 8px;
              border-radius: 6px;
              font-family: Georgia, serif;
              font-size: 12px;
              font-weight: 700;
              border: 1.5px solid ${color};
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            ">${label}</div>`,
            iconSize: null,
            iconAnchor: [20, 12],
          }),
          interactive: false,
        }).addTo(existingLayerRef.current)
      } catch (e) {
        // ignora se não conseguir calcular center
      }

      existingLayerRef.current.addLayer(layer)
    })

    // Centraliza no conjunto
    try {
      const bounds = existingLayerRef.current.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
      }
    } catch (e) {
      // ignora
    }
  }, [existingFeatures, highlightFeatureId, onFeatureClick])

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${C.border}` }}>
      <div ref={containerRef} style={{ height, width: '100%' }} />

      {/* Toggle satélite/mapa */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 1000,
        background: C.bg, padding: 3, borderRadius: 8,
        display: 'flex', gap: 2, border: `1px solid ${C.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        {[
          { id: 'satellite', label: 'SATÉLITE' },
          { id: 'street',    label: 'RUAS' },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            padding: '5px 10px', borderRadius: 6, border: 'none',
            background: mode === m.id ? C.greenDp : 'transparent',
            color: mode === m.id ? C.bg : C.textMid,
            fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px',
            cursor: 'pointer',
          }}>{m.label}</button>
        ))}
      </div>
    </div>
  )
}
