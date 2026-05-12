/**
 * TerraNexa · Utilitários geográficos
 *
 * Faz parsing de KML, KMZ e Shapefile, e calcula área em hectares
 * a partir de geometrias GeoJSON.
 */

import * as turf from '@turf/turf'
import JSZip from 'jszip'
import { kml as kmlToGeoJson } from '@tmcw/togeojson'
import shp from 'shpjs'

/* ──────────────────────────────────────────────────────────────
 * Cálculo de área em hectares (de uma Feature ou FeatureCollection)
 * ────────────────────────────────────────────────────────────── */
export function calcularAreaHectares(geojson) {
  if (!geojson) return 0
  try {
    // turf.area retorna em metros quadrados; 1 ha = 10.000 m²
    const m2 = turf.area(geojson)
    return Math.round((m2 / 10000) * 100) / 100
  } catch (e) {
    console.error('Erro ao calcular área:', e)
    return 0
  }
}

/* ──────────────────────────────────────────────────────────────
 * Centroide de uma geometria — usado para centralizar o mapa
 * ────────────────────────────────────────────────────────────── */
export function calcularCentroide(geojson) {
  if (!geojson) return null
  try {
    const c = turf.centroid(geojson)
    return {
      lat: c.geometry.coordinates[1],
      lng: c.geometry.coordinates[0],
    }
  } catch (e) {
    console.error('Erro ao calcular centroide:', e)
    return null
  }
}

/* ──────────────────────────────────────────────────────────────
 * Bounds [[south, west], [north, east]] — para fitBounds do Leaflet
 * ────────────────────────────────────────────────────────────── */
export function calcularBounds(geojson) {
  if (!geojson) return null
  try {
    const bbox = turf.bbox(geojson) // [minX, minY, maxX, maxY]
    return [
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]],
    ]
  } catch (e) {
    console.error('Erro ao calcular bounds:', e)
    return null
  }
}

/* ──────────────────────────────────────────────────────────────
 * Parse de KML — recebe um File e retorna FeatureCollection
 * ────────────────────────────────────────────────────────────── */
export async function parseKML(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')

  if (xml.querySelector('parsererror')) {
    throw new Error('Arquivo KML inválido ou corrompido')
  }

  const geojson = kmlToGeoJson(xml)

  if (!geojson || !geojson.features || geojson.features.length === 0) {
    throw new Error('KML não contém geometrias válidas')
  }

  // Filtra apenas polígonos
  geojson.features = geojson.features.filter(f =>
    f.geometry && ['Polygon', 'MultiPolygon'].includes(f.geometry.type)
  )

  if (geojson.features.length === 0) {
    throw new Error('KML não contém polígonos (talhões). Verifique se o arquivo desenha áreas e não apenas pontos ou linhas.')
  }

  return geojson
}

/* ──────────────────────────────────────────────────────────────
 * Parse de KMZ — descompacta e processa o doc.kml interno
 * ────────────────────────────────────────────────────────────── */
export async function parseKMZ(file) {
  const zip = await JSZip.loadAsync(file)

  // Encontra o primeiro .kml dentro do zip
  const kmlFileName = Object.keys(zip.files).find(name =>
    name.toLowerCase().endsWith('.kml')
  )

  if (!kmlFileName) {
    throw new Error('KMZ não contém arquivo KML interno')
  }

  const kmlContent = await zip.files[kmlFileName].async('text')
  const kmlBlob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' })
  const kmlFile = new File([kmlBlob], 'doc.kml')

  return parseKML(kmlFile)
}

/* ──────────────────────────────────────────────────────────────
 * Parse de Shapefile (.zip) — biblioteca shpjs faz todo o trabalho
 * ────────────────────────────────────────────────────────────── */
export async function parseShapefile(file) {
  const buffer = await file.arrayBuffer()
  const result = await shp(buffer)

  // shpjs pode retornar Feature, FeatureCollection ou array de FCs
  const fc = Array.isArray(result) ? result[0] : result

  if (!fc || !fc.features || fc.features.length === 0) {
    throw new Error('Shapefile não contém geometrias válidas')
  }

  fc.features = fc.features.filter(f =>
    f.geometry && ['Polygon', 'MultiPolygon'].includes(f.geometry.type)
  )

  if (fc.features.length === 0) {
    throw new Error('Shapefile não contém polígonos. Verifique se o arquivo é de áreas e não de pontos/linhas.')
  }

  return fc
}

/* ──────────────────────────────────────────────────────────────
 * Detecta o tipo do arquivo e chama o parser certo
 * ────────────────────────────────────────────────────────────── */
export async function parseGeoFile(file) {
  const name = file.name.toLowerCase()

  if (name.endsWith('.kml')) return parseKML(file)
  if (name.endsWith('.kmz')) return parseKMZ(file)
  if (name.endsWith('.zip')) return parseShapefile(file)

  throw new Error(
    'Formato não suportado. Aceito: KML, KMZ ou Shapefile (.zip)'
  )
}

/* ──────────────────────────────────────────────────────────────
 * Sugere um nome para o talhão a partir das propriedades da feature
 * ────────────────────────────────────────────────────────────── */
export function sugerirNomeTalhao(feature, indice) {
  const props = feature.properties || {}
  const candidates = ['name', 'NAME', 'nome', 'NOME', 'talhao', 'TALHAO', 'id', 'ID']
  for (const key of candidates) {
    if (props[key]) return String(props[key])
  }
  return `Talhão ${indice + 1}`
}
