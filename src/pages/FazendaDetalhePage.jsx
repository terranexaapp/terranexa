import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listarOperacoes, getCategoriaInfo, resumoCustosPorCategoria } from '../lib/operacoes'
import { criarTalhao } from '../lib/fazendas'
import { listarPluviometros, criarPluviometro, atualizarPluviometro, desativarPluviometro } from '../lib/pluviometros'
import { uploadArquivoFazenda } from '../lib/storage'
import { NovaOperacaoModal } from '../components/NovaOperacaoModal'
import { Logo } from '../components/Logo'
import { theme } from '../styles/theme'

const C = theme.normal
const FASE_LABELS = {
  preparo: 'Preparo',
  plantio: 'Plantio',
  brotacao: 'Brotacao',
  vegetativo: 'Vegetativo',
  floracao: 'Floracao',
  frutificacao: 'Frutificacao',
  maturacao: 'Maturacao',
  colheita: 'Colheita',
  pos_colheita: 'Pos-colheita',
  pousio: 'Pousio'
}

const NAV_ITEMS = [
  { id: 'mapa', label: 'Mapa' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'chuvas', label: 'Chuvas' },
  { id: 'solo', label: 'Solo' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'gerencial', label: 'Gerencial' },
  { id: 'relatorios', label: 'Relatórios' }
]

const reportTypes = [
  'Relatório agronômico completo',
  'Relatório financeiro por talhão e safra',
  'Relatório de chuva interpolada',
  'Relatório de fertilidade do solo',
  'Relatório de scouting e dano econômico',
  'Relatório de ordens de serviço',
  'Relatório de estoque e consumo de insumos',
  'Relatório executivo da fazenda'
]

const MAP_DEFAULT_BOUNDS = {
  minLng: -40.545,
  maxLng: -40.465,
  minLat: -9.430,
  maxLat: -9.350
}
const TILE_SIZE = 256
const TILE_MIN_ZOOM = 4
const TILE_MAX_ZOOM = 19
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile'

function useMediaQuery(query) {
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

function formatCultura(cultura = '') {
  if (!cultura) return 'Sem cultura'
  return cultura.charAt(0).toUpperCase() + cultura.slice(1)
}

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2)}`
}

function formatShortDate(value) {
  if (!value) return 'Sem data'
  const [year, month, day] = String(value).split('-')
  if (year && month && day) return `${day}/${month}/${year}`
  return String(value)
}

function calcularAreaGeo(feature) {
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

function parseKmlText(text) {
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

function featureName(feature, index = 0) {
  const props = feature?.properties || {}
  return props.name || props.nome || props.NOME || props.talhao || props.TALHAO || `Talhão ${index + 1}`
}

function featureCode(feature, index = 0) {
  const name = featureName(feature, index)
  const clean = String(name).replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase()
  return clean || `T${index + 1}`
}

function getFeatureRing(feature) {
  if (!feature?.geometry) return null
  if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates?.[0] || null
  if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates?.[0]?.[0] || null
  return null
}

function getMapBounds(features) {
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

function projectCoord([lng, lat], bounds) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
  const y = (1 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100
  return [x, y]
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function lngLatToWorld([lng, lat], zoom) {
  const scale = TILE_SIZE * (2 ** zoom)
  const safeLat = clamp(Number(lat) || 0, -85.05112878, 85.05112878)
  const safeLng = Number(lng) || 0
  const sin = Math.sin((safeLat * Math.PI) / 180)
  return {
    x: ((safeLng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  }
}

function worldToLngLat(x, y, zoom) {
  const scale = TILE_SIZE * (2 ** zoom)
  const safeY = clamp(y, 0, scale)
  const lng = (((x / scale) * 360 - 180 + 540) % 360) - 180
  const n = Math.PI - (2 * Math.PI * safeY) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return [lng, clamp(lat, -85.05112878, 85.05112878)]
}

function getBoundsCenter(bounds) {
  return [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2]
}

function getFitZoom(bounds, size, fullBleed) {
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

function getSatelliteInitialView(features, size, fullBleed) {
  const bounds = getMapBounds(features)
  const [lng, lat] = getBoundsCenter(bounds)
  return { lng, lat, zoom: getFitZoom(bounds, size, fullBleed) }
}

function getRingLabelCoord(ring) {
  if (!ring?.length) return null
  const lngs = ring.map(([lng]) => lng)
  const lats = ring.map(([, lat]) => lat)
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2
  ]
}

function pointInFeatureCoord([lng, lat], feature) {
  const ring = getFeatureRing(feature) || []
  return pointInPolygon({ x: lng, y: lat }, ring.map(([ringLng, ringLat]) => ({ x: ringLng, y: ringLat })))
}

function findTalhaoForCoord(talhoes, lng, lat) {
  return talhoes.find(talhao => {
    const feature = normalizeFeature(talhao.geometria, talhao.codigo)
    return feature ? pointInFeatureCoord([lng, lat], feature) : false
  }) || null
}

function pointToCoord(point) {
  const lng = MAP_DEFAULT_BOUNDS.minLng + (point.x / 100) * (MAP_DEFAULT_BOUNDS.maxLng - MAP_DEFAULT_BOUNDS.minLng)
  const lat = MAP_DEFAULT_BOUNDS.maxLat - (point.y / 100) * (MAP_DEFAULT_BOUNDS.maxLat - MAP_DEFAULT_BOUNDS.minLat)
  return [lng, lat]
}

function pointsToFeature(points, codigo = 'Novo talhão') {
  if (points.length < 3) return null
  const coordinates = points.map(pointToCoord)
  coordinates.push(coordinates[0])
  return { type: 'Feature', properties: { codigo, name: codigo }, geometry: { type: 'Polygon', coordinates: [coordinates] } }
}

export function FazendaDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('mapa')
  const [menuOpen, setMenuOpen] = useState(false)
  const [fazenda, setFazenda] = useState(null)
  const [talhoes, setTalhoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [novoTalhaoMode, setNovoTalhaoMode] = useState(null)
  const [form, setForm] = useState({ codigo: 'T1', cultura: 'soja', area_ha: '', fase: 'preparo' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [talhaoSel, setTalhaoSel] = useState(null)
  const [operacoes, setOperacoes] = useState([])
  const [custos, setCustos] = useState([])
  const [pluviometros, setPluviometros] = useState([])
  const [pluviometrosErro, setPluviometrosErro] = useState('')
  const [loadOps, setLoadOps] = useState(false)
  const [showNovaOp, setShowNovaOp] = useState(false)
  const [opSel, setOpSel] = useState(null)

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    setPluviometrosErro('')
    const [{ data: f }, { data: ts }, pluviometrosData] = await Promise.all([
      supabase.from('fazendas').select('*').eq('id', id).single(),
      supabase.from('talhoes').select('*').eq('fazenda_id', id).eq('ativo', true).order('codigo'),
      listarPluviometros(id).catch(error => {
        setPluviometrosErro(error.message || 'Nao foi possivel carregar pluviometros')
        return []
      })
    ])
    setFazenda(f)
    setTalhoes(ts || [])
    setPluviometros(pluviometrosData || [])
    const nums = (ts || []).map(t => parseInt(String(t.codigo).replace(/\D/g, ''), 10)).filter(n => !isNaN(n))
    setForm(p => ({ ...p, codigo: 'T' + (nums.length === 0 ? 1 : Math.max(...nums) + 1) }))
    setLoading(false)
  }

  async function abrirTalhao(talhao) {
    setTalhaoSel(talhao)
    setLoadOps(true)
    const [ops, cs] = await Promise.all([listarOperacoes(talhao.id), resumoCustosPorCategoria(talhao.id)])
    setOperacoes(ops)
    setCustos(cs)
    setLoadOps(false)
  }

  function fecharTalhao() {
    setTalhaoSel(null)
    setOperacoes([])
    setCustos([])
    setLoadOps(false)
  }

  async function alternarTalhao(talhao) {
    if (!talhao) {
      fecharTalhao()
      return
    }
    if (talhaoSel?.id === talhao.id) {
      fecharTalhao()
      return
    }
    await abrirTalhao(talhao)
  }

  async function salvarTalhao(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const { error } = await supabase.from('talhoes').insert({
      fazenda_id: id,
      codigo: form.codigo,
      cultura: form.cultura,
      area_ha: parseFloat(form.area_ha),
      fase: form.fase
    })
    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }
    setShowNovo(false)
    carregar()
    setSalvando(false)
  }

  function abrirCadastroTalhao(mode = null) {
    setNovoTalhaoMode(mode)
    setShowNovo(true)
  }

  function fecharCadastroTalhao() {
    setShowNovo(false)
    setNovoTalhaoMode(null)
  }

  async function talhaoCriado() {
    fecharCadastroTalhao()
    await carregar()
  }

  async function excluirTalhao(tid) {
    if (!confirm('Excluir este talhao?')) return
    await supabase.from('talhoes').update({ ativo: false }).eq('id', tid)
    if (talhaoSel?.id === tid) setTalhaoSel(null)
    carregar()
  }

  async function salvarPluviometro(payload) {
    await criarPluviometro(payload)
    await carregar()
  }

  async function editarPluviometro(idPluviometro, payload) {
    await atualizarPluviometro(idPluviometro, payload)
    await carregar()
  }

  async function excluirPluviometro(idPluviometro) {
    await desativarPluviometro(idPluviometro)
    await carregar()
  }

  const total = useMemo(() => talhoes.reduce((s, t) => s + Number(t.area_ha || 0), 0), [talhoes])
  const totalCusto = useMemo(() => custos.reduce((s, c) => s + Number(c.custo_total || 0), 0), [custos])
  const talhoesSemMonitoramento = Math.max(0, talhoes.length - Math.min(talhoes.length, operacoes.length))
  const isMapView = activeView === 'mapa'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgSoft }}>
        <p style={{ color: C.textDim, fontFamily: 'monospace' }}>CARREGANDO...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: isMapView ? '#102316' : C.bgSoft, display: 'flex', flexDirection: 'column' }}>
      <header style={floatingHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMapView ? 0 : 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMapView ? 0 : 8 }}>
            <button onClick={() => setMenuOpen(open => !open)} style={hamburgerButtonStyle}>☰</button>
            {!isMapView && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={eyebrowStyle}>FAZENDA</p>
              <h1 style={{ margin: '2px 0 0', fontSize: 20, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{fazenda?.nome}</h1>
            </div>
            )}
          </div>
          <nav style={{ display: 'none', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  border: `1px solid ${activeView === item.id ? C.greenDp : C.border}`,
                  background: activeView === item.id ? C.greenDp : C.bgLight,
                  color: activeView === item.id ? C.bg : C.textDk,
                  borderRadius: 10,
                  padding: '9px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {menuOpen && (
        <div style={drawerBackdropStyle} onClick={() => setMenuOpen(false)}>
          <aside style={drawerStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <p style={sidebarEyebrowStyle}>MENU</p>
              <button onClick={() => setMenuOpen(false)} style={drawerCloseButtonStyle}>×</button>
            </div>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setMenuOpen(false) }}
                style={{
                  ...drawerNavButtonStyle,
                  background: activeView === item.id ? C.greenDp : C.bg,
                  color: activeView === item.id ? C.bg : C.textDk,
                  borderColor: activeView === item.id ? C.greenDp : C.border
                }}
              >
                {item.label}
              </button>
            ))}
            <div style={drawerFooterStyle}>
              <div style={drawerFarmInfoStyle}>
                <p style={eyebrowStyle}>FAZENDA</p>
                <strong style={{ color: C.textDk, fontSize: 15, fontFamily: 'Georgia, serif' }}>{fazenda?.nome}</strong>
                <span style={{ color: C.textMid, fontSize: 11 }}>{Number(total || 0).toFixed(2)} ha · {talhoes.length} talhoes</span>
              </div>
              <button onClick={() => { setMenuOpen(false); navigate('/') }} style={drawerReturnButtonStyle}>← Voltar para Fazendas</button>
              <div style={drawerBrandStyle}>
                <Logo size={30} />
                <div>
                  <p style={{ margin: 0, color: C.greenDp, fontWeight: 900, fontSize: 15, fontFamily: 'Georgia, serif', lineHeight: 1 }}>Terra<span style={{ color: C.amber }}>Nexa</span></p>
                  <small style={{ color: C.textDim, fontSize: 8, fontFamily: 'monospace', letterSpacing: '1.4px' }}>GESTAO AGRICOLA</small>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main style={{ flex: 1, width: '100%', maxWidth: isMapView ? 'none' : 1320, margin: '0 auto', padding: isMapView ? 0 : 16, paddingTop: isMapView ? 0 : 98 }}>
        <div style={farmLayoutStyle}>
          <aside style={farmSidebarStyle}>
            <p style={sidebarEyebrowStyle}>MENU</p>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  ...sidebarNavButtonStyle,
                  background: activeView === item.id ? C.greenDp : C.bg,
                  color: activeView === item.id ? C.bg : C.textDk,
                  borderColor: activeView === item.id ? C.greenDp : C.border
                }}
              >
                {item.label}
              </button>
            ))}
          </aside>
          <section style={{ flex: 1, minWidth: 0 }}>
        {activeView === 'mapa' && (
          <FazendaMapaPrincipal
            fazenda={fazenda}
            talhoes={talhoes}
            pluviometros={pluviometros}
            talhaoSel={talhaoSel}
            operacoes={operacoes}
            custos={custos}
            totalCusto={totalCusto}
            loadOps={loadOps}
            alternarTalhao={alternarTalhao}
            navigate={navigate}
            setActiveView={setActiveView}
            setShowNovaOp={setShowNovaOp}
          />
        )}
        {activeView === 'dashboard' && (
          <DashboardView
            total={total}
            talhoes={talhoes}
            talhaoSel={talhaoSel}
            operacoes={operacoes}
            custos={custos}
            totalCusto={totalCusto}
            loadOps={loadOps}
            abrirTalhao={abrirTalhao}
            talhoesSemMonitoramento={talhoesSemMonitoramento}
            navigate={navigate}
            setActiveView={setActiveView}
          />
        )}
        {activeView === 'chuvas' && <InterpolacaoView tipo="chuvas" talhoes={talhoes} total={total} pluviometros={pluviometros} />}
        {activeView === 'solo' && <InterpolacaoView tipo="solo" talhoes={talhoes} total={total} pluviometros={pluviometros} />}
        {activeView === 'scouting' && <ScoutingView talhoes={talhoes} talhaoSel={talhaoSel} abrirTalhao={abrirTalhao} />}
        {activeView === 'gerencial' && (
          <GerencialView
            talhoes={talhoes}
            talhaoSel={talhaoSel}
            operacoes={operacoes}
            custos={custos}
            total={total}
            totalCusto={totalCusto}
            fazendaId={id}
            pluviometros={pluviometros}
            pluviometrosErro={pluviometrosErro}
            loadOps={loadOps}
            opSel={opSel}
            setOpSel={setOpSel}
            abrirTalhao={abrirTalhao}
            excluirTalhao={excluirTalhao}
            setShowNovo={abrirCadastroTalhao}
            setShowNovaOp={setShowNovaOp}
            onCreatePluviometro={salvarPluviometro}
            onUpdatePluviometro={editarPluviometro}
            onDeletePluviometro={excluirPluviometro}
            navigate={navigate}
          />
        )}
        {activeView === 'relatorios' && <RelatoriosView talhoes={talhoes} total={total} />}
        {activeView === 'monitoramento' && (
          <MonitoramentoRegistroView
            fazenda={fazenda}
            talhao={talhaoSel}
            onBack={() => setActiveView('mapa')}
          />
        )}
          </section>
        </div>
      </main>

      {showNovo && (
        <TalhaoGeoModal
          fazendaId={id}
          initialMode={novoTalhaoMode}
          sugerirCodigo={form.codigo}
          talhoes={talhoes}
          onClose={fecharCadastroTalhao}
          onCreated={talhaoCriado}
        />
      )}

      {showNovaOp && talhaoSel && (
        <NovaOperacaoModal talhao={talhaoSel} fazendaId={id} onClose={() => setShowNovaOp(false)} onSaved={async () => { setShowNovaOp(false); await abrirTalhao(talhaoSel) }} />
      )}
    </div>
  )
}

function FazendaMapaPrincipal({ fazenda, talhoes, pluviometros = [], talhaoSel, operacoes, custos, totalCusto, loadOps, alternarTalhao, navigate, setActiveView, setShowNovaOp }) {
  const timelineIsDocked = useMediaQuery('(min-width: 900px)')
  const [timelineMode, setTimelineMode] = useState('resumo')
  const [chuvaInicio, setChuvaInicio] = useState('2026-05-01')
  const [chuvaFim, setChuvaFim] = useState('2026-05-15')
  const features = talhoes.map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) })).filter(item => item.feature)
  const selected = talhaoSel || null
  const chuvaSeed = selected ? String(selected.codigo || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0
  const chuvaAcumulada = selected ? (82 + (chuvaSeed % 88) + Number(selected.area_ha || 0) % 18).toFixed(1) : '0.0'
  const chuvaMediaDia = selected ? (Number(chuvaAcumulada) / 15).toFixed(1) : '0.0'
  const maiorChuva = selected ? (18 + (chuvaSeed % 24)).toFixed(1) : '0.0'
  const menorChuva = selected ? (2 + (chuvaSeed % 9)).toFixed(1) : '0.0'
  const ultimaOperacao = operacoes[0] || null
  const ultimaOperacaoInfo = ultimaOperacao ? getCategoriaInfo(ultimaOperacao.categoria) : null
  const activePluviometros = pluviometros.filter(p => p.ativo !== false)
  const resumoRows = [
    { label: 'Situacao atual', value: loadOps ? 'Carregando operacoes' : operacoes.length ? 'Com historico registrado' : 'Sem operacoes registradas' },
    { label: 'Proxima acao', value: operacoes.length ? 'Revisar monitoramento de campo' : 'Monitoramento de campo' },
    { label: 'Ultima chuva', value: activePluviometros.length ? `${chuvaAcumulada} mm no periodo` : 'Sem registro no periodo' },
    { label: 'Ultima operacao', value: ultimaOperacao ? `${formatShortDate(ultimaOperacao.data_operacao)} · ${ultimaOperacaoInfo.label}` : 'Nenhuma operacao cadastrada' }
  ]
  const timeline = operacoes.length > 0
    ? operacoes.map(op => ({
      data: formatShortDate(op.data_operacao),
      titulo: getCategoriaInfo(op.categoria).label,
      status: 'Executada',
      valor: money((op.insumos || []).reduce((s, i) => s + Number(i.custo_total || 0), 0) + Number(op.custo_aplicacao || 0))
    }))
    : [
      { data: 'Hoje', titulo: 'Sem operacoes registradas', status: 'Pendente', valor: 'Adicionar primeiro registro' }
    ]

  async function handleFeatureClick(index) {
    const talhao = features[index]?.talhao
    if (!talhao) return
    if (talhaoSel?.id !== talhao.id) setTimelineMode('resumo')
    await alternarTalhao(talhao)
  }

  return (
    <section style={timelineIsDocked ? mapMainPageStyle : mapMainPageMobileStyle}>
      <SimpleFarmMap
        features={features.map(item => ({ ...item.feature, properties: { ...item.feature.properties, codigo: item.talhao.codigo } }))}
        height={timelineIsDocked || !selected ? '100vh' : '58vh'}
        fullBleed
        selectedCode={selected?.codigo}
        selectedMode={timelineMode === 'chuvas' ? 'chuvas' : 'timeline'}
        pluviometros={pluviometros}
        onFeatureClick={handleFeatureClick}
      />

      <div style={{ display: 'none', ...mapTopInfoStyle }}>
        <p style={eyebrowStyle}>MAPA DA FAZENDA</p>
        <h2 style={{ margin: '3px 0 0', color: C.bg, fontSize: 24, fontFamily: 'Georgia, serif' }}>{fazenda?.nome}</h2>
        <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.78)', fontSize: 12 }}>{talhoes.length} talhoes · clique no mapa para abrir a linha do tempo</p>
      </div>

      {false && selected && (
        <div style={mapTalhaoChipStyle}>
          <p style={eyebrowStyle}>TALHAO</p>
          <strong>{selected.codigo}</strong>
          <span>{Number(selected.area_ha || 0).toFixed(2)} ha · {formatCultura(selected.cultura)}</span>
        </div>
      )}

      {selected && (
        <div style={timelineIsDocked ? timelineDockStyle : timelineMobileStyle}>
          <div style={timelineHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>TALHAO SELECIONADO</p>
              <h3 style={{ margin: '4px 0 0', color: C.bg, fontSize: 20, fontFamily: 'Georgia, serif' }}>{selected.codigo} · {formatCultura(selected.cultura)}</h3>
            </div>
            <span style={timelineAreaPillStyle}>{Number(selected.area_ha || 0).toFixed(2)} ha</span>
          </div>
          <div style={timelineActionsStyle}>
            <button onClick={() => setActiveView('monitoramento')} style={timelineActionButtonStyle}>Monitorar</button>
            <button onClick={() => navigate('/os')} style={timelineActionButtonStyle}>Criar ordem</button>
          </div>
          <div style={timelineModeTabsStyle}>
            {[
              ['resumo', 'Resumo'],
              ['historico', 'Historico'],
              ['chuvas', 'Chuvas'],
              ['solo', 'Solo']
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTimelineMode(id)}
                style={{
                  ...timelineModeButtonStyle,
                  background: timelineMode === id ? C.bg : 'rgba(255,255,255,0.08)',
                  color: timelineMode === id ? C.textDk : C.bg,
                  borderColor: timelineMode === id ? C.bg : 'rgba(255,255,255,0.28)'
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {timelineMode === 'resumo' && (
            <div style={timelineSummaryCardStyle}>
              <h4 style={timelineCardTitleStyle}>Resumo do talhao</h4>
              <div style={timelineSummaryRowsStyle}>
                {resumoRows.map(item => (
                  <div key={item.label} style={timelineSummaryRowStyle}>
                    <span style={timelineSummaryLabelStyle}>{item.label}</span>
                    <strong style={timelineSummaryValueStyle}>{item.value}</strong>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowNovaOp(true)} style={timelineTextButtonStyle}>{operacoes.length ? 'Registrar nova operacao' : 'Adicionar primeiro registro'}</button>
            </div>
          )}
          {timelineMode === 'historico' && (
            <div style={timelineIsDocked ? timelineTableDesktopStyle : timelineTableStyle}>
              {timeline.map((item, index) => (
                <button key={`${item.data}-${item.titulo}-${index}`} style={timelineCellStyle}>
                  <span>{item.data}</span>
                  <strong>{item.titulo}</strong>
                  <em>{item.status}</em>
                  <small>{item.valor}</small>
                </button>
              ))}
            </div>
          )}
          {timelineMode === 'chuvas' && (
            <div style={timelineRainLayoutStyle}>
              <div style={timelineDateGridStyle}>
                <label style={timelineDateLabelStyle}>
                  Data inicial
                  <input type="date" value={chuvaInicio} onChange={e => setChuvaInicio(e.target.value)} style={timelineDateInputStyle} />
                </label>
                <label style={timelineDateLabelStyle}>
                  Data final
                  <input type="date" value={chuvaFim} onChange={e => setChuvaFim(e.target.value)} style={timelineDateInputStyle} />
                </label>
                <button onClick={() => setActiveView('chuvas')} style={timelinePrimaryButtonStyle}>Abrir mapa interpolado</button>
              </div>
              <div style={timelineRainGridStyle}>
                <div style={timelineRainMetricStyle}><span>Acumulado no talhao</span><strong>{chuvaAcumulada} mm</strong></div>
                <div style={timelineRainMetricStyle}><span>Media diaria</span><strong>{chuvaMediaDia} mm</strong></div>
                <div style={timelineRainMetricStyle}><span>Maior precipitacao</span><strong>{maiorChuva} mm</strong></div>
                <div style={timelineRainMetricStyle}><span>Menor precipitacao</span><strong>{menorChuva} mm</strong></div>
              </div>
            </div>
          )}
          {timelineMode === 'solo' && (
            <div style={timelineSummaryCardStyle}>
              <h4 style={timelineCardTitleStyle}>Solo do talhao</h4>
              <div style={timelineSummaryRowsStyle}>
                <div style={timelineSummaryRowStyle}><span style={timelineSummaryLabelStyle}>Camada atual</span><strong style={timelineSummaryValueStyle}>Mapa de solo disponivel</strong></div>
                <div style={timelineSummaryRowStyle}><span style={timelineSummaryLabelStyle}>Fertilidade</span><strong style={timelineSummaryValueStyle}>Aguardando leitura recente</strong></div>
                <div style={timelineSummaryRowStyle}><span style={timelineSummaryLabelStyle}>Recomendacao</span><strong style={timelineSummaryValueStyle}>Conferir pagina Solo</strong></div>
              </div>
              <button onClick={() => setActiveView('solo')} style={timelineTextButtonStyle}>Abrir pagina Solo</button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function MonitoramentoRegistroView({ fazenda, talhao, onBack }) {
  const [points, setPoints] = useState([])
  const [tracking, setTracking] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('Aguardando GPS')
  const watchRef = useRef(null)

  useEffect(() => {
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  function addPosition(position, tipo) {
    const coords = position.coords || {}
    setPoints(current => [
      ...current,
      {
        tipo,
        lat: coords.latitude,
        lng: coords.longitude,
        precisao: coords.accuracy,
        hora: new Date().toLocaleString('pt-BR')
      }
    ])
    setGpsStatus('Ponto registrado')
  }

  function capturarPonto(tipo = 'Ponto de scouting') {
    if (!navigator.geolocation) {
      setGpsStatus('GPS indisponivel neste navegador')
      return
    }
    setGpsStatus('Buscando sinal GPS...')
    navigator.geolocation.getCurrentPosition(
      position => addPosition(position, tipo),
      error => setGpsStatus(error.message || 'Nao foi possivel capturar o GPS'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
  }

  function iniciarCaminhamento() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS indisponivel neste navegador')
      return
    }
    if (watchRef.current) return
    setTracking(true)
    setGpsStatus('Caminhamento em andamento')
    watchRef.current = navigator.geolocation.watchPosition(
      position => addPosition(position, 'Caminhamento'),
      error => setGpsStatus(error.message || 'Erro no caminhamento GPS'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    )
  }

  function finalizarCaminhamento() {
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setTracking(false)
    setGpsStatus('Caminhamento finalizado')
  }

  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>SCOUTING GEOREFERENCIADO</p>
          <h2 style={viewTitleStyle}>Registrar monitoramento</h2>
          <p style={viewSubtitleStyle}>{fazenda?.nome} {talhao ? `· talhao ${talhao.codigo}` : '· selecione um talhao no mapa para registrar em campo'}</p>
        </div>
        <button onClick={onBack} style={secondaryActionStyle}>Voltar ao mapa</button>
      </div>

      <div style={monitoringGridStyle}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>TALHAO</p>
          <h3 style={{ margin: '5px 0 0', color: C.textDk, fontSize: 24, fontFamily: 'Georgia, serif' }}>{talhao?.codigo || 'Nenhum selecionado'}</h3>
          <p style={{ margin: '6px 0 0', color: C.textMid, fontSize: 13 }}>{talhao ? `${Number(talhao.area_ha || 0).toFixed(2)} ha · ${formatCultura(talhao.cultura)}` : 'Abra o mapa e clique em um talhao antes de iniciar.'}</p>

          <div style={monitoringActionGridStyle}>
            <button onClick={() => capturarPonto('Ponto de scouting')} disabled={!talhao} style={{ ...primaryActionStyle, opacity: talhao ? 1 : 0.5 }}>Registrar ponto</button>
            <button onClick={tracking ? finalizarCaminhamento : iniciarCaminhamento} disabled={!talhao} style={{ ...secondaryActionStyle, opacity: talhao ? 1 : 0.5 }}>{tracking ? 'Finalizar caminhamento' : 'Iniciar caminhamento'}</button>
            <button onClick={() => capturarPonto('Armadilha')} disabled={!talhao} style={{ ...secondaryActionStyle, opacity: talhao ? 1 : 0.5 }}>Marcar armadilha</button>
            <button onClick={() => capturarPonto('Ocorrencia')} disabled={!talhao} style={{ ...secondaryActionStyle, opacity: talhao ? 1 : 0.5 }}>Marcar ocorrencia</button>
          </div>

          <div style={gpsStatusStyle}>
            <strong>{gpsStatus}</strong>
            <span>{points.length} registros coletados nesta visita</span>
          </div>
        </div>

        <div style={panelStyle}>
          <p style={eyebrowStyle}>MAPA DA VISITA</p>
          <div style={gpsCanvasStyle}>
            <div style={gpsPathLineStyle} />
            {points.map((point, index) => (
              <span
                key={`${point.hora}-${index}`}
                title={`${point.tipo}: ${point.lat?.toFixed(6)}, ${point.lng?.toFixed(6)}`}
                style={{
                  ...gpsPointStyle,
                  left: `${14 + ((index * 17) % 72)}%`,
                  top: `${18 + ((index * 23) % 58)}%`,
                  background: point.tipo === 'Caminhamento' ? C.greenDp : C.amberDk
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <p style={eyebrowStyle}>PONTOS E CAMINHAMENTO</p>
        <div style={gpsTableStyle}>
          {points.length === 0 ? (
            <p style={{ margin: 0, color: C.textMid, fontSize: 13 }}>Nenhum ponto registrado ainda.</p>
          ) : points.map((point, index) => (
            <div key={`${point.hora}-${index}`} style={gpsRowStyle}>
              <strong>{point.tipo}</strong>
              <span>{point.hora}</span>
              <span>{point.lat?.toFixed(6)}, {point.lng?.toFixed(6)}</span>
              <span>{Math.round(point.precisao || 0)} m</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DashboardView({ total, talhoes, talhaoSel, operacoes, custos, totalCusto, loadOps, abrirTalhao, talhoesSemMonitoramento, navigate, setActiveView }) {
  const cards = [
    { label: 'Area monitorada', value: `${total.toFixed(2)} ha`, tone: C.greenDp },
    { label: 'Talhoes ativos', value: talhoes.length, tone: C.soilDk },
    { label: 'Alertas de monitoramento', value: talhoesSemMonitoramento, tone: talhoesSemMonitoramento > 0 ? C.redDk : C.greenDp }
  ]
  const talhaoReferencia = talhoes[0]?.codigo || 'TH01'
  const areaMedia = talhoes.length > 0 ? total / talhoes.length : 0
  const smartCards = [
    {
      title: 'Gastos agricolas',
      status: 'financeiro',
      actionLabel: 'Abrir gerencial',
      onAction: () => setActiveView('gerencial'),
      insights: [
        { label: 'Custo por hectare', value: 'Aguardando operacoes fechadas', tone: 'neutral' },
        { label: 'Area media por talhao', value: `${areaMedia.toFixed(1)} ha`, tone: areaMedia > 0 ? 'ok' : 'neutral' },
        { label: 'Planejado x realizado', value: 'Conectar ordens de servico', tone: 'attention' }
      ]
    },
    {
      title: 'Alertas de monitoramento',
      status: talhoesSemMonitoramento > 0 ? 'atencao' : 'estavel',
      actionLabel: 'Ver scouting',
      onAction: () => setActiveView('scouting'),
      insights: [
        { label: 'Talhoes sem visita recente', value: `${talhoesSemMonitoramento}`, tone: talhoesSemMonitoramento > 0 ? 'danger' : 'ok' },
        { label: 'Nivel de dano', value: 'Sem dano economico critico', tone: 'ok' },
        { label: 'Armadilhas', value: 'Tendencia a configurar', tone: 'attention' }
      ]
    },
    {
      title: 'Clima e solo',
      status: 'agronomico',
      actionLabel: 'Abrir chuvas',
      onAction: () => setActiveView('chuvas'),
      insights: [
        { label: 'Chuva do periodo', value: '142,7 mm acumulados', tone: 'ok' },
        { label: 'Maior precipitacao', value: `${talhaoReferencia} · 38,4 mm`, tone: 'attention' },
        { label: 'Solo', value: '16 parametros prontos para leitura', tone: 'ok' }
      ]
    },
    {
      title: 'Gestao da fazenda',
      status: 'operacional',
      actionLabel: 'Abrir ordem',
      onAction: () => navigate('/os'),
      insights: [
        { label: 'Estoque minimo', value: 'Conectar saldo de insumos', tone: 'attention' },
        { label: 'Equipe e permissoes', value: 'Controle por nivel de usuario', tone: 'neutral' },
        { label: 'Cadastros pendentes', value: talhoes.length > 0 ? 'Talhoes cadastrados' : 'Cadastrar primeiro talhao', tone: talhoes.length > 0 ? 'ok' : 'danger' }
      ]
    }
  ]

  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>CENTRO DE DECISAO</p>
          <h2 style={viewTitleStyle}>Central dos talhões</h2>
          <p style={viewSubtitleStyle}>Mapa operacional da fazenda para selecionar talhões, abrir diagnósticos e acionar chuva, solo, scouting e ordens.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/os')} style={primaryActionStyle}>Criar Ordem de Serviço</button>
          <button onClick={() => setActiveView('relatorios')} style={secondaryActionStyle}>Gerar Relatório</button>
        </div>
      </div>

      {false && <TalhoesCommandCenter
        talhoes={talhoes}
        talhaoSel={talhaoSel}
        operacoes={operacoes}
        custos={custos}
        totalCusto={totalCusto}
        loadOps={loadOps}
        abrirTalhao={abrirTalhao}
        navigate={navigate}
        setActiveView={setActiveView}
      />}

      <div style={metricGridStyle}>
        {cards.map(card => <MetricCard key={card.label} {...card} />)}
        <CustoPizzaCard />
      </div>

      <div style={dashboardGridStyle}>
        {smartCards.map(card => <SmartInsightCard key={card.title} {...card} />)}
        <div style={{ display: 'none' }}>
        <InsightPanel
          title="Gastos agricolas"
          items={[
            'Custo por talhão, safra, cultura e natureza agrícola',
            'Comparativo planejado x realizado das ordens de servico',
            'Consumo de insumos por hectare e por operacao'
          ]}
        />
        <InsightPanel
          title="Alertas de monitoramento"
          items={[
            'Talhoes sem scouting recente',
            'Ocorrências em nível de controle ou dano econômico',
            'Armadilhas com tendencia de aumento'
          ]}
        />
        <InsightPanel
          title="Clima e solo"
          items={[
            'Chuva acumulada por período e pluviômetro',
            'Mapas interpolados por data definida',
            'Fertilidade por camada, atributo e talhão'
          ]}
        />
        <InsightPanel
          title="Gestao da fazenda"
          items={[
            'Estoque minimo e insumos a comprar',
            'Equipe, permissoes e auditoria de edicoes',
            'Cadastro de máquinas, fornecedores e centros de custo'
          ]}
        />
      </div>
      </div>
    </section>
  )
}

function TalhoesCommandCenter({ talhoes, talhaoSel, operacoes, custos, totalCusto, loadOps, abrirTalhao, navigate, setActiveView }) {
  const talhoesComGeometria = talhoes.map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) })).filter(item => item.feature)
  const selected = talhaoSel || talhoes[0] || null
  const custoHa = selected?.area_ha ? totalCusto / Number(selected.area_ha || 1) : 0
  const custoCategorias = custos.slice().sort((a, b) => Number(b.custo_total || 0) - Number(a.custo_total || 0)).slice(0, 3)

  return (
    <div style={talhaoHubStyle}>
      <div style={talhaoMapColumnStyle}>
        <div style={talhaoMapHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>MAPA DOS TALHOES</p>
            <h3 style={panelTitleStyle}>Selecione um talhao para decidir a proxima acao</h3>
          </div>
          <span style={mapCounterStyle}>{talhoesComGeometria.length} talhoes no mapa</span>
        </div>
        <SimpleFarmMap
          features={talhoesComGeometria.map(item => ({ ...item.feature, properties: { ...item.feature.properties, codigo: item.talhao.codigo } }))}
          height={520}
          selectedCode={selected?.codigo}
          onFeatureClick={(index) => abrirTalhao(talhoesComGeometria[index].talhao)}
        />
      </div>

      <aside style={talhaoDecisionPanelStyle}>
        {!selected ? (
          <div style={emptyTalhaoPanelStyle}>
            <h3 style={panelTitleStyle}>Nenhum talhao selecionado</h3>
            <p style={{ margin: '8px 0 0', color: C.textMid, fontSize: 13 }}>Clique em um talhao no mapa para abrir o painel de decisao.</p>
          </div>
        ) : (
          <>
            <p style={eyebrowStyle}>TALHAO SELECIONADO</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginTop: 6 }}>
              <div>
                <h3 style={{ margin: 0, color: C.textDk, fontSize: 28, fontFamily: 'Georgia, serif' }}>{selected.codigo}</h3>
                <p style={{ margin: '3px 0 0', color: C.textMid, fontSize: 13 }}>{formatCultura(selected.cultura)} · {(FASE_LABELS[selected.fase] || selected.fase || 'fase nao definida')}</p>
              </div>
              <span style={talhaoStatusBadgeStyle}>Ativo</span>
            </div>

            <div style={talhaoKpiGridStyle}>
              <TalhaoMiniKpi label="Area" value={`${Number(selected.area_ha || 0).toFixed(2)} ha`} />
              <TalhaoMiniKpi label="Custo total" value={loadOps ? 'Carregando' : money(totalCusto)} />
              <TalhaoMiniKpi label="Custo/ha" value={loadOps ? '...' : money(custoHa)} />
              <TalhaoMiniKpi label="Operacoes" value={loadOps ? '...' : operacoes.length} />
            </div>

            <div style={talhaoActionGridStyle}>
              <button onClick={() => setActiveView('scouting')} style={primaryActionStyle}>Monitorar</button>
              <button onClick={() => navigate('/os')} style={secondaryActionStyle}>Criar ordem</button>
              <button onClick={() => setActiveView('solo')} style={secondaryActionStyle}>Ver solo</button>
              <button onClick={() => setActiveView('chuvas')} style={secondaryActionStyle}>Ver chuvas</button>
            </div>

            <div style={talhaoInsightBoxStyle}>
              <p style={eyebrowStyle}>LEITURA RAPIDA</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <TalhaoInsight tone="ok" label="Geometria" value={selected.geometria ? 'Talhao georreferenciado' : 'Sem geometria'} />
                <TalhaoInsight tone={operacoes.length > 0 ? 'ok' : 'attention'} label="Historico" value={operacoes.length > 0 ? `${operacoes.length} operacoes registradas` : 'Sem operacoes registradas'} />
                <TalhaoInsight tone="attention" label="Scouting" value="Conectar ultimo monitoramento" />
                <TalhaoInsight tone="neutral" label="Solo e chuva" value="Pronto para cruzar com camadas interpoladas" />
              </div>
            </div>

            <div style={talhaoInsightBoxStyle}>
              <p style={eyebrowStyle}>CUSTOS POR CATEGORIA</p>
              {custoCategorias.length === 0 ? (
                <p style={{ margin: '10px 0 0', color: C.textMid, fontSize: 12 }}>Sem custos categorizados para este talhao.</p>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                  {custoCategorias.map(categoria => {
                    const info = getCategoriaInfo(categoria.categoria)
                    return (
                      <div key={categoria.categoria} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                        <span style={{ color: C.textMid }}>{info.label}</span>
                        <strong style={{ color: info.cor, fontFamily: 'monospace' }}>{money(categoria.custo_total)}</strong>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function TalhaoMiniKpi({ label, value }) {
  return (
    <div style={talhaoMiniKpiStyle}>
      <p style={eyebrowStyle}>{label.toUpperCase()}</p>
      <strong style={{ display: 'block', marginTop: 5, color: C.textDk, fontSize: 14, fontFamily: 'Georgia, serif' }}>{value}</strong>
    </div>
  )
}

function TalhaoInsight({ tone, label, value }) {
  const color = tone === 'ok' ? C.greenDp : tone === 'attention' ? C.amberDk : tone === 'danger' ? C.redDk : C.textDim
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '9px 1fr', gap: 8, alignItems: 'start' }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: color, marginTop: 4 }} />
      <div>
        <p style={{ margin: 0, color: C.textDk, fontSize: 12, fontWeight: 800 }}>{label}</p>
        <p style={{ margin: '2px 0 0', color: C.textMid, fontSize: 12, lineHeight: 1.35 }}>{value}</p>
      </div>
    </div>
  )
}

function InterpolacaoView({ tipo, talhoes, pluviometros = [] }) {
  const isChuva = tipo === 'chuvas'
  const [dataInicial, setDataInicial] = useState('2026-05-01')
  const [dataFinal, setDataFinal] = useState('2026-05-15')
  const features = talhoes.map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) })).filter(item => item.feature)
  const talhaoReferencia = talhoes[0]?.codigo || 'TH01'
  const talhaoMenor = talhoes[1]?.codigo || talhaoReferencia
  const title = isChuva ? 'Mapa interpolado de chuvas' : 'Resultados de solo'
  const subtitle = isChuva
    ? 'Selecione a data inicial e final para interpolar os pluviometros georreferenciados no periodo.'
    : 'Resultados por nutriente, talhao e camada amostrada, com leitura vertical parametro a parametro.'

  const soilParams = [
    ['pH CaCl2', '5,7', '0-20 cm', talhaoReferencia],
    ['Materia organica', '32,4 g/dm3', '0-20 cm', talhaoReferencia],
    ['Fosforo', '18,6 mg/dm3', '0-20 cm', talhaoReferencia],
    ['Potassio', '0,42 cmolc/dm3', '0-20 cm', talhaoReferencia],
    ['Calcio', '4,1 cmolc/dm3', '0-20 cm', talhaoReferencia],
    ['Magnesio', '1,2 cmolc/dm3', '0-20 cm', talhaoReferencia],
    ['Aluminio', '0,1 cmolc/dm3', '20-40 cm', talhaoReferencia],
    ['H + Al', '3,8 cmolc/dm3', '20-40 cm', talhaoReferencia],
    ['CTC', '9,4 cmolc/dm3', '0-20 cm', talhaoReferencia],
    ['V%', '62%', '0-20 cm', talhaoReferencia],
    ['Enxofre', '8,2 mg/dm3', '20-40 cm', talhaoReferencia],
    ['Boro', '0,42 mg/dm3', '0-20 cm', talhaoReferencia],
    ['Cobre', '1,1 mg/dm3', '0-20 cm', talhaoReferencia],
    ['Manganes', '28 mg/dm3', '0-20 cm', talhaoReferencia],
    ['Zinco', '3,5 mg/dm3', '0-20 cm', talhaoReferencia],
    ['Argila', '42%', '0-20 cm', talhaoReferencia]
  ]

  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>{isChuva ? 'PLUVIOMETROS' : 'ANALISE DE SOLO'}</p>
          <h2 style={viewTitleStyle}>{title}</h2>
          <p style={viewSubtitleStyle}>{subtitle}</p>
        </div>
        {isChuva ? (
          <div style={dateFilterGroupStyle}>
            <label style={dateLabelStyle}>
              Data inicial
              <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} style={dateInputStyle} />
            </label>
            <label style={dateLabelStyle}>
              Data final
              <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} style={dateInputStyle} />
            </label>
            <button style={primaryActionStyle}>Interpolar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {['Todos parametros', '0-20 cm', '20-40 cm', talhaoReferencia].map((filter, index) => (
              <button key={filter} style={index === 0 ? primaryActionStyle : secondaryActionStyle}>{filter}</button>
            ))}
          </div>
        )}
      </div>

      <div style={mapShellStyle}>
        <div style={mapToolbarStyle}>
          <button style={mapPillActiveStyle}>{isChuva ? 'Chuva interpolada' : 'Resultados de solo'}</button>
          <button style={mapPillStyle}>{dataInicial} - {dataFinal}</button>
          <button style={mapPillStyle}>{isChuva ? 'Pluviometros' : 'Nutrientes'}</button>
        </div>
        {isChuva ? (
          <div style={rainMapFrameStyle}>
            <SimpleFarmMap
              features={features.map(item => ({ ...item.feature, properties: { ...item.feature.properties, codigo: item.talhao.codigo } }))}
              height={460}
              selectedMode="chuvas"
              pluviometros={pluviometros}
            />
            <div style={legendStyle}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800 }}>Chuva acumulada</p>
              <div style={gradientBarStyle} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.8)' }}>
                <span>Baixo</span><span>Medio</span><span>Alto</span>
              </div>
            </div>
            {pluviometros.length === 0 && (
              <div style={rainEmptyOverlayStyle}>
                Cadastre pluviometros na pagina Gerencial para gerar a camada interpolada.
              </div>
            )}
          </div>
        ) : (
          <div style={soilResultsShellStyle}>
            {soilParams.map(([nutriente, media, camada, talhao], index) => (
              <div key={nutriente} style={soilNutrientRowStyle}>
                <div>
                  <p style={{ margin: 0, color: C.textDk, fontWeight: 900, fontSize: 14 }}>{nutriente}</p>
                  <p style={{ margin: '3px 0 0', color: C.textMid, fontSize: 11 }}>Talhao {talhao} · camada {camada}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: index % 3 === 0 ? C.greenDp : index % 3 === 1 ? C.amberDk : C.blue, fontWeight: 900, fontSize: 16 }}>{media}</p>
                  <p style={{ margin: '3px 0 0', color: C.textDim, fontSize: 9, fontFamily: 'monospace' }}>MEDIA DO NUTRIENTE</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={metricGridStyle}>
        <MetricCard label={isChuva ? 'Pluviometros ativos' : 'Media do nutriente no talhao'} value={isChuva ? pluviometros.length : '5,7 pH'} tone={C.greenDp} />
        <MetricCard label={isChuva ? 'Talhoes no recorte' : 'Talhao coberto'} value={isChuva ? talhoes.length : talhaoReferencia} tone={C.blue} />
        <MetricCard label={isChuva ? 'Periodo selecionado' : 'Camada analisada'} value={isChuva ? `${dataInicial} a ${dataFinal}` : '0-20 cm'} tone={C.amberDk} />
        <MetricCard label={isChuva ? 'Camada ativa' : 'Parametros avaliados'} value={isChuva ? 'Mapa principal e clima' : soilParams.length} tone={C.soilDk} />
      </div>
    </section>
  )
}

function ScoutingView({ talhoes, talhaoSel, abrirTalhao }) {
  const timeline = [
    { data: 'Hoje · 08:30', titulo: 'Visita em andamento', talhao: talhaoSel?.codigo || 'T04', dano: 'Controle', cor: C.amberDk },
    { data: 'Ontem · 16:40', titulo: 'Visita realizada', talhao: 'T02', dano: 'Sem dano econômico', cor: C.greenDp },
    { data: '13 de maio · 10:20', titulo: 'Visita realizada', talhao: 'T07', dano: 'Dano econômico', cor: C.redDk }
  ]

  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>MONITORAMENTO</p>
          <h2 style={viewTitleStyle}>Scouting dos talhoes</h2>
          <p style={viewSubtitleStyle}>Mapa da fazenda com filtros por último monitoramento, dano e histórico por talhão.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Último monitoramento', 'Sem dano econômico', 'Controle', 'Dano econômico'].map((item, index) => (
            <button key={item} style={index === 0 ? primaryActionStyle : secondaryActionStyle}>{item}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 14 }}>
        <div style={mapShellStyle}>
          <div style={scoutingMapStyle}>
            {talhoes.slice(0, 9).map((talhao, index) => (
              <button
                key={talhao.id}
                onClick={() => abrirTalhao(talhao)}
                style={{
                  ...plotShapeStyle,
                  borderColor: talhaoSel?.id === talhao.id ? C.bg : 'rgba(255,255,255,0.78)',
                  left: `${10 + (index % 3) * 27}%`,
                  top: `${13 + Math.floor(index / 3) * 27}%`,
                  width: `${20 + (index % 2) * 5}%`,
                  height: `${22 + (index % 3) * 4}%`,
                  background: index % 4 === 0 ? 'rgba(232,90,58,0.78)' : index % 3 === 0 ? 'rgba(232,168,76,0.78)' : 'rgba(61,138,34,0.78)'
                }}
              >
                <strong>{talhao.codigo}</strong>
                <span>{Number(talhao.area_ha || 0).toFixed(1)} ha</span>
              </button>
            ))}
          </div>
        </div>

        <aside style={panelStyle}>
          <p style={eyebrowStyle}>LINHA DO TEMPO</p>
          <h3 style={panelTitleStyle}>{talhaoSel ? `Talhão ${talhaoSel.codigo}` : 'Últimos monitoramentos'}</h3>
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {timeline.map(item => (
              <div key={`${item.data}-${item.titulo}`} style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: item.cor, marginTop: 4 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>{item.data}</p>
                  <p style={{ margin: '2px 0 0', color: C.textDk, fontWeight: 800, fontSize: 13 }}>{item.titulo}</p>
                  <p style={{ margin: '3px 0 0', color: C.textMid, fontSize: 12 }}>Talhão {item.talhao} · {item.dano}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}

function MapaCadastroTalhoes({ talhoes, onOpenCadastro, onSelectTalhao }) {
  const features = talhoes.map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) })).filter(item => item.feature)

  return (
    <div style={mapManagerShellStyle}>
      <div style={mapSideMenuStyle}>
        <p style={sidebarEyebrowStyle}>MAPA</p>
        <button onClick={() => onOpenCadastro('draw')} style={mapToolButtonStyle}>Desenhar talhão</button>
        <button onClick={() => onOpenCadastro('kml')} style={mapToolButtonStyle}>Importar KML</button>
        <button onClick={() => onOpenCadastro()} style={mapToolButtonStyle}>Cadastro completo</button>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={eyebrowStyle}>TALHÕES GEOREFERENCIADOS</p>
            <h3 style={panelTitleStyle}>Mapa da fazenda</h3>
          </div>
          <span style={mapCounterStyle}>{features.length} com geometria</span>
        </div>
        <SimpleFarmMap
          features={features.map(item => ({ ...item.feature, properties: { ...item.feature.properties, codigo: item.talhao.codigo } }))}
          height={360}
          onFeatureClick={(index) => onSelectTalhao(features[index].talhao)}
        />
      </div>
    </div>
  )
}

function TalhaoGeoModal({ fazendaId, initialMode, sugerirCodigo, talhoes, onClose, onCreated }) {
  const [mode, setMode] = useState(initialMode)
  const [codigo, setCodigo] = useState(sugerirCodigo || 'T1')
  const [nome, setNome] = useState('')
  const [cultura, setCultura] = useState('soja')
  const [fase, setFase] = useState('preparo')
  const [drawPoints, setDrawPoints] = useState([])
  const [geojson, setGeojson] = useState(null)
  const [importFeatures, setImportFeatures] = useState([])
  const [sourceFile, setSourceFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const existingFeatures = talhoes.map(talhao => normalizeFeature(talhao.geometria, talhao.codigo)).filter(Boolean)
  const drawFeature = pointsToFeature(drawPoints, codigo)
  const featuresToSave = importFeatures.length > 0 ? importFeatures : [geojson || drawFeature].filter(Boolean)
  const selectedFeature = featuresToSave[0] || null
  const area = featuresToSave.reduce((sum, feature) => sum + calcularAreaGeo(feature), 0)

  function chooseMode(nextMode) {
    setMode(nextMode)
    setError('')
    setGeojson(null)
    setImportFeatures([])
    setSourceFile(null)
    setDrawPoints([])
  }

  async function handleKml(file) {
    setError('')
    try {
      const text = await file.text()
      const fc = parseKmlText(text)
      const features = fc.features
      const feature = features[0]
      setSourceFile(file)
      setImportFeatures(features)
      setGeojson(feature)
      setCodigo(featureCode(feature, 0))
      setNome(features.length === 1 ? featureName(feature, 0) : `${features.length} talhões importados`)
      setMode('kml')
    } catch (err) {
      setError(err.message || 'Erro ao processar KML')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (featuresToSave.length === 0) {
      setError('Desenhe o talhão ou importe um KML antes de salvar.')
      return
    }
    if (featuresToSave.some(feature => calcularAreaGeo(feature) <= 0)) {
      setError('A geometria precisa ter área válida para criar o talhão.')
      return
    }
    setSaving(true)
    try {
      const origem = sourceFile
        ? await uploadArquivoFazenda({ fazendaId, file: sourceFile, bucket: 'mapas', folder: 'talhoes' })
        : null
      for (let index = 0; index < featuresToSave.length; index++) {
        const feature = featuresToSave[index]
        const multi = featuresToSave.length > 1
        const itemCodigo = multi ? featureCode(feature, index) : codigo
        await criarTalhao({
          fazenda_id: fazendaId,
          codigo: itemCodigo,
          nome: multi ? featureName(feature, index) : (nome || null),
          cultura,
          fase,
          area_ha: calcularAreaGeo(feature),
          geometria: { ...feature, properties: { ...(feature.properties || {}), codigo: itemCodigo } },
          arquivo_origem_bucket: origem?.bucket,
          arquivo_origem_path: origem?.path,
          arquivo_origem_nome: origem?.nome
        })
      }
      await onCreated()
    } catch (err) {
      setError(err.message || 'Erro ao salvar talhão')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={modalOverlayStyle}>
      <div onClick={e => e.stopPropagation()} style={geoModalStyle}>
        <div style={geoModalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>CADASTRO DE TALHÃO</p>
            <h2 style={viewTitleStyle}>Geometria obrigatória</h2>
          </div>
          <button onClick={onClose} style={iconButtonStyle}>×</button>
        </div>

        <div style={geoModalBodyStyle}>
          <aside style={geoModeMenuStyle}>
            <button onClick={() => chooseMode('draw')} style={mode === 'draw' ? geoModeButtonActiveStyle : geoModeButtonStyle}>Desenhar no mapa</button>
            <button onClick={() => chooseMode('kml')} style={mode === 'kml' ? geoModeButtonActiveStyle : geoModeButtonStyle}>Importar KML</button>
            <div style={geoRuleBoxStyle}>Para criar um talhão, o contorno precisa vir de um desenho no mapa ou de um arquivo KML.</div>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!mode && (
              <div style={emptyGeoStateStyle}>
                <h3 style={panelTitleStyle}>Escolha uma forma de cadastrar</h3>
                <p style={{ margin: '8px 0 0', color: C.textMid, fontSize: 13 }}>Use o menu lateral para desenhar o contorno ou importar um KML.</p>
              </div>
            )}

            {mode === 'draw' && (
              <>
                <SimpleFarmMap
                  features={[...existingFeatures, drawFeature].filter(Boolean)}
                  drawPoints={drawPoints}
                  onMapClick={(point) => setDrawPoints(points => [...points, point])}
                  height={360}
                  drawing
                />
                <div style={drawToolsStyle}>
                  <button onClick={() => setDrawPoints(points => points.slice(0, -1))} style={secondaryActionStyle} disabled={drawPoints.length === 0}>Desfazer ponto</button>
                  <button onClick={() => setDrawPoints([])} style={secondaryActionStyle}>Limpar desenho</button>
                  <span style={{ color: C.textMid, fontSize: 12 }}>{drawPoints.length} pontos marcados</span>
                </div>
              </>
            )}

            {mode === 'kml' && (
              <>
                <label style={kmlDropStyle}>
                  <input type="file" accept=".kml" hidden onChange={e => e.target.files?.[0] && handleKml(e.target.files[0])} />
                  <strong>Selecionar arquivo KML</strong>
                  <span>O sistema vai ler um ou vários polígonos e calcular as áreas automaticamente.</span>
                </label>
                <SimpleFarmMap features={[...existingFeatures, ...featuresToSave].filter(Boolean)} height={300} />
              </>
            )}

            <form onSubmit={handleSave} style={geoFormStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: 10 }}>
                <Field label="CÓDIGO">
                  <input required disabled={featuresToSave.length > 1} value={featuresToSave.length > 1 ? `${featuresToSave.length} códigos do KML` : codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} style={{ ...inputStyle, color: featuresToSave.length > 1 ? C.textDim : C.textDk }} />
                </Field>
                <Field label="NOME">
                  <input disabled={featuresToSave.length > 1} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome opcional" style={{ ...inputStyle, color: featuresToSave.length > 1 ? C.textDim : C.textDk }} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px', gap: 10 }}>
                <Field label="CULTURA">
                  <select value={cultura} onChange={e => setCultura(e.target.value)} style={inputStyle}>
                    {['soja', 'milho', 'algodao', 'feijao', 'sorgo', 'cana', 'cafe', 'outro'].map(item => <option key={item} value={item}>{formatCultura(item)}</option>)}
                  </select>
                </Field>
                <Field label="FASE">
                  <select value={fase} onChange={e => setFase(e.target.value)} style={inputStyle}>
                    {Object.entries(FASE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="ÁREA">
                  <div style={{ ...inputStyle, color: area > 0 ? C.greenDp : C.textDim, fontWeight: 900 }}>{area.toFixed(2)} ha</div>
                </Field>
              </div>
              {error && <div style={formErrorStyle}>{error}</div>}
              <button type="submit" disabled={saving || featuresToSave.length === 0 || area <= 0} style={{ ...primaryActionStyle, width: '100%', opacity: saving || featuresToSave.length === 0 || area <= 0 ? 0.55 : 1 }}>
                {saving ? 'Salvando...' : `Criar ${featuresToSave.length > 1 ? `${featuresToSave.length} talhões` : 'talhão'} com geometria`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function SimpleFarmMap({ features = [], drawPoints = [], onMapClick, onFeatureClick, height = 340, drawing = false, selectedCode = null, selectedMode = 'timeline', fullBleed = false, pluviometros = [], placingPluviometro = false, onMapPoint, onPluviometroClick }) {
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
    <SatelliteFarmMap
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
    />
  )
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpointBetween(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function pointInPolygon(point, polygon) {
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

function SatelliteFarmMap({ normalized = [], onFeatureClick, height = 340, selectedCode = null, selectedMode = 'timeline', fullBleed = false, pluviometros = [], placingPluviometro = false, onMapPoint, onPluviometroClick }) {
  const containerRef = useRef(null)
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)
  const tapRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState(() => getSatelliteInitialView(normalized.map(item => item.feature), { width: 0, height: 0 }, fullBleed))
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
    .filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))

  useEffect(() => {
    const node = containerRef.current
    if (!node) return undefined
    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      setSize({ width: Math.max(0, rect.width), height: Math.max(0, rect.height) })
    }
    updateSize()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!size.width || !size.height) return
    setView(getSatelliteInitialView(normalized.map(item => item.feature), size, fullBleed))
  }, [featureSignature, size.width, size.height, fullBleed])

  const tileLayer = useMemo(() => {
    if (!size.width || !size.height) return { tiles: [], topLeft: { x: 0, y: 0 }, zoom: view.zoom }
    const zoom = clamp(Math.round(view.zoom), TILE_MIN_ZOOM, TILE_MAX_ZOOM)
    const center = lngLatToWorld([view.lng, view.lat], zoom)
    const topLeft = { x: center.x - size.width / 2, y: center.y - size.height / 2 }
    const minX = Math.floor(topLeft.x / TILE_SIZE) - 1
    const maxX = Math.floor((topLeft.x + size.width) / TILE_SIZE) + 1
    const minY = Math.floor(topLeft.y / TILE_SIZE) - 1
    const maxY = Math.floor((topLeft.y + size.height) / TILE_SIZE) + 1
    const tileCount = 2 ** zoom
    const tiles = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (y < 0 || y >= tileCount) continue
        const wrappedX = ((x % tileCount) + tileCount) % tileCount
        tiles.push({
          key: `${zoom}-${x}-${y}`,
          src: `${SATELLITE_TILE_URL}/${zoom}/${y}/${wrappedX}`,
          left: x * TILE_SIZE - topLeft.x,
          top: y * TILE_SIZE - topLeft.y
        })
      }
    }
    return { tiles, topLeft, zoom }
  }, [size.width, size.height, view.lng, view.lat, view.zoom])

  function pointFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function screenToWorld(point, sourceView = view) {
    const center = lngLatToWorld([sourceView.lng, sourceView.lat], sourceView.zoom)
    return { x: center.x + point.x - size.width / 2, y: center.y + point.y - size.height / 2 }
  }

  function setCenterFromWorld(center, zoom) {
    const [lng, lat] = worldToLngLat(center.x, center.y, zoom)
    setView({ lng, lat, zoom })
  }

  function zoomAt(point, nextZoom, sourceView = view) {
    if (!size.width || !size.height) return
    const zoom = clamp(nextZoom, TILE_MIN_ZOOM, TILE_MAX_ZOOM)
    const focusWorld = screenToWorld(point, sourceView)
    const focusCoord = worldToLngLat(focusWorld.x, focusWorld.y, sourceView.zoom)
    const focusAtNextZoom = lngLatToWorld(focusCoord, zoom)
    setCenterFromWorld({
      x: focusAtNextZoom.x - point.x + size.width / 2,
      y: focusAtNextZoom.y - point.y + size.height / 2
    }, zoom)
  }

  function screenToCoord(point) {
    const zoom = tileLayer.zoom || view.zoom
    const center = lngLatToWorld([view.lng, view.lat], zoom)
    const world = { x: center.x + point.x - size.width / 2, y: center.y + point.y - size.height / 2 }
    const [lng, lat] = worldToLngLat(world.x, world.y, zoom)
    return { lng, lat }
  }

  function markerScreenPosition(marker) {
    const world = lngLatToWorld([marker.longitude, marker.latitude], tileLayer.zoom || view.zoom)
    return { x: world.x - tileLayer.topLeft.x, y: world.y - tileLayer.topLeft.y }
  }

  function rainIntensity(marker, index) {
    const seed = String(marker.id || marker.nome || index).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return 42 + (seed % 86)
  }

  function handleWheel(e) {
    e.preventDefault()
    const nextZoom = view.zoom + (e.deltaY < 0 ? 1 : -1)
    zoomAt(pointFromEvent(e), nextZoom)
  }

  function handleDoubleClick(e) {
    e.preventDefault()
    zoomAt(pointFromEvent(e), view.zoom + 1)
  }

  function screenRingForFeature(feature) {
    const zoom = tileLayer.zoom || view.zoom
    return (getFeatureRing(feature) || []).map(coord => {
      const world = lngLatToWorld(coord, zoom)
      return { x: world.x - tileLayer.topLeft.x, y: world.y - tileLayer.topLeft.y }
    })
  }

  function selectFeatureAtPoint(point) {
    if (!onFeatureClick) return false
    for (let i = normalized.length - 1; i >= 0; i--) {
      const { feature, index } = normalized[i]
      if (pointInPolygon(point, screenRingForFeature(feature))) {
        onFeatureClick(index, feature)
        return true
      }
    }
    return false
  }

  function selectPluviometroAtPoint(point) {
    if (!onPluviometroClick) return false
    for (let i = activePluviometros.length - 1; i >= 0; i--) {
      const marker = activePluviometros[i]
      const screen = markerScreenPosition(marker)
      if (distanceBetween(point, screen) <= 18) {
        onPluviometroClick(marker)
        return true
      }
    }
    return false
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const point = pointFromEvent(e)
    pointersRef.current.set(e.pointerId, point)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const points = Array.from(pointersRef.current.values())
    if (points.length >= 2) {
      const [a, b] = points
      tapRef.current = null
      gestureRef.current = { type: 'pinch', startDistance: Math.max(1, distanceBetween(a, b)), startMidpoint: midpointBetween(a, b), startView: view }
    } else {
      tapRef.current = { id: e.pointerId, start: point, moved: false }
      gestureRef.current = { type: 'pan', lastPoint: point }
    }
  }

  function handlePointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return
    const point = pointFromEvent(e)
    pointersRef.current.set(e.pointerId, point)
    if (tapRef.current?.id === e.pointerId && distanceBetween(point, tapRef.current.start) > 6) {
      tapRef.current = { ...tapRef.current, moved: true }
    }
    const points = Array.from(pointersRef.current.values())
    if (points.length >= 2) {
      tapRef.current = null
      const [a, b] = points
      const currentMidpoint = midpointBetween(a, b)
      const gesture = gestureRef.current?.type === 'pinch'
        ? gestureRef.current
        : { type: 'pinch', startDistance: Math.max(1, distanceBetween(a, b)), startMidpoint: currentMidpoint, startView: view }
      gestureRef.current = gesture
      const ratio = distanceBetween(a, b) / gesture.startDistance
      const nextZoom = clamp(Math.round(gesture.startView.zoom + Math.log2(Math.max(0.35, ratio))), TILE_MIN_ZOOM, TILE_MAX_ZOOM)
      const startFocusWorld = screenToWorld(gesture.startMidpoint, gesture.startView)
      const startFocusCoord = worldToLngLat(startFocusWorld.x, startFocusWorld.y, gesture.startView.zoom)
      const focusAtNextZoom = lngLatToWorld(startFocusCoord, nextZoom)
      if (Math.abs(ratio - 1) > 0.03 || distanceBetween(currentMidpoint, gesture.startMidpoint) > 3) suppressClickRef.current = true
      setCenterFromWorld({
        x: focusAtNextZoom.x - currentMidpoint.x + size.width / 2,
        y: focusAtNextZoom.y - currentMidpoint.y + size.height / 2
      }, nextZoom)
      return
    }

    const gesture = gestureRef.current?.type === 'pan' ? gestureRef.current : { type: 'pan', lastPoint: point }
    const dx = point.x - gesture.lastPoint.x
    const dy = point.y - gesture.lastPoint.y
    if (Math.abs(dx) + Math.abs(dy) > 2) suppressClickRef.current = true
    setView(current => {
      const center = lngLatToWorld([current.lng, current.lat], current.zoom)
      const [lng, lat] = worldToLngLat(center.x - dx, center.y - dy, current.zoom)
      return { ...current, lng, lat }
    })
    gestureRef.current = { type: 'pan', lastPoint: point }
  }

  function handlePointerUp(e) {
    if (!pointersRef.current.has(e.pointerId)) return
    const point = pointFromEvent(e)
    const wasSinglePointer = pointersRef.current.size === 1
    const tap = tapRef.current
    const shouldSelect = wasSinglePointer && tap?.id === e.pointerId && !tap.moved && !suppressClickRef.current
    pointersRef.current.delete(e.pointerId)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (shouldSelect && placingPluviometro && onMapPoint) {
      onMapPoint(screenToCoord(point))
      tapRef.current = null
      gestureRef.current = null
      return
    }
    if (shouldSelect && selectPluviometroAtPoint(point)) {
      tapRef.current = null
      gestureRef.current = null
      return
    }
    if (shouldSelect && selectFeatureAtPoint(point)) {
      tapRef.current = null
      gestureRef.current = null
      return
    }
    const points = Array.from(pointersRef.current.values())
    if (points.length === 1) gestureRef.current = { type: 'pan', lastPoint: points[0] }
    if (points.length === 0) {
      tapRef.current = null
      gestureRef.current = null
      if (suppressClickRef.current) window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
  }

  function resetMap(e) {
    e.stopPropagation()
    setView(getSatelliteInitialView(normalized.map(item => item.feature), size, fullBleed))
  }

  function changeZoom(e, delta) {
    e.stopPropagation()
    setView(current => ({ ...current, zoom: clamp(current.zoom + delta, TILE_MIN_ZOOM, TILE_MAX_ZOOM) }))
  }

  return (
    <div
      ref={containerRef}
      style={{ ...(fullBleed ? simpleMapFullStyle : simpleMapStyle), height, cursor: placingPluviometro ? 'crosshair' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      <div style={satelliteTileLayerStyle}>
        {tileLayer.tiles.map(tile => (
          <img
            key={tile.key}
            alt=""
            src={tile.src}
            draggable={false}
            decoding="async"
            style={{ ...satelliteTileStyle, transform: `translate3d(${tile.left}px, ${tile.top}px, 0)` }}
          />
        ))}
      </div>
      <div style={satelliteShadeStyle} />
      {selectedMode === 'chuvas' && activePluviometros.length > 0 && (
        <div style={rainInterpolationLayerStyle}>
          {activePluviometros.map((marker, index) => {
            const pos = markerScreenPosition(marker)
            const intensity = rainIntensity(marker, index)
            const color = intensity > 105 ? 'rgba(232,90,58,0.72)' : intensity > 76 ? 'rgba(232,168,76,0.70)' : 'rgba(70,158,205,0.66)'
            return (
              <span
                key={`rain-${marker.id || index}`}
                style={{
                  ...rainInterpolationSpotStyle,
                  left: pos.x,
                  top: pos.y,
                  background: `radial-gradient(circle, ${color} 0%, rgba(61,138,34,0.34) 42%, transparent 72%)`
                }}
              />
            )
          })}
        </div>
      )}
      <svg width={size.width || '100%'} height={size.height || '100%'} style={satelliteSvgStyle}>
        {normalized.map(({ feature, index }) => {
          const ring = getFeatureRing(feature) || []
          const points = ring.map(coord => {
            const world = lngLatToWorld(coord, tileLayer.zoom || view.zoom)
            return `${world.x - tileLayer.topLeft.x},${world.y - tileLayer.topLeft.y}`
          }).join(' ')
          const labelCoord = getRingLabelCoord(ring)
          const labelWorld = labelCoord ? lngLatToWorld(labelCoord, tileLayer.zoom || view.zoom) : null
          const selected = selectedCode && feature.properties?.codigo === selectedCode
          const selectedFill = selectedMode === 'chuvas' ? 'rgba(55,145,210,0.42)' : 'rgba(232,168,76,0.40)'
          const labelSize = selected ? (fullBleed ? 11 : 10) : (fullBleed ? 9 : 8)
          return (
            <g key={`${feature.properties?.codigo || index}-${index}`} style={{ cursor: onFeatureClick ? 'pointer' : 'default' }}>
              <polygon points={points} fill={selected ? selectedFill : 'rgba(46,124,42,0.26)'} stroke={selected ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.70)'} strokeWidth={selected ? 1.4 : 0.8} />
              {labelWorld && (
                <text
                  x={labelWorld.x - tileLayer.topLeft.x}
                  y={labelWorld.y - tileLayer.topLeft.y}
                  fill="white"
                  fontSize={labelSize}
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  paintOrder="stroke"
                  stroke="rgba(0,0,0,0.64)"
                  strokeWidth="3"
                >
                  {feature.properties?.codigo}
                </text>
              )}
            </g>
          )
        })}
        {activePluviometros.map((marker, index) => {
          const pos = markerScreenPosition(marker)
          const intensity = rainIntensity(marker, index)
          return (
            <g key={`pluviometro-${marker.id || index}`} transform={`translate(${pos.x} ${pos.y})`} style={{ cursor: onPluviometroClick ? 'pointer' : 'default' }}>
              <circle cx="0" cy="0" r="12" fill="rgba(255,255,255,0.94)" stroke={selectedMode === 'chuvas' ? C.blue : C.greenDp} strokeWidth="2" />
              <path d="M-4 -6 h8 v10 c0 3 -8 3 -8 0z" fill="none" stroke={C.greenDp} strokeWidth="1.6" strokeLinecap="round" />
              <path d="M0 -11 c3 3 5 5 5 8a5 5 0 0 1-10 0c0-3 2-5 5-8z" fill="rgba(70,158,205,0.82)" />
              <text x="0" y="24" fill="white" fontSize="9" fontWeight="900" textAnchor="middle" paintOrder="stroke" stroke="rgba(0,0,0,0.62)" strokeWidth="3">{marker.nome}</text>
              {selectedMode === 'chuvas' && <text x="0" y="36" fill="white" fontSize="8" fontWeight="800" textAnchor="middle" paintOrder="stroke" stroke="rgba(0,0,0,0.62)" strokeWidth="2">{intensity.toFixed(0)} mm</text>}
            </g>
          )
        })}
      </svg>
      <div style={satelliteControlsStyle} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
        <button type="button" aria-label="Aproximar mapa" onClick={e => changeZoom(e, 1)} style={satelliteControlButtonStyle}>+</button>
        <button type="button" aria-label="Afastar mapa" onClick={e => changeZoom(e, -1)} style={satelliteControlButtonStyle}>-</button>
      </div>
      <div style={satelliteBadgeStyle}>Satelite</div>
      {normalized.length === 0 && <div style={mapEmptyHintStyle}>Nenhum talhÃ£o com geometria cadastrada</div>}
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
      style={{ ...(fullBleed ? simpleMapFullStyle : simpleMapStyle), height, cursor: canPan ? 'grab' : 'crosshair' }}
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
            const selectedFill = selectedMode === 'chuvas' ? 'rgba(70,158,205,0.52)' : 'rgba(232,168,76,0.46)'
            return (
              <g key={`${feature.properties?.codigo || index}-${index}`} onClick={e => { e.stopPropagation(); if (suppressClickRef.current) { suppressClickRef.current = false; return }; onFeatureClick?.(index, feature) }} style={{ cursor: onFeatureClick ? 'pointer' : 'default' }}>
                <polygon points={points} fill={selected ? selectedFill : 'rgba(61,138,34,0.34)'} stroke={selected ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.74)'} strokeWidth={selected ? '1.4' : '0.7'} vectorEffect="non-scaling-stroke" />
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

function normalizeFeature(raw, codigo = 'T1') {
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

function PluviometroManager({ fazendaId, talhoes, pluviometros, pluviometrosErro, onCreate, onUpdate, onDelete }) {
  const features = talhoes.map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) })).filter(item => item.feature)
  const [mode, setMode] = useState('idle')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState({ nome: 'Pluviometro 1', latitude: '', longitude: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const selected = pluviometros.find(item => item.id === selectedId) || null
  const placing = mode === 'create' || mode === 'edit-point'

  useEffect(() => {
    if (!selectedId && pluviometros[0]) setSelectedId(pluviometros[0].id)
  }, [pluviometros, selectedId])

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setError('')
    setDraft({ nome: `Pluviometro ${pluviometros.length + 1}`, latitude: '', longitude: '' })
  }

  function startRename() {
    if (!selected) return
    setMode('rename')
    setError('')
    setDraft({ nome: selected.nome, latitude: selected.latitude || '', longitude: selected.longitude || '' })
  }

  function startEditPoint() {
    if (!selected) return
    setMode('edit-point')
    setError('')
    setDraft({ nome: selected.nome, latitude: selected.latitude || '', longitude: selected.longitude || '' })
  }

  function handleMapPoint({ lng, lat }) {
    setDraft(current => ({ ...current, latitude: lat.toFixed(7), longitude: lng.toFixed(7) }))
  }

  function selectMarker(marker) {
    setSelectedId(marker.id)
    setMode('idle')
    setError('')
    setDraft({ nome: marker.nome, latitude: marker.latitude || '', longitude: marker.longitude || '' })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!draft.nome.trim()) {
      setError('Informe o nome do pluviometro.')
      return
    }
    if ((mode === 'create' || mode === 'edit-point') && (!draft.latitude || !draft.longitude)) {
      setError('Clique no mapa para posicionar o pluviometro.')
      return
    }
    setSaving(true)
    try {
      const talhao = draft.longitude && draft.latitude ? findTalhaoForCoord(talhoes, Number(draft.longitude), Number(draft.latitude)) : null
      if (mode === 'create') {
        await onCreate({ fazenda_id: fazendaId, nome: draft.nome.trim(), latitude: draft.latitude, longitude: draft.longitude, talhao_id: talhao?.id || null })
      } else if (selected) {
        await onUpdate(selected.id, { nome: draft.nome.trim(), latitude: draft.latitude, longitude: draft.longitude, talhao_id: talhao?.id || selected.talhao_id || null })
      }
      setMode('idle')
    } catch (err) {
      setError(err.message || 'Nao foi possivel salvar o pluviometro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected || !confirm('Desativar este pluviometro?')) return
    setSaving(true)
    setError('')
    try {
      await onDelete(selected.id)
      setSelectedId(null)
      setMode('idle')
    } catch (err) {
      setError(err.message || 'Nao foi possivel desativar o pluviometro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={pluviometerShellStyle}>
      <div style={pluviometerHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>PLUVIOMETROS</p>
          <h3 style={panelTitleStyle}>Mapa de pluviometros</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>Registre o ponto georreferenciado para alimentar o mapa interpolado de chuvas.</p>
        </div>
        <span style={mapCounterStyle}>{pluviometros.length} ativos</span>
      </div>
      <div style={pluviometerMapStageStyle}>
        <SimpleFarmMap
          features={features.map(item => ({ ...item.feature, properties: { ...item.feature.properties, codigo: item.talhao.codigo } }))}
          height={470}
          pluviometros={pluviometros}
          selectedMode="chuvas"
          placingPluviometro={placing}
          onMapPoint={handleMapPoint}
          onPluviometroClick={selectMarker}
        />
        <form onSubmit={handleSave} style={pluviometerEditorStyle}>
          <p style={sidebarEyebrowStyle}>Registrar pluviometro</p>
          <div style={pluviometerEditorActionsStyle}>
            <button type="button" onClick={startCreate} style={mode === 'create' ? primaryActionStyle : secondaryActionStyle}>Adicionar pluviometro</button>
            <button type="button" disabled={!selected} onClick={startRename} style={{ ...secondaryActionStyle, opacity: selected ? 1 : 0.45 }}>Renomear</button>
            <button type="button" disabled={!selected} onClick={startEditPoint} style={{ ...secondaryActionStyle, opacity: selected ? 1 : 0.45 }}>Editar ponto</button>
          </div>
          <label style={dateLabelStyle}>
            Nome
            <input value={draft.nome} onChange={e => setDraft(current => ({ ...current, nome: e.target.value }))} style={dateInputStyle} />
          </label>
          <div style={pluviometerCoordGridStyle}>
            <label style={dateLabelStyle}>
              Latitude
              <input value={draft.latitude} onChange={e => setDraft(current => ({ ...current, latitude: e.target.value }))} placeholder="-9.0000000" style={dateInputStyle} />
            </label>
            <label style={dateLabelStyle}>
              Longitude
              <input value={draft.longitude} onChange={e => setDraft(current => ({ ...current, longitude: e.target.value }))} placeholder="-40.0000000" style={dateInputStyle} />
            </label>
          </div>
          <p style={pluviometerHintStyle}>{placing ? 'Clique no mapa para marcar ou reposicionar o pluviometro.' : selected ? `Selecionado: ${selected.nome}` : 'Use adicionar pluviometro para marcar um novo ponto.'}</p>
          {(error || pluviometrosErro) && <div style={formErrorStyle}>{error || pluviometrosErro}</div>}
          <div style={pluviometerEditorFooterStyle}>
            <button type="submit" disabled={saving || mode === 'idle'} style={{ ...primaryActionStyle, opacity: saving || mode === 'idle' ? 0.55 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" disabled={!selected || saving} onClick={handleDelete} style={{ ...dangerGhostButtonStyle, opacity: !selected || saving ? 0.45 : 1 }}>Desativar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GerencialView({ fazendaId, talhoes, pluviometros = [], pluviometrosErro = '', talhaoSel, operacoes, custos, total, totalCusto, loadOps, opSel, setOpSel, abrirTalhao, excluirTalhao, setShowNovo, setShowNovaOp, onCreatePluviometro, onUpdatePluviometro, onDeletePluviometro, navigate }) {
  const menu = [
    { title: 'Ordem de Serviço', text: 'Planejar e fechar operações da fazenda', action: () => navigate('/os') },
    { title: 'Estoque', text: 'Saldos, entradas, saídas e estoque mínimo', action: () => navigate('/insumos') },
    { title: 'Equipe', text: 'Técnicos, operadores e responsáveis por visita' },
    { title: 'Cadastro de Talhão', text: 'Áreas, culturas, fases e limites dos talhões', action: () => setShowNovo() },
    { title: 'Insumos', text: 'Produtos, doses, custo medio e fornecedores', action: () => navigate('/insumos') },
    { title: 'Gerência de Contas', text: 'Usuários, níveis de acesso e permissões' },
    { title: 'Safras e Culturas', text: 'Ciclo agrícola, variedades e metas por talhão' },
    { title: 'Máquinas e Implementos', text: 'Frota, capacidade operacional e custo hora' },
    { title: 'Centros de Custo', text: 'Agrupar custos por fazenda, safra e atividade' }
  ]

  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>GESTAO OPERACIONAL</p>
          <h2 style={viewTitleStyle}>Gerencial da fazenda</h2>
          <p style={viewSubtitleStyle}>Menus administrativos, cadastros, estoque, equipe, contas e histórico dos talhões.</p>
        </div>
      </div>

      <MapaCadastroTalhoes talhoes={talhoes} onOpenCadastro={setShowNovo} onSelectTalhao={abrirTalhao} />

      <PluviometroManager
        fazendaId={fazendaId}
        talhoes={talhoes}
        pluviometros={pluviometros}
        pluviometrosErro={pluviometrosErro}
        onCreate={onCreatePluviometro}
        onUpdate={onUpdatePluviometro}
        onDelete={onDeletePluviometro}
      />

      <div style={managerGridStyle}>
        {menu.map(item => (
          <button key={item.title} onClick={item.action} style={managerCardStyle}>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <TalhoesPanel talhoes={talhoes} total={total} talhaoSel={talhaoSel} abrirTalhao={abrirTalhao} excluirTalhao={excluirTalhao} setShowNovo={setShowNovo} />
        <HistoricoPanel talhaoSel={talhaoSel} operacoes={operacoes} custos={custos} totalCusto={totalCusto} loadOps={loadOps} opSel={opSel} setOpSel={setOpSel} setShowNovaOp={setShowNovaOp} />
      </div>
    </section>
  )
}

function RelatoriosView({ talhoes, total }) {
  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>RELATORIOS</p>
          <h2 style={viewTitleStyle}>Construtor de relatórios agrícolas</h2>
          <p style={viewSubtitleStyle}>Modelos executivos, técnicos e financeiros usando dados de operações, solo, chuva, scouting e estoque.</p>
        </div>
        <button style={primaryActionStyle}>Exportar PDF</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)', gap: 14 }}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>MODELOS</p>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {reportTypes.map((report, index) => (
              <button key={report} style={reportButtonStyle}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{report}</strong>
              </button>
            ))}
          </div>
        </div>
        <div style={reportPreviewStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: C.greenDp, fontWeight: 900, fontSize: 15 }}>TerraNexa</p>
              <h3 style={{ margin: '10px 0 6px', color: C.textDk, fontSize: 24, fontFamily: 'Georgia, serif' }}>Relatório Agronômico Completo</h3>
              <p style={{ margin: 0, color: C.textMid, fontSize: 13 }}>Área total {total.toFixed(2)} ha · {talhoes.length} talhões · Safra atual</p>
            </div>
            <div style={reportCoverArtStyle} />
          </div>
          <div style={metricGridStyle}>
            <MetricCard label="Talhoes" value={talhoes.length} tone={C.greenDp} />
            <MetricCard label="Area" value={`${total.toFixed(1)} ha`} tone={C.soilDk} />
            <MetricCard label="Modulos" value="8" tone={C.blue} />
            <MetricCard label="Status" value="Pronto" tone={C.amberDk} />
          </div>
        </div>
      </div>
    </section>
  )
}

function TalhoesPanel({ talhoes, total, talhaoSel, abrirTalhao, excluirTalhao, setShowNovo }) {
  return (
    <div style={{ width: 320, flexShrink: 0 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.greenLight}, ${C.amberLight})`, borderRadius: 14, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={eyebrowStyle}>AREA TOTAL</p>
          <p style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 700, color: C.textDk, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{total.toFixed(2)} ha</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={eyebrowStyle}>TALHOES</p>
          <p style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 700, color: C.greenDp, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{talhoes.length}</p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={eyebrowStyle}>CADASTRO DE TALHOES</p>
        <button onClick={() => setShowNovo()} style={smallButtonStyle}>+ Novo</button>
      </div>
      {talhoes.length === 0 ? (
        <div style={{ background: C.bg, borderRadius: 12, padding: '24px 16px', border: `1px dashed ${C.border}`, textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: C.textMid }}>Nenhum talhão cadastrado.</p>
          <button onClick={() => setShowNovo()} style={smallButtonStyle}>Cadastrar</button>
        </div>
      ) : talhoes.map(t => (
        <div key={t.id} onClick={() => abrirTalhao(t)} style={{ background: C.bg, borderRadius: 10, padding: '10px 12px', border: `1.5px solid ${talhaoSel?.id === t.id ? C.greenDp : C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, transition: 'all 0.15s' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.greenDp, fontFamily: 'Georgia, serif', flexShrink: 0 }}>{t.codigo}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textDk }}>{t.codigo} - {formatCultura(t.cultura)}</p>
            <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>{Number(t.area_ha).toFixed(2)} HA · {(FASE_LABELS[t.fase] || t.fase).toUpperCase()}</p>
          </div>
          <button onClick={e => { e.stopPropagation(); excluirTalhao(t.id) }} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 16, cursor: 'pointer', padding: 2 }}>×</button>
        </div>
      ))}
    </div>
  )
}

function HistoricoPanel({ talhaoSel, operacoes, custos, totalCusto, loadOps, opSel, setOpSel, setShowNovaOp }) {
  return (
    <div style={{ flex: 1, minWidth: 280 }}>
      {!talhaoSel ? (
        <div style={{ background: C.bg, borderRadius: 14, padding: '48px 20px', textAlign: 'center', border: `1px dashed ${C.border}` }}>
          <p style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 700, color: C.textDk, fontFamily: 'Georgia, serif' }}>Selecione um talhão</p>
          <p style={{ margin: 0, fontSize: 12, color: C.textMid }}>Clique em um talhão para ver o histórico de operações.</p>
        </div>
      ) : loadOps ? (
        <div style={{ background: C.bg, borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}><p style={{ color: C.textDim, fontFamily: 'monospace', fontSize: 11 }}>CARREGANDO...</p></div>
      ) : (
        <div>
          <div style={{ background: C.bg, borderRadius: 14, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <p style={eyebrowStyle}>HISTORICO</p>
              <h2 style={{ margin: '2px 0 0', fontSize: 16, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{talhaoSel.codigo} - {formatCultura(talhaoSel.cultura)} · {Number(talhaoSel.area_ha).toFixed(2)} ha</h2>
            </div>
            <button onClick={() => setShowNovaOp(true)} style={primaryActionStyle}>Registrar</button>
          </div>

          {custos.length > 0 && <CustosPanel custos={custos} totalCusto={totalCusto} />}

          {operacoes.length === 0 ? (
            <div style={{ background: C.bg, borderRadius: 14, padding: '32px 20px', border: `1px dashed ${C.border}`, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textDk }}>Nenhuma operacao registrada</p>
              <p style={{ margin: '6px 0 14px', fontSize: 12, color: C.textMid }}>Registre a primeira operação deste talhão.</p>
              <button onClick={() => setShowNovaOp(true)} style={primaryActionStyle}>Registrar</button>
            </div>
          ) : operacoes.map(op => (
            <OperacaoCard key={op.id} op={op} open={opSel === op.id} onToggle={() => setOpSel(opSel === op.id ? null : op.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function CustosPanel({ custos, totalCusto }) {
  return (
    <div style={{ background: C.bg, borderRadius: 14, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
      <p style={{ ...eyebrowStyle, marginBottom: 10 }}>CUSTO POR CATEGORIA</p>
      {custos.sort((a, b) => b.custo_total - a.custo_total).map(c => {
        const info = getCategoriaInfo(c.categoria)
        const perc = totalCusto > 0 ? (c.custo_total / totalCusto * 100) : 0
        return (
          <div key={c.categoria} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: info.cor }} />
                <span style={{ fontSize: 11, color: C.textDk }}>{info.label}</span>
                <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>{c.qtd_operacoes} op.</span>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: info.cor, fontFamily: 'monospace' }}>{money(c.custo_total)}</span>
                <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', marginLeft: 6 }}>{perc.toFixed(0)}%</span>
              </div>
            </div>
            <div style={{ background: C.border, borderRadius: 99, height: 5, overflow: 'hidden' }}>
              <div style={{ width: perc + '%', height: 5, borderRadius: 99, background: info.cor }} />
            </div>
          </div>
        )
      })}
      <div style={{ paddingTop: 8, borderTop: `1px solid ${C.borderSoft}`, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textDk }}>Total</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.greenDp, fontFamily: 'monospace' }}>{money(totalCusto)}</span>
      </div>
    </div>
  )
}

function OperacaoCard({ op, open, onToggle }) {
  const info = getCategoriaInfo(op.categoria)
  const totalInsumos = (op.insumos || []).reduce((s, i) => s + Number(i.custo_total || 0), 0)
  const totalOp = totalInsumos + Number(op.custo_aplicacao || 0)

  return (
    <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${open ? info.cor : C.border}`, overflow: 'hidden', marginBottom: 6, transition: 'border 0.2s' }}>
      <button onClick={onToggle} style={{ width: '100%', background: 'none', border: 'none', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 8, height: 32, borderRadius: 4, background: info.cor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textDk }}>{info.label}</p>
          <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>{op.data_operacao} · {op.insumos?.length || 0} insumo{(op.insumos?.length || 0) !== 1 ? 's' : ''}</p>
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: info.cor, fontFamily: 'monospace', flexShrink: 0 }}>{money(totalOp)}</p>
        <span style={{ color: C.textMid, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: 14 }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${C.borderSoft}`, background: C.bgSoft }}>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 8 }}>
            {[{ l: 'INSUMOS', v: totalInsumos, c: C.greenDp }, { l: 'APLICACAO', v: Number(op.custo_aplicacao || 0), c: C.amberDk }].map(x => (
              <div key={x.l} style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '7px 9px', border: `1px solid ${C.border}` }}>
                <p style={{ margin: 0, fontSize: 7, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1px' }}>{x.l}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: x.c, fontFamily: 'monospace' }}>{money(x.v)}</p>
              </div>
            ))}
          </div>
          {op.insumos?.length > 0 && (
            <>
              <p style={{ margin: '0 0 5px', fontSize: 8, color: C.textDim, fontFamily: 'monospace', letterSpacing: '2px' }}>INSUMOS</p>
              {op.insumos.map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', background: C.bg, borderRadius: 7, marginBottom: 4, border: `1px solid ${C.borderSoft}` }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: info.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDk }}>{i.insumo?.nome}</p>
                    <p style={{ margin: 0, fontSize: 9, color: C.textMid, fontFamily: 'monospace' }}>{i.dose} {i.dose_unidade} · {i.quantidade_total} {i.insumo?.unidade} total</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: info.cor, fontFamily: 'monospace' }}>{money(i.custo_total)}</p>
                </div>
              ))}
            </>
          )}
          {op.receituario_agronomo && (
            <div style={{ marginTop: 8, padding: '7px 9px', background: C.amberLight, borderRadius: 7, border: `1px solid ${C.amber}44` }}>
              <p style={{ margin: 0, fontSize: 8, color: C.amberDk, fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 700 }}>RECEITUARIO</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDk }}>{op.receituario_agronomo} - {op.receituario_crea}</p>
            </div>
          )}
          {op.observacoes && (
            <div style={{ marginTop: 8, padding: '7px 9px', background: C.bg, borderRadius: 7, border: `1px solid ${C.borderSoft}` }}>
              <p style={{ margin: 0, fontSize: 8, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1px' }}>OBSERVACOES</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMid, lineHeight: 1.4 }}>{op.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NovoTalhaoModal({ form, erro, salvando, setForm, onClose, onSubmit }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 18, padding: '24px 22px', width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Novo Talhao</h2>
          <button onClick={onClose} style={iconButtonStyle}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          {[['CODIGO *', 'codigo', 'T1', 'text'], ['AREA (ha) *', 'area_ha', '28.5', 'number']].map(([l, k, ph, t]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={formLabelStyle}>{l}</label>
              <input required type={t} step={t === 'number' ? '0.01' : undefined} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={formLabelStyle}>CULTURA</label>
            <select value={form.cultura} onChange={e => setForm(p => ({ ...p, cultura: e.target.value }))} style={inputStyle}>
              {[['soja', 'Soja'], ['milho', 'Milho'], ['algodao', 'Algodao'], ['feijao', 'Feijao'], ['sorgo', 'Sorgo'], ['cana', 'Cana'], ['cafe', 'Cafe'], ['outro', 'Outro']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={formLabelStyle}>FASE</label>
            <select value={form.fase} onChange={e => setForm(p => ({ ...p, fase: e.target.value }))} style={inputStyle}>
              {Object.entries(FASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {erro && <div style={{ background: C.redLight, color: C.redDk, borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12 }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ ...secondaryActionStyle, flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={salvando} style={{ ...primaryActionStyle, flex: 2, opacity: salvando ? 0.65 : 1 }}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }) {
  return (
    <div style={metricCardStyle}>
      <p style={eyebrowStyle}>{label.toUpperCase()}</p>
      <strong style={{ display: 'block', marginTop: 6, color: tone, fontSize: 21, fontFamily: 'Georgia, serif' }}>{value}</strong>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label style={formLabelStyle}>{label}</label>
      {children}
    </div>
  )
}

function CustoPizzaCard() {
  const fatias = [
    { nome: 'Insumos', cor: C.greenDp, valor: 46 },
    { nome: 'Aplicacao', cor: C.amberDk, valor: 28 },
    { nome: 'Maquinas', cor: C.blue, valor: 16 },
    { nome: 'Equipe', cor: C.soil, valor: 10 }
  ]

  return (
    <div style={{ ...metricCardStyle, display: 'grid', gridTemplateColumns: '88px 1fr', gap: 12, alignItems: 'center' }}>
      <div style={pieChartStyle}>
        <div style={pieHoleStyle} />
      </div>
      <div>
        <p style={eyebrowStyle}>CUSTO TOTAL DA FAZENDA</p>
        <strong style={{ display: 'block', marginTop: 5, color: C.greenDp, fontSize: 20, fontFamily: 'Georgia, serif' }}>R$ 0,00</strong>
        <div style={{ display: 'grid', gap: 3, marginTop: 8 }}>
          {fatias.map(fatia => (
            <div key={fatia.nome} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: C.textMid }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: fatia.cor }} />
              <span>{fatia.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SmartInsightCard({ title, status, actionLabel, onAction, insights }) {
  const statusMap = {
    financeiro: { label: 'Financeiro', color: C.greenDp, bg: C.greenLight },
    atencao: { label: 'Atenção', color: C.amberDk, bg: C.amberLight },
    estavel: { label: 'Estável', color: C.greenDp, bg: C.greenLight },
    agronomico: { label: 'Agronômico', color: C.blue, bg: C.blueLight },
    operacional: { label: 'Operacional', color: C.soilDk, bg: C.soilLight }
  }
  const cfg = statusMap[status] || statusMap.estavel

  return (
    <div style={smartCardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={panelTitleStyle}>{title}</h3>
        <span style={{ ...smartBadgeStyle, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 13 }}>
        {insights.map(item => {
          const tone = insightToneStyle(item.tone)
          return (
            <div key={`${item.label}-${item.value}`} style={smartInsightRowStyle}>
              <span style={{ ...smartDotStyle, background: tone.color }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: C.textDk, fontSize: 12, fontWeight: 800 }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', color: C.textMid, fontSize: 12, lineHeight: 1.35 }}>{item.value}</p>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={onAction} style={smartActionStyle}>{actionLabel}</button>
    </div>
  )
}

function insightToneStyle(tone) {
  if (tone === 'danger') return { color: C.redDk }
  if (tone === 'attention') return { color: C.amberDk }
  if (tone === 'ok') return { color: C.greenDp }
  return { color: C.textDim }
}

function InsightPanel({ title, items }) {
  return (
    <div style={panelStyle}>
      <h3 style={panelTitleStyle}>{title}</h3>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {items.map(item => (
          <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: C.greenDp, marginTop: 5, flexShrink: 0 }} />
            <p style={{ margin: 0, color: C.textMid, fontSize: 12, lineHeight: 1.45 }}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const eyebrowStyle = { margin: 0, fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1.4px', fontWeight: 800 }
const viewTitleStyle = { margin: '4px 0 0', fontSize: 24, color: C.textDk, fontWeight: 800, fontFamily: 'Georgia, serif' }
const viewSubtitleStyle = { margin: '8px 0 0', fontSize: 13, color: C.textMid, maxWidth: 620, lineHeight: 1.45 }
const panelTitleStyle = { margin: 0, fontSize: 15, color: C.textDk, fontWeight: 800, fontFamily: 'Georgia, serif' }
const viewStackStyle = { display: 'grid', gap: 14 }
const floatingHeaderStyle = { position: 'fixed', top: 14, left: 14, zIndex: 40, background: 'rgba(255,255,255,0.94)', border: `1px solid ${C.border}`, borderRadius: 14, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', backdropFilter: 'blur(10px)' }
const hamburgerButtonStyle = { background: C.greenDp, color: C.bg, border: 'none', borderRadius: 9, width: 36, height: 36, fontSize: 18, fontWeight: 900, cursor: 'pointer' }
const drawerBackdropStyle = { position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.24)' }
const drawerStyle = { width: 280, maxWidth: '82vw', height: '100%', background: C.bg, borderRight: `1px solid ${C.border}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 9, boxShadow: '14px 0 40px rgba(0,0,0,0.22)', boxSizing: 'border-box' }
const drawerNavButtonStyle = { width: '100%', border: '1px solid', borderRadius: 11, padding: '12px 13px', fontSize: 13, fontWeight: 900, textAlign: 'left', cursor: 'pointer' }
const drawerCloseButtonStyle = { width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgLight, color: C.textDk, fontSize: 17, fontWeight: 900, cursor: 'pointer' }
const drawerFooterStyle = { marginTop: 'auto', borderTop: `1px solid ${C.borderSoft}`, paddingTop: 12, display: 'grid', gap: 9 }
const drawerFarmInfoStyle = { background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 3, color: C.textDk }
const drawerBrandStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 9, color: C.textDk }
const drawerReturnButtonStyle = { width: '100%', border: `1px solid ${C.border}`, borderRadius: 11, padding: '12px 13px', background: C.bgLight, color: C.textDk, fontSize: 12, fontWeight: 900, textAlign: 'left', cursor: 'pointer' }
const farmLayoutStyle = { display: 'block', alignItems: 'flex-start', gap: 14 }
const farmSidebarStyle = { display: 'none' }
const sidebarEyebrowStyle = { margin: '2px 4px 5px', fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1.4px', fontWeight: 900 }
const sidebarNavButtonStyle = { width: '100%', border: '1px solid', borderRadius: 10, padding: '10px 11px', fontSize: 12, fontWeight: 800, textAlign: 'left', cursor: 'pointer' }
const heroPanelStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }
const panelStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }
const mapMainPageStyle = { position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden', background: '#102316' }
const mapMainPageMobileStyle = { position: 'relative', width: '100%', minHeight: '100vh', overflow: 'auto', background: '#102316' }
const mapTopInfoStyle = { position: 'absolute', top: 92, left: 18, zIndex: 5, background: 'rgba(5,18,12,0.62)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: '12px 14px', backdropFilter: 'blur(8px)', maxWidth: 360 }
const mapTalhaoChipStyle = { position: 'absolute', top: 92, right: 18, zIndex: 5, background: 'rgba(255,255,255,0.92)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '11px 13px', minWidth: 190, boxShadow: '0 10px 30px rgba(0,0,0,0.16)', display: 'grid', gap: 2 }
const timelineDockStyle = { position: 'absolute', top: 92, right: 16, bottom: 16, zIndex: 6, width: 'min(360px, calc(100% - 32px))', background: 'rgba(18,73,37,0.68)', border: '1px solid rgba(168,217,143,0.58)', borderRadius: 16, padding: 13, backdropFilter: 'blur(14px)', boxShadow: '0 18px 48px rgba(0,0,0,0.32)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }
const timelineMobileStyle = { position: 'relative', zIndex: 6, margin: 12, background: 'rgba(18,73,37,0.78)', border: '1px solid rgba(168,217,143,0.58)', borderRadius: 16, padding: 13, boxShadow: '0 16px 36px rgba(0,0,0,0.26)' }
const timelineHeaderStyle = { display: 'grid', gap: 8, marginBottom: 10 }
const timelineAreaPillStyle = { justifySelf: 'flex-start', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 999, padding: '5px 9px', color: C.bg, fontSize: 11, fontFamily: 'monospace', fontWeight: 900 }
const timelineSummaryCardStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, color: C.textDk, display: 'grid', gap: 11 }
const timelineCardTitleStyle = { margin: 0, color: C.textDk, fontSize: 15, fontFamily: 'Georgia, serif', fontWeight: 900 }
const timelineSummaryRowsStyle = { display: 'grid', gap: 9 }
const timelineSummaryRowStyle = { display: 'grid', gap: 2, paddingBottom: 8, borderBottom: `1px solid ${C.borderSoft}` }
const timelineSummaryLabelStyle = { color: C.textDim, fontSize: 10, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.7px' }
const timelineSummaryValueStyle = { color: C.textDk, fontSize: 13, lineHeight: 1.3 }
const timelineTextButtonStyle = { justifySelf: 'flex-start', background: 'transparent', border: 'none', color: C.greenDp, padding: 0, fontSize: 12, fontWeight: 900, cursor: 'pointer' }
const timelineTableStyle = { display: 'grid', gap: 8, paddingBottom: 3 }
const timelineTableDesktopStyle = { display: 'grid', gap: 8, paddingBottom: 3, flex: 1, gridAutoRows: 'minmax(96px, 1fr)' }
const timelineCellStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, minHeight: 92, textAlign: 'left', color: C.textDk, display: 'grid', gap: 3, cursor: 'pointer' }
const timelineActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }
const timelineActionButtonStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 11px', color: C.textDk, fontWeight: 900, cursor: 'pointer' }
const timelineModeTabsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', margin: '0 0 9px' }
const timelineModeButtonStyle = { border: '1px solid rgba(255,255,255,0.72)', borderRadius: 999, padding: '7px 11px', fontSize: 11, fontWeight: 900, cursor: 'pointer' }
const timelineRainLayoutStyle = { display: 'grid', gap: 8, alignItems: 'stretch' }
const timelineDateGridStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, alignItems: 'end' }
const timelineDateLabelStyle = { display: 'grid', gap: 5, color: C.textDim, fontSize: 9, fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 900 }
const timelineDateInputStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 9px', color: C.textDk, fontSize: 12, fontWeight: 800, minWidth: 0 }
const timelinePrimaryButtonStyle = { background: C.greenDp, color: C.bg, border: 'none', borderRadius: 8, padding: '9px 10px', fontSize: 11, fontWeight: 900, cursor: 'pointer' }
const timelineRainGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 8 }
const timelineRainMetricStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.textDk, display: 'grid', gap: 4 }
const timelineRainMapStyle = { minHeight: 96, borderRadius: 10, border: '1px solid rgba(255,255,255,0.48)', background: 'radial-gradient(circle at 28% 45%, rgba(70,158,205,0.88), transparent 24%), radial-gradient(circle at 72% 48%, rgba(232,168,76,0.82), transparent 28%), linear-gradient(135deg, rgba(61,138,34,0.82), rgba(18,73,37,0.92))', color: C.bg, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 900, fontFamily: 'Georgia, serif', textShadow: '0 2px 10px rgba(0,0,0,0.38)' }
const talhaoHubStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }
const talhaoMapColumnStyle = { flex: '999 1 560px', minWidth: 0 }
const talhaoMapHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }
const talhaoDecisionPanelStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, minHeight: 520, flex: '1 1 320px', maxWidth: 380, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }
const emptyTalhaoPanelStyle = { minHeight: 420, display: 'grid', placeContent: 'center', textAlign: 'center', padding: 20 }
const talhaoStatusBadgeStyle = { background: C.greenLight, color: C.greenDp, border: `1px solid ${C.greenDp}33`, borderRadius: 999, padding: '5px 9px', fontSize: 10, fontFamily: 'monospace', fontWeight: 900 }
const talhaoKpiGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
const talhaoMiniKpiStyle = { background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, minHeight: 74 }
const talhaoActionGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
const talhaoInsightBoxStyle = { background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 12, padding: 12 }
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }
const dashboardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }
const metricCardStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, minHeight: 92 }
const smartCardStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, minHeight: 220, display: 'flex', flexDirection: 'column' }
const smartBadgeStyle = { borderRadius: 999, padding: '4px 8px', fontSize: 9, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.8px', whiteSpace: 'nowrap' }
const smartInsightRowStyle = { display: 'grid', gridTemplateColumns: '9px 1fr', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px solid ${C.borderSoft}` }
const smartDotStyle = { width: 8, height: 8, borderRadius: 99, marginTop: 4 }
const smartActionStyle = { marginTop: 'auto', alignSelf: 'flex-start', background: C.bg, color: C.greenDp, border: `1px solid ${C.greenDp}55`, borderRadius: 9, padding: '8px 11px', fontSize: 11, fontWeight: 900, cursor: 'pointer' }
const monitoringGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)', gap: 14, alignItems: 'stretch' }
const monitoringActionGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 16 }
const gpsStatusStyle = { marginTop: 14, background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, padding: 11, display: 'grid', gap: 3, color: C.textDk, fontSize: 12 }
const gpsCanvasStyle = { position: 'relative', minHeight: 260, borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(9,42,26,0.98), rgba(47,102,50,0.9)), repeating-linear-gradient(30deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 44px)' }
const gpsPathLineStyle = { position: 'absolute', left: '12%', right: '12%', top: '48%', height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.74), transparent)', transform: 'rotate(-8deg)' }
const gpsPointStyle = { position: 'absolute', width: 15, height: 15, borderRadius: 99, border: '2px solid white', transform: 'translate(-50%, -50%)', boxShadow: '0 5px 16px rgba(0,0,0,0.25)' }
const gpsTableStyle = { display: 'grid', gap: 8, marginTop: 10 }
const gpsRowStyle = { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 70px', gap: 10, alignItems: 'center', background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 10px', color: C.textMid, fontSize: 12 }
const pieChartStyle = { width: 82, height: 82, borderRadius: '50%', background: `conic-gradient(${C.greenDp} 0 46%, ${C.amberDk} 46% 74%, ${C.blue} 74% 90%, ${C.soil} 90% 100%)`, position: 'relative', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }
const pieHoleStyle = { position: 'absolute', inset: 21, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}` }
const primaryActionStyle = { background: C.greenDp, color: C.bg, border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const secondaryActionStyle = { background: C.bgLight, color: C.textDk, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const primaryHeaderButtonStyle = { ...primaryActionStyle, padding: '9px 13px' }
const smallButtonStyle = { background: C.greenDp, color: C.bg, border: 'none', borderRadius: 8, padding: '6px 11px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }
const iconButtonStyle = { background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 8, width: 36, height: 36, fontSize: 16, cursor: 'pointer', color: C.textDk }
const inputStyle = { width: '100%', padding: '10px 12px', background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.textDk, outline: 'none', boxSizing: 'border-box' }
const formLabelStyle = { display: 'block', fontSize: 9, fontFamily: 'monospace', letterSpacing: '2px', color: C.textDim, marginBottom: 5, fontWeight: 700 }
const dateFilterGroupStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', justifyContent: 'flex-end' }
const dateLabelStyle = { display: 'grid', gap: 5, color: C.textDim, fontSize: 9, fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 800 }
const dateInputStyle = { background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 10px', color: C.textDk, fontSize: 12, fontWeight: 800, minWidth: 150 }
const mapShellStyle = { background: '#07130f', borderRadius: 16, padding: 12, border: `1px solid ${C.border}`, minHeight: 430, overflow: 'hidden' }
const mapToolbarStyle = { position: 'relative', zIndex: 2, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }
const mapPillActiveStyle = { background: C.greenDp, color: C.bg, border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 11, fontWeight: 800 }
const mapPillStyle = { background: 'rgba(8,18,15,0.86)', color: C.bg, border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, padding: '8px 12px', fontSize: 11, fontWeight: 800 }
const interpolationMapStyle = { position: 'relative', minHeight: 360, borderRadius: 12, overflow: 'hidden', background: 'radial-gradient(circle at 30% 42%, rgba(232,90,58,0.82), transparent 20%), radial-gradient(circle at 67% 56%, rgba(232,90,58,0.74), transparent 18%), radial-gradient(circle at 54% 20%, rgba(232,168,76,0.82), transparent 18%), linear-gradient(135deg, rgba(61,138,34,0.8), rgba(18,73,37,0.9)), repeating-linear-gradient(35deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 56px)' }
const soilResultsShellStyle = { maxHeight: 380, overflowY: 'auto', borderRadius: 12, background: C.bgSoft, padding: 10, display: 'grid', gap: 8 }
const soilNutrientRowStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 12px', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }
const scoutingMapStyle = { position: 'relative', minHeight: 430, borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(10,35,24,0.98), rgba(56,82,45,0.95)), repeating-linear-gradient(28deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 64px)' }
const plotShapeStyle = { position: 'absolute', border: '2px solid rgba(255,255,255,0.85)', borderRadius: '34% 22% 31% 18%', color: C.bg, textShadow: '0 1px 4px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const legendStyle = { position: 'absolute', left: 14, bottom: 14, background: 'rgba(5,14,11,0.86)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, color: C.bg, padding: 12, width: 190 }
const gradientBarStyle = { height: 10, borderRadius: 99, margin: '8px 0 5px', background: 'linear-gradient(90deg, #2fb15f, #e8c84c, #ef4d39)' }
const managerGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }
const managerCardStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, minHeight: 92, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', color: C.textDk }
const reportButtonStyle = { background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, padding: 11, display: 'grid', gridTemplateColumns: '34px 1fr', gap: 9, textAlign: 'left', alignItems: 'center', color: C.textDk }
const reportPreviewStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, minHeight: 460 }
const reportCoverArtStyle = { width: 180, height: 120, borderRadius: 12, background: 'linear-gradient(135deg, rgba(61,138,34,0.95), rgba(232,168,76,0.72)), repeating-linear-gradient(30deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 18px)' }
const mapManagerShellStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, display: 'flex', gap: 12, alignItems: 'stretch' }
const mapSideMenuStyle = { width: 170, flexShrink: 0, borderRight: `1px solid ${C.borderSoft}`, paddingRight: 10, display: 'grid', alignContent: 'start', gap: 8 }
const mapToolButtonStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 11px', color: C.textDk, fontSize: 12, fontWeight: 800, textAlign: 'left', cursor: 'pointer' }
const mapCounterStyle = { background: C.greenLight, color: C.greenDp, border: `1px solid ${C.greenDp}33`, borderRadius: 999, padding: '5px 9px', fontSize: 10, fontFamily: 'monospace', fontWeight: 900 }
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.58)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }
const geoModalStyle = { background: C.bg, borderRadius: 18, width: '100%', maxWidth: 1060, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
const geoModalHeaderStyle = { padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }
const geoModalBodyStyle = { flex: 1, overflowY: 'auto', display: 'flex', gap: 14, padding: 14 }
const geoModeMenuStyle = { width: 190, flexShrink: 0, display: 'grid', alignContent: 'start', gap: 8 }
const geoModeButtonStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 12px', color: C.textDk, textAlign: 'left', fontWeight: 900, cursor: 'pointer' }
const geoModeButtonActiveStyle = { ...geoModeButtonStyle, background: C.greenDp, borderColor: C.greenDp, color: C.bg }
const geoRuleBoxStyle = { background: C.bgSoft, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 11, color: C.textMid, fontSize: 12, lineHeight: 1.45 }
const emptyGeoStateStyle = { minHeight: 360, border: `1px dashed ${C.border}`, borderRadius: 14, display: 'grid', placeContent: 'center', textAlign: 'center', padding: 20 }
const drawToolsStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }
const kmlDropStyle = { display: 'grid', gap: 5, placeContent: 'center', textAlign: 'center', minHeight: 96, border: `1.5px dashed ${C.greenDp}`, borderRadius: 14, background: C.greenLight, color: C.textDk, cursor: 'pointer', marginBottom: 10 }
const geoFormStyle = { display: 'grid', gap: 10, marginTop: 12, borderTop: `1px solid ${C.borderSoft}`, paddingTop: 12 }
const formErrorStyle = { background: C.redLight, color: C.redDk, borderRadius: 10, padding: '10px 12px', fontSize: 12, border: `1px solid ${C.red}33` }
const simpleMapStyle = { position: 'relative', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, background: '#0e1d14', minHeight: 240, touchAction: 'none', overscrollBehavior: 'contain' }
const simpleMapFullStyle = { position: 'relative', borderRadius: 0, overflow: 'hidden', border: 'none', background: '#0e1d14', minHeight: '100vh', touchAction: 'none', overscrollBehavior: 'contain' }
const satelliteTileLayerStyle = { position: 'absolute', inset: 0, overflow: 'hidden', background: '#0e1d14' }
const satelliteTileStyle = { position: 'absolute', width: TILE_SIZE, height: TILE_SIZE, objectFit: 'cover', userSelect: 'none', pointerEvents: 'none', willChange: 'transform' }
const satelliteShadeStyle = { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,12,8,0.20), rgba(5,12,8,0.34))', pointerEvents: 'none' }
const rainInterpolationLayerStyle = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, mixBlendMode: 'screen', opacity: 0.78 }
const rainInterpolationSpotStyle = { position: 'absolute', width: 260, height: 260, borderRadius: 999, transform: 'translate(-50%, -50%)', filter: 'blur(8px)' }
const satelliteSvgStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }
const satelliteControlsStyle = { position: 'absolute', left: 24, top: 72, display: 'grid', gap: 8, alignItems: 'center', zIndex: 5 }
const satelliteControlButtonStyle = { width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.92)', color: C.textDk, fontSize: 18, lineHeight: 1, fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.20)' }
const satelliteBadgeStyle = { position: 'absolute', left: 14, bottom: 14, zIndex: 2, background: 'rgba(13,28,17,0.72)', color: 'rgba(255,255,255,0.86)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '6px 10px', fontSize: 10, fontWeight: 900, letterSpacing: 0, textTransform: 'uppercase', pointerEvents: 'none' }
const mapDrawHintStyle = { position: 'absolute', left: 12, bottom: 12, background: 'rgba(255,255,255,0.94)', color: C.textDk, borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800, boxShadow: '0 4px 16px rgba(0,0,0,0.16)' }
const mapEmptyHintStyle = { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: 800, textAlign: 'center', padding: 20 }
const pluviometerShellStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, display: 'grid', gap: 10 }
const pluviometerHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }
const pluviometerMapStageStyle = { position: 'relative', minHeight: 470, borderRadius: 12, overflow: 'hidden' }
const pluviometerEditorStyle = { position: 'absolute', right: 14, top: 14, zIndex: 4, width: 'min(360px, calc(100% - 28px))', display: 'grid', gap: 9, background: 'rgba(255,255,255,0.94)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, boxShadow: '0 18px 44px rgba(0,0,0,0.24)', backdropFilter: 'blur(12px)' }
const pluviometerEditorActionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' }
const pluviometerCoordGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
const pluviometerHintStyle = { margin: 0, color: C.textMid, fontSize: 11, lineHeight: 1.35 }
const pluviometerEditorFooterStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }
const dangerGhostButtonStyle = { background: C.bgLight, color: C.redDk, border: `1px solid ${C.red}55`, borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }
const rainMapFrameStyle = { position: 'relative', minHeight: 460, borderRadius: 12, overflow: 'hidden' }
const rainEmptyOverlayStyle = { position: 'absolute', inset: 'auto 16px 16px 16px', zIndex: 5, background: 'rgba(255,255,255,0.94)', color: C.textDk, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px', fontSize: 12, fontWeight: 800, boxShadow: '0 12px 28px rgba(0,0,0,0.18)' }
