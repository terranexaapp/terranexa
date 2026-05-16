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
import { ManagementModulePanel, ConfiguracaoFazendaPanel, RelatoriosView, CustosPanel } from './FazendaDetalhe/panels'
import {
  FarmDesktopSidebar,
  DashboardView,
  ScoutingView,
  MonitoramentoRegistroView,
  InterpolacaoView
} from './FazendaDetalhe/views'
import { SimpleFarmMap } from './FazendaDetalhe/maps'
import { FazendaMapaPrincipal } from './FazendaDetalhe/mapaPrincipal'
import { GerencialView } from './FazendaDetalhe/gerencial'
import { TalhaoGeoModal } from './FazendaDetalhe/talhaoGeoModal'
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

  useEffect(() => {
    carregar()
  }, [id])

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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bgSoft
        }}
      >
        <p style={{ color: C.textDim, fontFamily: 'monospace' }}>CARREGANDO...</p>
      </div>
    )
  }

  return (
    <div
      style={{ minHeight: '100vh', background: isMapView ? '#102316' : C.bg, display: 'flex', flexDirection: 'column' }}
    >
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
              <button type="button" style={desktopAvatarButtonStyle}>
                AG
              </button>
              <button type="button" style={desktopChevronButtonStyle} aria-label="Abrir perfil">
                <DesktopIcon name="chevron-down" size={18} />
              </button>
            </div>
          </>
        )}
        <div style={{ display: showDesktopShell ? 'none' : 'flex', alignItems: 'center', gap: isMapView ? 0 : 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMapView ? 0 : 8 }}>
            <button onClick={() => setMenuOpen(open => !open)} style={hamburgerButtonStyle}>
              ☰
            </button>
            {!isMapView && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={eyebrowStyle}>FAZENDA</p>
                <h1
                  style={{
                    margin: '2px 0 0',
                    fontSize: 20,
                    color: C.textDk,
                    fontWeight: 700,
                    fontFamily: 'Georgia, serif'
                  }}
                >
                  {fazenda?.nome}
                </h1>
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
              <button onClick={() => setMenuOpen(false)} style={drawerCloseButtonStyle}>
                ×
              </button>
            </div>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id)
                  setMenuOpen(false)
                }}
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
                <span style={{ color: C.textMid, fontSize: 11 }}>
                  {Number(total || 0).toFixed(2)} ha · {talhoes.length} talhoes
                </span>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/')
                }}
                style={drawerReturnButtonStyle}
              >
                ← Voltar para Fazendas
              </button>
              <div style={drawerBrandStyle}>
                <Logo size={30} />
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: C.greenDp,
                      fontWeight: 900,
                      fontSize: 15,
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1
                    }}
                  >
                    Terra<span style={{ color: C.amber }}>Nexa</span>
                  </p>
                  <small style={{ color: C.textDim, fontSize: 8, fontFamily: 'monospace', letterSpacing: '1.4px' }}>
                    GESTAO AGRICOLA
                  </small>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isMapView ? 'none' : showDesktopShell ? 'none' : 1360,
          margin: showDesktopShell ? 0 : '0 auto',
          padding: isMapView ? 0 : showDesktopShell ? 0 : 16,
          paddingTop: isMapView ? 0 : showDesktopShell ? 76 : 98
        }}
      >
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
            {activeView === 'chuvas' && (
              <InterpolacaoView tipo="chuvas" talhoes={talhoes} total={total} pluviometros={pluviometros} />
            )}
            {activeView === 'solo' && (
              <InterpolacaoView tipo="solo" talhoes={talhoes} total={total} pluviometros={pluviometros} />
            )}
            {activeView === 'scouting' && (
              <ScoutingView talhoes={talhoes} talhaoSel={talhaoSel} abrirTalhao={abrirTalhao} />
            )}
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
                onBack={async () => {
                  try {
                    await carregar()
                  } finally {
                    setActiveView('mapa')
                  }
                }}
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
        <NovaOperacaoModal
          talhao={talhaoSel}
          fazendaId={id}
          onClose={() => setShowNovaOp(false)}
          onSaved={async () => {
            setShowNovaOp(false)
            await abrirTalhao(talhaoSel)
          }}
        />
      )}
    </div>
  )
}
