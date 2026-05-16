export function calcularAreaHectares(geojson) {
  if (!geojson) return 0
  try {
    const coords = geojson.geometry?.coordinates || geojson.coordinates
    if (!coords) return 0
    const ring = coords[0]
    let area = 0
    const R = 6371000
    for (let i = 0; i < ring.length - 1; i++) {
      const [lon1, lat1] = ring[i]
      const [lon2, lat2] = ring[i + 1]
      area +=
        (((lon2 - lon1) * Math.PI) / 180) * (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180))
    }
    area = Math.abs((area * R * R) / 2)
    return Math.round((area / 10000) * 100) / 100
  } catch (e) {
    console.error('Erro ao calcular área:', e)
    return 0
  }
}

export function calcularBounds(geojson) {
  if (!geojson) return null
  try {
    const coords = geojson.geometry?.coordinates || geojson.coordinates
    if (!coords) return null
    const ring = coords[0]
    const lats = ring.map(c => c[1])
    const lngs = ring.map(c => c[0])
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ]
  } catch (e) {
    return null
  }
}

export async function parseGeoFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.kml')) return parseKML(file)
  if (name.endsWith('.kmz')) return parseKMZ(file)
  if (name.endsWith('.zip')) return parseShapefile(file)
  throw new Error('Formato não suportado. Aceito: KML, KMZ ou Shapefile (.zip)')
}

async function parseKML(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')
  if (xml.querySelector('parsererror')) throw new Error('Arquivo KML inválido')
  const features = []
  xml.querySelectorAll('Placemark').forEach((placemark, idx) => {
    const coordsEl = placemark.querySelector('coordinates')
    if (!coordsEl) return
    const name = placemark.querySelector('name')?.textContent || `Talhão ${idx + 1}`
    const coordText = coordsEl.textContent.trim()
    const coordinates = coordText
      .split(/\s+/)
      .map(c => {
        const parts = c.split(',')
        return [parseFloat(parts[0]), parseFloat(parts[1])]
      })
      .filter(c => !isNaN(c[0]) && !isNaN(c[1]))
    if (coordinates.length < 3) return
    if (coordinates[0][0] !== coordinates[coordinates.length - 1][0]) coordinates.push(coordinates[0])
    features.push({ type: 'Feature', properties: { name }, geometry: { type: 'Polygon', coordinates: [coordinates] } })
  })
  if (features.length === 0) throw new Error('KML não contém polígonos válidos')
  return { type: 'FeatureCollection', features }
}

async function parseKMZ(file) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  const kmlFileName = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('.kml'))
  if (!kmlFileName) throw new Error('KMZ não contém arquivo KML interno')
  const kmlContent = await zip.files[kmlFileName].async('text')
  const kmlFile = new File([kmlContent], 'doc.kml')
  return parseKML(kmlFile)
}

async function parseShapefile(file) {
  const { default: shp } = await import('shpjs')
  const buffer = await file.arrayBuffer()
  const result = await shp(buffer)
  const fc = Array.isArray(result) ? result[0] : result
  if (!fc?.features?.length) throw new Error('Shapefile não contém geometrias válidas')
  fc.features = fc.features.filter(f => f.geometry && ['Polygon', 'MultiPolygon'].includes(f.geometry.type))
  if (fc.features.length === 0) throw new Error('Shapefile não contém polígonos')
  return fc
}

export function sugerirNomeTalhao(feature, indice) {
  const props = feature.properties || {}
  for (const key of ['name', 'NAME', 'nome', 'NOME', 'talhao', 'TALHAO']) {
    if (props[key]) return String(props[key])
  }
  return `Talhão ${indice + 1}`
}
