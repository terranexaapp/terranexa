import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listarOperacoes, getCategoriaInfo, resumoCustosPorCategoria } from '../lib/operacoes'
import { criarTalhao } from '../lib/fazendas'
import { listarPluviometros, criarPluviometro, atualizarPluviometro, desativarPluviometro } from '../lib/pluviometros'
import { listarUltimosMonitoramentos, criarMonitoramento, criarMonitoramentoPonto } from '../lib/monitoramentos'
import { uploadArquivoFazenda } from '../lib/storage'
import { NovaOperacaoModal } from '../components/NovaOperacaoModal'
import { Logo } from '../components/Logo'
import { theme } from '../styles/theme'
import { DesktopIcon } from './FazendaDetalhe/DesktopIcon'
import {
  TalhaoMiniKpi,
  TalhaoInsight,
  MetricCard,
  Field,
  CustoPizzaCard,
  SmartInsightCard,
  InsightPanel,
  OperacaoCard,
  NovoTalhaoModal
} from './FazendaDetalhe/sharedComponents'
import {
  ManagementModulePanel,
  ConfiguracaoFazendaPanel,
  RelatoriosView,
  CustosPanel
} from './FazendaDetalhe/panels'
import {
  FarmDesktopSidebar,
  DashboardView,
  ScoutingView,
  MonitoramentoRegistroView,
  InterpolacaoView
} from './FazendaDetalhe/views'
import { SimpleFarmMap } from './FazendaDetalhe/maps'
import { FazendaMapaPrincipal } from './FazendaDetalhe/mapaPrincipal'
import {
  FASE_LABELS,
  NAV_ITEMS,
  DESKTOP_NAV_GROUPS,
  reportTypes,
  MAP_DEFAULT_BOUNDS,
  TILE_SIZE,
  TILE_MIN_ZOOM,
  TILE_MAX_ZOOM,
  SATELLITE_TILE_URL,
  MAPBOX_TOKEN,
  MAPBOX_SATELLITE_TILE_URL,
  MAPBOX_ATTRIBUTION,
  ESRI_ATTRIBUTION,
  MONITORAMENTO_LEGEND
} from './FazendaDetalhe/constants'
import { useMediaQuery, useDevicePosition } from './FazendaDetalhe/hooks'
import { loadLeafletAssets } from './FazendaDetalhe/leafletLoader'
import { requestOfflineStorage, saveMonitoringPointOffline } from './FazendaDetalhe/offline'
import {
  formatCultura,
  money,
  formatShortDate,
  formatMonitoramentoDate,
  daysSinceDate,
  getMonitoramentoMeta,
  indexMonitoramentosByTalhao,
  calcularAreaGeo,
  parseKmlText,
  featureName,
  featureCode,
  getFeatureRing,
  getMapBounds,
  projectCoord,
  clamp,
  lngLatToWorld,
  worldToLngLat,
  getBoundsCenter,
  getFitZoom,
  getSatelliteInitialView,
  getRingLabelCoord,
  escapeHtml,
  ringToLatLngs,
  fitLeafletToFeatures,
  getLeafletPolygonStyle,
  leafletLabelHtml,
  leafletPluviometroHtml,
  pointInFeatureCoord,
  findTalhaoForCoord,
  pointToCoord,
  pointsToFeature,
  distanceBetween,
  midpointBetween,
  pointInPolygon,
  normalizeFeature
} from './FazendaDetalhe/utils'
import {
  eyebrowStyle,
  viewTitleStyle,
  viewSubtitleStyle,
  panelTitleStyle,
  viewStackStyle,
  desktopTopbarStyle,
  desktopTopbarBrandStyle,
  desktopMenuButtonStyle,
  desktopTopbarEyebrowStyle,
  desktopTopbarTitleStyle,
  desktopTopbarActionsStyle,
  desktopUtilityButtonStyle,
  desktopAvatarButtonStyle,
  desktopChevronButtonStyle,
  floatingHeaderStyle,
  hamburgerButtonStyle,
  drawerBackdropStyle,
  drawerStyle,
  drawerNavButtonStyle,
  drawerCloseButtonStyle,
  drawerFooterStyle,
  drawerFarmInfoStyle,
  drawerBrandStyle,
  drawerReturnButtonStyle,
  farmLayoutStyle,
  farmSidebarStyle,
  farmLayoutDesktopStyle,
  farmContentDesktopStyle,
  farmDesktopSidebarStyle,
  desktopSidebarHeaderStyle,
  desktopSidebarFarmNameStyle,
  desktopSidebarFarmMetaStyle,
  desktopSidebarGroupsStyle,
  desktopNavGroupStyle,
  desktopNavGroupTitleStyle,
  desktopNavButtonStyle,
  desktopNavIconStyle,
  desktopNavCodeStyle,
  desktopNavTextStyle,
  desktopNavLabelStyle,
  desktopNavHintStyle,
  desktopSidebarFooterStyle,
  desktopSidebarReturnStyle,
  sidebarEyebrowStyle,
  sidebarNavButtonStyle,
  heroPanelStyle,
  panelStyle,
  mapMainPageStyle,
  mapMainPageMobileStyle,
  mapTopInfoStyle,
  mapTalhaoChipStyle,
  timelineDockStyle,
  timelineMobileStyle,
  timelineHeaderStyle,
  timelineHeaderMobileStyle,
  timelineMobileEyebrowStyle,
  timelineTitleStyle,
  timelineMobileTitleStyle,
  timelineAreaPillStyle,
  timelineSummaryCardStyle,
  timelineCardTitleStyle,
  timelineSummaryRowsStyle,
  timelineSummaryRowStyle,
  timelineSummaryLabelStyle,
  timelineSummaryValueStyle,
  timelineTextButtonStyle,
  timelineTableStyle,
  timelineTableDesktopStyle,
  timelineCellStyle,
  timelineTableHorizontalStyle,
  timelineCellHorizontalStyle,
  timelineInfoHorizontalCardStyle,
  timelineMetricHorizontalCardStyle,
  timelineInputHorizontalCardStyle,
  timelineCtaHorizontalStyle,
  timelineScrollEndStyle,
  timelineMonitoringStatusStyle,
  timelineLegendGridStyle,
  timelineLegendItemStyle,
  timelineLegendDotStyle,
  timelineLegendRangeStyle,
  timelineMonitoringHorizontalCardStyle,
  timelineLegendHorizontalCardStyle,
  timelineActionsStyle,
  timelineActionButtonStyle,
  timelineMobileActionButtonStyle,
  timelineModeTabsStyle,
  timelineModeButtonStyle,
  timelineModeTabsMobileStyle,
  timelineMobileModeButtonStyle,
  timelineRainLayoutStyle,
  timelineDateGridStyle,
  timelineDateLabelStyle,
  timelineDateInputStyle,
  timelinePrimaryButtonStyle,
  timelineRainGridStyle,
  timelineRainMetricStyle,
  timelineRainMapStyle,
  talhaoHubStyle,
  talhaoMapColumnStyle,
  talhaoMapHeaderStyle,
  talhaoDecisionPanelStyle,
  emptyTalhaoPanelStyle,
  talhaoStatusBadgeStyle,
  talhaoKpiGridStyle,
  talhaoMiniKpiStyle,
  talhaoActionGridStyle,
  talhaoInsightBoxStyle,
  metricGridStyle,
  dashboardGridStyle,
  metricCardStyle,
  smartCardStyle,
  smartBadgeStyle,
  smartInsightRowStyle,
  smartDotStyle,
  smartActionStyle,
  monitoringGridStyle,
  monitoringActionGridStyle,
  gpsStatusStyle,
  gpsCanvasStyle,
  gpsPathLineStyle,
  gpsPointStyle,
  gpsTableStyle,
  gpsRowStyle,
  pieChartStyle,
  pieHoleStyle,
  primaryActionStyle,
  secondaryActionStyle,
  primaryHeaderButtonStyle,
  smallButtonStyle,
  iconButtonStyle,
  inputStyle,
  formLabelStyle,
  dateFilterGroupStyle,
  dateLabelStyle,
  dateInputStyle,
  mapShellStyle,
  mapToolbarStyle,
  mapPillActiveStyle,
  mapPillStyle,
  interpolationMapStyle,
  soilResultsShellStyle,
  soilNutrientRowStyle,
  scoutingMapStyle,
  plotShapeStyle,
  legendStyle,
  gradientBarStyle,
  managementPageStyle,
  managementHeroStyle,
  managementHeroCompactStyle,
  managementWorkspaceDesktopStyle,
  managementWorkspaceSingleStyle,
  managementWorkspaceMobileStyle,
  managementWorkspaceCompactStyle,
  managementNavRailStyle,
  managementNavRailMobileStyle,
  managementNavRailCompactStyle,
  managementNavGroupStyle,
  managementNavGroupCompactStyle,
  managementNavItemStyle,
  managementNavItemCompactStyle,
  managementNavLabelStyle,
  managementNavLabelCompactStyle,
  managementNavHintStyle,
  managementModuleContentStyle,
  managementMenuGridStyle,
  managementMenuCardStyle,
  managementContentPanelStyle,
  managementSummaryStripStyle,
  managementSummaryCardStyle,
  managementSummaryIconStyle,
  managementSummaryTextStyle,
  managementSummaryLabelStyle,
  managementSummaryValueStyle,
  managementPlaceholderGridStyle,
  managementPlaceholderCardStyle,
  farmConfigGridStyle,
  farmConfigFieldStyle,
  managerGridStyle,
  managerCardStyle,
  reportButtonStyle,
  reportPreviewStyle,
  reportCoverArtStyle,
  mapManagerShellStyle,
  mapSideMenuStyle,
  managerBreadcrumbRowStyle,
  managerBreadcrumbStyle,
  managerBreadcrumbSepStyle,
  managerMapActionsStyle,
  managerMapStageStyle,
  mapOverlayToolsStyle,
  mapToolButtonStyle,
  mapCounterStyle,
  mapRefreshButtonStyle,
  modalOverlayStyle,
  geoModalStyle,
  geoModalHeaderStyle,
  geoModalBodyStyle,
  geoModeMenuStyle,
  geoModeButtonStyle,
  geoModeButtonActiveStyle,
  geoRuleBoxStyle,
  emptyGeoStateStyle,
  drawToolsStyle,
  kmlDropStyle,
  geoFormStyle,
  formErrorStyle,
  simpleMapStyle,
  simpleMapFullStyle,
  leafletMapCanvasStyle,
  satelliteTileLayerStyle,
  satelliteTileStyle,
  satelliteShadeStyle,
  rainInterpolationLayerStyle,
  rainInterpolationSpotStyle,
  satelliteSvgStyle,
  satelliteControlsStyle,
  satelliteControlsMobileStyle,
  satelliteControlButtonStyle,
  satelliteGpsButtonStyle,
  satelliteBadgeStyle,
  mapDrawHintStyle,
  mapEmptyHintStyle,
  pluviometerShellStyle,
  pluviometerHeaderStyle,
  pluviometerMapStageStyle,
  pluviometerEditorStyle,
  pluviometerEditorActionsStyle,
  pluviometerCoordGridStyle,
  pluviometerHintStyle,
  pluviometerEditorFooterStyle,
  dangerGhostButtonStyle,
  rainMapFrameStyle,
  rainEmptyOverlayStyle
} from './FazendaDetalhe/styles'

const C = theme.normal

export function FazendaDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('mapa')
  const [activeManager, setActiveManager] = useState('talhoes')
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
  const [monitoramentosResumo, setMonitoramentosResumo] = useState({})
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
    try {
      const monitoramentosData = await listarUltimosMonitoramentos((ts || []).map(t => t.id))
      setMonitoramentosResumo(indexMonitoramentosByTalhao(monitoramentosData))
    } catch {
      setMonitoramentosResumo({})
    }
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
  const talhoesSemMonitoramento = talhoes.filter(talhao => {
    const status = getMonitoramentoMeta(monitoramentosResumo[talhao.id]).status
    return status === 'late' || status === 'never'
  }).length
  const isMapView = activeView === 'mapa'
  const isDesktopShell = useMediaQuery('(min-width: 980px)')
  const showDesktopShell = isDesktopShell && !isMapView

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgSoft }}>
        <p style={{ color: C.textDim, fontFamily: 'monospace' }}>CARREGANDO...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: isMapView ? '#102316' : C.bg, display: 'flex', flexDirection: 'column' }}>
      <header style={showDesktopShell ? desktopTopbarStyle : floatingHeaderStyle}>
        {showDesktopShell && (
          <>
            <div style={desktopTopbarBrandStyle}>
              <button onClick={() => setMenuOpen(open => !open)} style={desktopMenuButtonStyle} aria-label="Abrir menu">
                <DesktopIcon name="menu" size={24} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={desktopTopbarEyebrowStyle}>FAZENDA</p>
                <h1 style={desktopTopbarTitleStyle}>{fazenda?.nome}</h1>
              </div>
            </div>
            <div style={desktopTopbarActionsStyle}>
              <button type="button" style={desktopUtilityButtonStyle} aria-label="Notificacoes">
                <DesktopIcon name="bell" size={20} />
              </button>
              <button type="button" style={desktopUtilityButtonStyle} aria-label="Ajuda">
                <DesktopIcon name="help" size={20} />
              </button>
              <button type="button" style={desktopAvatarButtonStyle}>AG</button>
              <button type="button" style={desktopChevronButtonStyle} aria-label="Abrir perfil">
                <DesktopIcon name="chevron-down" size={18} />
              </button>
            </div>
          </>
        )}
        <div style={{ display: showDesktopShell ? 'none' : 'flex', alignItems: 'center', gap: isMapView ? 0 : 8 }}>
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

      <main style={{ flex: 1, width: '100%', maxWidth: isMapView ? 'none' : (showDesktopShell ? 'none' : 1360), margin: showDesktopShell ? 0 : '0 auto', padding: isMapView ? 0 : (showDesktopShell ? 0 : 16), paddingTop: isMapView ? 0 : (showDesktopShell ? 76 : 98) }}>
        <div style={showDesktopShell ? farmLayoutDesktopStyle : farmLayoutStyle}>
          {showDesktopShell && (
            <FarmDesktopSidebar
              activeView={activeView}
              setActiveView={setActiveView}
              activeManager={activeManager}
              setActiveManager={setActiveManager}
              fazenda={fazenda}
              total={total}
              talhoes={talhoes}
              navigate={navigate}
            />
          )}
          <section style={showDesktopShell ? farmContentDesktopStyle : { flex: 1, minWidth: 0 }}>
        {activeView === 'mapa' && (
          <FazendaMapaPrincipal
            fazenda={fazenda}
            talhoes={talhoes}
            pluviometros={pluviometros}
            monitoramentosResumo={monitoramentosResumo}
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
            fazenda={fazenda}
            talhoes={talhoes}
            talhaoSel={talhaoSel}
            operacoes={operacoes}
            custos={custos}
            total={total}
            totalCusto={totalCusto}
            fazendaId={id}
            pluviometros={pluviometros}
            pluviometrosErro={pluviometrosErro}
            activeManager={activeManager}
            setActiveManager={setActiveManager}
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
            fazendaId={id}
            talhao={talhaoSel}
            onBack={async () => { try { await carregar() } finally { setActiveView('mapa') } }}
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


function MapaCadastroTalhoes({ talhoes, total, onOpenCadastro, onSelectTalhao }) {
  const features = talhoes.map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) })).filter(item => item.feature)

  return (
    <div style={mapManagerShellStyle}>
      <div style={managerBreadcrumbRowStyle}>
        <div style={managerBreadcrumbStyle}>
          <DesktopIcon name="home" size={20} />
          <span style={managerBreadcrumbSepStyle}>{'>'}</span>
          <span>Talhoes georreferenciados</span>
          <span style={managerBreadcrumbSepStyle}>{'>'}</span>
          <strong>Mapa da fazenda</strong>
        </div>
        <div style={managerMapActionsStyle}>
          <span style={mapCounterStyle}>{talhoes.length} talhoes</span>
          <button type="button" style={mapRefreshButtonStyle} aria-label="Atualizar mapa">
            <DesktopIcon name="refresh" size={19} />
          </button>
        </div>
      </div>

      <div style={managementSummaryStripStyle}>
        <div style={managementSummaryCardStyle}>
          <span style={managementSummaryIconStyle}><DesktopIcon name="map" size={25} /></span>
          <div style={managementSummaryTextStyle}>
            <span style={managementSummaryLabelStyle}>Area total</span>
            <strong style={managementSummaryValueStyle}>{Number(total || 0).toFixed(2)} ha</strong>
          </div>
        </div>
        <div style={managementSummaryCardStyle}>
          <span style={managementSummaryIconStyle}><DesktopIcon name="dashboard" size={24} /></span>
          <div style={managementSummaryTextStyle}>
            <span style={managementSummaryLabelStyle}>Talhoes</span>
            <strong style={managementSummaryValueStyle}>{talhoes.length}</strong>
          </div>
        </div>
        <div style={managementSummaryCardStyle}>
          <span style={managementSummaryIconStyle}><DesktopIcon name="soil" size={25} /></span>
          <div style={managementSummaryTextStyle}>
            <span style={managementSummaryLabelStyle}>Com geometria</span>
            <strong style={managementSummaryValueStyle}>{features.length}</strong>
          </div>
        </div>
      </div>

      <div style={managerMapStageStyle}>
        <div style={mapOverlayToolsStyle}>
          <button onClick={() => onOpenCadastro('draw')} style={mapToolButtonStyle}>
            <DesktopIcon name="pencil" size={24} />
            <span>Desenhar</span>
          </button>
          <button onClick={() => onOpenCadastro('kml')} style={mapToolButtonStyle}>
            <DesktopIcon name="upload" size={24} />
            <span>Importar<br />KML</span>
          </button>
          <button onClick={() => onOpenCadastro()} style={mapToolButtonStyle}>
            <DesktopIcon name="plus-circle" size={24} />
            <span>Cadastro</span>
          </button>
        </div>
        <SimpleFarmMap
          features={features.map(item => ({ ...item.feature, properties: { ...item.feature.properties, codigo: item.talhao.codigo } }))}
          height={430}
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

function GerencialView({ fazenda, fazendaId, talhoes, pluviometros = [], pluviometrosErro = '', total, abrirTalhao, setShowNovo, onCreatePluviometro, onUpdatePluviometro, onDeletePluviometro, activeManager, setActiveManager, navigate }) {
  const isManagerDesktop = useMediaQuery('(min-width: 900px)')
  const isManagerCompact = useMediaQuery('(max-width: 700px)')
  const managementMenu = [
    { id: 'talhoes', title: 'Cadastro de Talhao', short: 'Talhoes', text: 'Areas, culturas, fases e limites dos talhoes' },
    { id: 'pluviometros', title: 'Pluviometros', short: 'Chuva', text: 'Pontos georreferenciados e chuva interpolada' },
    { id: 'estoque', title: 'Estoque', short: 'Estoque', text: 'Saldos, entradas, saidas e estoque minimo' },
    { id: 'equipe', title: 'Equipe', short: 'Equipe', text: 'Tecnicos, operadores e responsaveis' },
    { id: 'insumos', title: 'Insumos', short: 'Insumos', text: 'Produtos, doses, custo medio e fornecedores' },
    { id: 'safras', title: 'Safras e Culturas', short: 'Safras', text: 'Ciclo agricola, variedades e metas' },
    { id: 'maquinas', title: 'Maquinas e Implementos', short: 'Maquinas', text: 'Frota, capacidade e custo hora' },
    { id: 'custos', title: 'Centros de Custo', short: 'Custos', text: 'Custos por fazenda, safra e atividade' },
    { id: 'produtividade', title: 'Historico de Produtividade', short: 'Produtividade', text: 'Safras, rendimento e comparativos' },
    { id: 'configuracao', title: 'Configuracao da Fazenda', short: 'Config.', text: 'Nome, municipio, usuarios e preferencias' }
  ]
  const managementGroups = [
    { title: 'Campo', ids: ['talhoes', 'pluviometros', 'safras'] },
    { title: 'Operacao', ids: ['estoque', 'equipe', 'insumos', 'maquinas'] },
    { title: 'Gestao', ids: ['custos', 'produtividade', 'configuracao'] }
  ].map(group => ({
    ...group,
    items: group.ids.map(itemId => managementMenu.find(item => item.id === itemId)).filter(Boolean)
  }))
  const activeItem = managementMenu.find(item => item.id === activeManager) || managementMenu[0]

  return (
    <section style={managementPageStyle}>
      <div style={isManagerCompact ? managementHeroCompactStyle : managementHeroStyle}>
        <p style={eyebrowStyle}>GESTAO OPERACIONAL</p>
        <h2 style={viewTitleStyle}>Gerenciamento da fazenda</h2>
        {!isManagerCompact && <p style={viewSubtitleStyle}>Cadastros administrativos, mapas, equipe, estoque e configuracoes da propriedade.</p>}
      </div>

      <div style={isManagerDesktop ? managementWorkspaceSingleStyle : (isManagerCompact ? managementWorkspaceCompactStyle : managementWorkspaceMobileStyle)}>
        {!isManagerDesktop && (
        <aside style={isManagerCompact ? managementNavRailCompactStyle : managementNavRailMobileStyle}>
          {managementGroups.map(group => (
            <div key={group.title} style={isManagerCompact ? managementNavGroupCompactStyle : managementNavGroupStyle}>
              {!isManagerCompact && <p style={desktopNavGroupTitleStyle}>{group.title.toUpperCase()}</p>}
              {group.items.map(item => {
                const active = activeManager === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveManager(item.id)}
                    style={{
                      ...(isManagerCompact ? managementNavItemCompactStyle : managementNavItemStyle),
                      background: active ? C.greenLight : C.bg,
                      borderColor: active ? C.greenDp : C.border,
                      color: active ? C.textDk : C.textMid
                    }}
                  >
                    <strong style={isManagerCompact ? managementNavLabelCompactStyle : managementNavLabelStyle}>{isManagerCompact ? item.short : item.title}</strong>
                    {!isManagerCompact && <small style={managementNavHintStyle}>{item.text}</small>}
                  </button>
                )
              })}
            </div>
          ))}
        </aside>
        )}

        <div style={managementModuleContentStyle}>
          {activeManager === 'talhoes' && (
            <MapaCadastroTalhoes talhoes={talhoes} total={total} onOpenCadastro={setShowNovo} onSelectTalhao={abrirTalhao} />
          )}

          {activeManager === 'pluviometros' && (
            <PluviometroManager
              fazendaId={fazendaId}
              talhoes={talhoes}
              pluviometros={pluviometros}
              pluviometrosErro={pluviometrosErro}
              onCreate={onCreatePluviometro}
              onUpdate={onUpdatePluviometro}
              onDelete={onDeletePluviometro}
            />
          )}

          {activeManager === 'configuracao' && (
            <ConfiguracaoFazendaPanel fazenda={fazenda} talhoes={talhoes} total={total} />
          )}

          {!['talhoes', 'pluviometros', 'configuracao'].includes(activeManager) && (
            <ManagementModulePanel item={activeItem} navigate={navigate} />
          )}
        </div>
      </div>
    </section>
  )
}

