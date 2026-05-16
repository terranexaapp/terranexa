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

function FarmDesktopSidebar({ activeView, setActiveView, activeManager, setActiveManager, navigate }) {
  function openItem(item) {
    if (item.manager) setActiveManager(item.manager)
    setActiveView(item.view)
  }

  return (
    <aside style={farmDesktopSidebarStyle}>
      <div style={desktopSidebarGroupsStyle}>
        {DESKTOP_NAV_GROUPS.map(group => (
          <div key={group.title} style={desktopNavGroupStyle}>
            <p style={desktopNavGroupTitleStyle}>{group.title.toUpperCase()}</p>
            {group.items.map(item => {
              const active = item.manager ? activeView === 'gerencial' && activeManager === item.manager : activeView === item.view
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openItem(item)}
                  style={{
                    ...desktopNavButtonStyle,
                    background: active ? C.greenLight : C.bg,
                    borderColor: active ? C.greenDp : 'transparent',
                    color: active ? C.textDk : C.textMid,
                    boxShadow: active ? `inset 4px 0 0 ${C.greenDp}` : 'none'
                  }}
                >
                  <span style={{
                    ...desktopNavIconStyle,
                    color: active ? C.greenDp : C.textDk
                  }}>
                    <DesktopIcon name={item.icon} size={23} />
                  </span>
                  <span style={desktopNavTextStyle}>
                    <strong style={desktopNavLabelStyle}>{item.label}</strong>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={desktopSidebarFooterStyle}>
        <button type="button" onClick={() => navigate('/')} style={desktopSidebarReturnStyle}>{'<'} Recolher menu</button>
      </div>
    </aside>
  )
}

function FazendaMapaPrincipal({ fazenda, talhoes, pluviometros = [], monitoramentosResumo = {}, talhaoSel, operacoes, custos, totalCusto, loadOps, alternarTalhao, navigate, setActiveView, setShowNovaOp }) {
  const timelineIsDocked = useMediaQuery('(min-width: 900px)')
  const devicePosition = useDevicePosition(!timelineIsDocked)
  const [timelineMode, setTimelineMode] = useState('resumo')
  const [chuvaInicio, setChuvaInicio] = useState('2026-05-01')
  const [chuvaFim, setChuvaFim] = useState('2026-05-15')
  const features = talhoes.map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) })).filter(item => item.feature)
  const selected = talhaoSel || null
  const selectedMonitoring = getMonitoramentoMeta(selected ? monitoramentosResumo[selected.id] : null)
  const mapFeatures = features.map(item => {
    const monitoramento = getMonitoramentoMeta(monitoramentosResumo[item.talhao.id])
    return {
      ...item.feature,
      properties: {
        ...item.feature.properties,
        codigo: item.talhao.codigo,
        monitoramento
      }
    }
  })
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
      { data: 'Hoje', titulo: 'Sem operacoes', status: 'Pendente', valor: 'Adicionar registro' },
      { data: 'Proximo passo', titulo: 'Monitoramento', status: 'Aberta', valor: 'Scouting' },
      { data: 'Proximo passo', titulo: 'Ordem servico', status: 'Aberta', valor: 'Planejar' }
    ]

  async function handleFeatureClick(index) {
    const talhao = features[index]?.talhao
    if (!talhao) return
    if (talhaoSel?.id !== talhao.id && timelineMode !== 'monitoramento') setTimelineMode(timelineIsDocked ? 'resumo' : 'historico')
    await alternarTalhao(talhao)
  }

  async function abrirMonitoramento() {
    await requestOfflineStorage()
    setActiveView('monitoramento')
  }

  return (
    <section style={timelineIsDocked ? mapMainPageStyle : mapMainPageMobileStyle}>
      <SimpleFarmMap
        features={mapFeatures}
        height={timelineIsDocked ? '100vh' : '100dvh'}
        fullBleed
        selectedCode={selected?.codigo}
        selectedMode={timelineMode === 'chuvas' ? 'chuvas' : timelineMode === 'monitoramento' ? 'monitoramento' : 'timeline'}
        pluviometros={[]}
        devicePosition={devicePosition}
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
          <div style={timelineIsDocked ? timelineHeaderStyle : timelineHeaderMobileStyle}>
            <div>
              <p style={timelineIsDocked ? eyebrowStyle : timelineMobileEyebrowStyle}>{timelineIsDocked ? 'TALHAO SELECIONADO' : 'TALHAO'}</p>
              <h3 style={timelineIsDocked ? timelineTitleStyle : timelineMobileTitleStyle}>{selected.codigo} · {formatCultura(selected.cultura)}</h3>
            </div>
            <span style={timelineAreaPillStyle}>{Number(selected.area_ha || 0).toFixed(2)} ha</span>
          </div>
          <div style={timelineActionsStyle}>
            <button onClick={abrirMonitoramento} style={timelineIsDocked ? timelineActionButtonStyle : timelineMobileActionButtonStyle}>Monitorar</button>
            <button onClick={() => navigate('/os')} style={timelineIsDocked ? timelineActionButtonStyle : timelineMobileActionButtonStyle}>Criar ordem</button>
          </div>
          <div style={timelineIsDocked ? timelineModeTabsStyle : timelineModeTabsMobileStyle}>
            {[
              ['resumo', 'Resumo'],
              ['monitoramento', 'Monitoramento'],
              ['historico', 'Historico'],
              ['chuvas', 'Chuvas'],
              ['solo', 'Solo']
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTimelineMode(id)}
                style={{
                  ...(timelineIsDocked ? timelineModeButtonStyle : timelineMobileModeButtonStyle),
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
            timelineIsDocked ? (
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
            ) : (
              <div style={timelineTableHorizontalStyle}>
                {resumoRows.map(item => (
                  <div key={item.label} style={timelineInfoHorizontalCardStyle}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
                <button onClick={() => setShowNovaOp(true)} style={timelineCtaHorizontalStyle}>{operacoes.length ? 'Nova operacao' : 'Adicionar registro'}</button>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            )
          )}
          {timelineMode === 'monitoramento' && (
            timelineIsDocked ? (
              <div style={timelineSummaryCardStyle}>
                <h4 style={timelineCardTitleStyle}>Dias sem monitoramento</h4>
                <div style={{ ...timelineMonitoringStatusStyle, borderColor: selectedMonitoring.color }}>
                  <span style={timelineSummaryLabelStyle}>Talhao selecionado</span>
                  <strong style={{ ...timelineSummaryValueStyle, fontSize: 16, color: selectedMonitoring.color }}>{selectedMonitoring.title}</strong>
                  <small style={{ color: C.textMid, fontWeight: 800 }}>{selectedMonitoring.detail}</small>
                </div>
                <div style={timelineLegendGridStyle}>
                  {MONITORAMENTO_LEGEND.map(item => (
                    <div key={item.key} style={timelineLegendItemStyle}>
                      <span style={{ ...timelineLegendDotStyle, background: item.color }} />
                      <strong>{item.title}</strong>
                      <small style={timelineLegendRangeStyle}>{item.range}</small>
                    </div>
                  ))}
                </div>
                <button onClick={abrirMonitoramento} style={timelineTextButtonStyle}>Registrar monitoramento</button>
              </div>
            ) : (
              <div style={timelineTableHorizontalStyle}>
                <div style={{ ...timelineMonitoringHorizontalCardStyle, borderColor: selectedMonitoring.color }}>
                  <span>Talhao selecionado</span>
                  <strong style={{ color: selectedMonitoring.color }}>{selectedMonitoring.title}</strong>
                  <small>{selectedMonitoring.detail}</small>
                </div>
                {MONITORAMENTO_LEGEND.map(item => (
                  <div key={item.key} style={timelineLegendHorizontalCardStyle}>
                    <span style={{ ...timelineLegendDotStyle, background: item.color }} />
                    <strong>{item.title}</strong>
                    <small style={timelineLegendRangeStyle}>{item.range}</small>
                  </div>
                ))}
                <button onClick={abrirMonitoramento} style={timelineCtaHorizontalStyle}>Registrar visita</button>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            )
          )}
          {timelineMode === 'historico' && (
            <div style={timelineIsDocked ? timelineTableDesktopStyle : timelineTableHorizontalStyle}>
              {timeline.map((item, index) => (
                <button key={`${item.data}-${item.titulo}-${index}`} style={timelineIsDocked ? timelineCellStyle : timelineCellHorizontalStyle}>
                  <span>{item.data}</span>
                  <strong>{item.titulo}</strong>
                  <em>{item.status}</em>
                  <small>{item.valor}</small>
                </button>
              ))}
              {!timelineIsDocked && <div aria-hidden="true" style={timelineScrollEndStyle} />}
            </div>
          )}
          {timelineMode === 'chuvas' && (
            timelineIsDocked ? (
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
            ) : (
              <div style={timelineTableHorizontalStyle}>
                <label style={timelineInputHorizontalCardStyle}>
                  <span>Data inicial</span>
                  <input type="date" value={chuvaInicio} onChange={e => setChuvaInicio(e.target.value)} style={timelineDateInputStyle} />
                </label>
                <label style={timelineInputHorizontalCardStyle}>
                  <span>Data final</span>
                  <input type="date" value={chuvaFim} onChange={e => setChuvaFim(e.target.value)} style={timelineDateInputStyle} />
                </label>
                <button onClick={() => setActiveView('chuvas')} style={timelineCtaHorizontalStyle}>Abrir mapa de chuvas</button>
                <div style={timelineMetricHorizontalCardStyle}><span>Acumulado</span><strong>{chuvaAcumulada} mm</strong></div>
                <div style={timelineMetricHorizontalCardStyle}><span>Media diaria</span><strong>{chuvaMediaDia} mm</strong></div>
                <div style={timelineMetricHorizontalCardStyle}><span>Maior chuva</span><strong>{maiorChuva} mm</strong></div>
                <div style={timelineMetricHorizontalCardStyle}><span>Menor chuva</span><strong>{menorChuva} mm</strong></div>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            )
          )}
          {timelineMode === 'solo' && (
            timelineIsDocked ? (
              <div style={timelineSummaryCardStyle}>
                <h4 style={timelineCardTitleStyle}>Solo do talhao</h4>
                <div style={timelineSummaryRowsStyle}>
                  <div style={timelineSummaryRowStyle}><span style={timelineSummaryLabelStyle}>Camada atual</span><strong style={timelineSummaryValueStyle}>Mapa de solo disponivel</strong></div>
                  <div style={timelineSummaryRowStyle}><span style={timelineSummaryLabelStyle}>Fertilidade</span><strong style={timelineSummaryValueStyle}>Aguardando leitura recente</strong></div>
                  <div style={timelineSummaryRowStyle}><span style={timelineSummaryLabelStyle}>Recomendacao</span><strong style={timelineSummaryValueStyle}>Conferir pagina Solo</strong></div>
                </div>
                <button onClick={() => setActiveView('solo')} style={timelineTextButtonStyle}>Abrir pagina Solo</button>
              </div>
            ) : (
              <div style={timelineTableHorizontalStyle}>
                <div style={timelineInfoHorizontalCardStyle}><span>Camada atual</span><strong>Mapa de solo disponivel</strong></div>
                <div style={timelineInfoHorizontalCardStyle}><span>Fertilidade</span><strong>Aguardando leitura recente</strong></div>
                <div style={timelineInfoHorizontalCardStyle}><span>Recomendacao</span><strong>Conferir pagina Solo</strong></div>
                <button onClick={() => setActiveView('solo')} style={timelineCtaHorizontalStyle}>Abrir Solo</button>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            )
          )}
        </div>
      )}
    </section>
  )
}

function MonitoramentoRegistroView({ fazenda, fazendaId, talhao, onBack }) {
  const [points, setPoints] = useState([])
  const [tracking, setTracking] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('Aguardando GPS')
  const [storageStatus, setStorageStatus] = useState('Preparando modo offline')
  const watchRef = useRef(null)
  const monitoramentoIdRef = useRef(null)
  const monitoramentoCreateRef = useRef(null)

  useEffect(() => {
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  useEffect(() => {
    monitoramentoIdRef.current = null
    monitoramentoCreateRef.current = null
    setPoints([])
  }, [talhao?.id])

  useEffect(() => {
    let active = true
    requestOfflineStorage().then(result => {
      if (active) setStorageStatus(result.message)
    })
    if (navigator.geolocation) {
      setGpsStatus('Solicitando permissao do GPS...')
      navigator.geolocation.getCurrentPosition(
        position => { if (active) addPosition(position, 'Posicao atual') },
        error => { if (active) setGpsStatus(error.message || 'Permissao de GPS pendente') },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      )
    } else {
      setGpsStatus('GPS indisponivel neste navegador')
    }
    return () => { active = false }
  }, [talhao?.id])

  async function ensureRemoteMonitoring() {
    if (!talhao?.id) return null
    if (monitoramentoIdRef.current) return monitoramentoIdRef.current
    if (!monitoramentoCreateRef.current) {
      monitoramentoCreateRef.current = criarMonitoramento({
        talhao_id: talhao.id,
        observacoes: 'Monitoramento georreferenciado pelo app TerraNexa'
      }).then(registro => {
        monitoramentoIdRef.current = registro.id
        return registro.id
      }).finally(() => {
        monitoramentoCreateRef.current = null
      })
    }
    return monitoramentoCreateRef.current
  }

  async function addPosition(position, tipo) {
    const coords = position.coords || {}
    const lat = Number(coords.latitude)
    const lng = Number(coords.longitude)
    const registro = {
      tipo,
      lat,
      lng,
      precisao: coords.accuracy,
      hora: new Date().toLocaleString('pt-BR')
    }
    saveMonitoringPointOffline(registro, {
      fazendaId,
      fazendaNome: fazenda?.nome || '',
      talhaoId: talhao?.id || null,
      talhaoCodigo: talhao?.codigo || ''
    })
    setPoints(current => [...current, registro])
    setGpsStatus('Ponto registrado')
    if (!talhao?.id || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    try {
      const monitoramentoId = await ensureRemoteMonitoring()
      if (monitoramentoId) {
        await criarMonitoramentoPonto({
          monitoramento_id: monitoramentoId,
          tipo,
          latitude: lat,
          longitude: lng,
          precisao_m: coords.accuracy
        })
        setStorageStatus('Ponto sincronizado com a fazenda')
      }
    } catch {
      setStorageStatus('Ponto salvo offline; sincronizacao pendente')
    }
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
            <span>{storageStatus}</span>
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
                Cadastre pluviometros na pagina Gerenciamento para gerar a camada interpolada.
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

function SimpleFarmMap({ features = [], drawPoints = [], onMapClick, onFeatureClick, height = 340, drawing = false, selectedCode = null, selectedMode = 'timeline', fullBleed = false, pluviometros = [], placingPluviometro = false, onMapPoint, onPluviometroClick, devicePosition = null }) {
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

  function resetMap(e) {
    e.stopPropagation()
    if (!mapRef.current || !window.L) return
    fitLeafletToFeatures(window.L, mapRef.current, normalized, fullBleed)
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
      {!leafletError && normalized.length === 0 && <div style={mapEmptyHintStyle}>Nenhum talhÃƒÂ£o com geometria cadastrada</div>}
    </div>
  )
}

function SatelliteFarmMap({ normalized = [], onFeatureClick, height = 340, selectedCode = null, selectedMode = 'timeline', fullBleed = false, pluviometros = [], placingPluviometro = false, onMapPoint, onPluviometroClick, devicePosition = null }) {
  const containerRef = useRef(null)
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)
  const tapRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState(() => getSatelliteInitialView(normalized.map(item => item.feature), { width: 0, height: 0 }, fullBleed))
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
    if (!size.width || !size.height) return { tiles: [], topLeft: { x: 0, y: 0 }, zoom: view.zoom, scale: 1 }
    const displayZoom = clamp(view.zoom, TILE_MIN_ZOOM, TILE_MAX_ZOOM)
    const zoom = clamp(Math.floor(displayZoom), TILE_MIN_ZOOM, TILE_MAX_ZOOM)
    const scale = 2 ** (displayZoom - zoom)
    const center = lngLatToWorld([view.lng, view.lat], zoom)
    const topLeft = { x: center.x - size.width / (2 * scale), y: center.y - size.height / (2 * scale) }
    const minX = Math.floor(topLeft.x / TILE_SIZE) - 1
    const maxX = Math.floor((topLeft.x + size.width / scale) / TILE_SIZE) + 1
    const minY = Math.floor(topLeft.y / TILE_SIZE) - 1
    const maxY = Math.floor((topLeft.y + size.height / scale) / TILE_SIZE) + 1
    const tileCount = 2 ** zoom
    const tiles = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (y < 0 || y >= tileCount) continue
        const wrappedX = ((x % tileCount) + tileCount) % tileCount
        tiles.push({
          key: `${zoom}-${x}-${y}`,
          src: `${SATELLITE_TILE_URL}/${zoom}/${y}/${wrappedX}`,
          left: (x * TILE_SIZE - topLeft.x) * scale,
          top: (y * TILE_SIZE - topLeft.y) * scale,
          size: TILE_SIZE * scale
        })
      }
    }
    return { tiles, topLeft, zoom, scale }
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
    const world = screenToWorld(point, view)
    const [lng, lat] = worldToLngLat(world.x, world.y, view.zoom)
    return { lng, lat }
  }

  function coordScreenPosition(coord) {
    const world = lngLatToWorld(coord, tileLayer.zoom || view.zoom)
    return {
      x: (world.x - tileLayer.topLeft.x) * (tileLayer.scale || 1),
      y: (world.y - tileLayer.topLeft.y) * (tileLayer.scale || 1)
    }
  }

  function markerScreenPosition(marker) {
    return coordScreenPosition([marker.longitude, marker.latitude])
  }

  function rainIntensity(marker, index) {
    const seed = String(marker.id || marker.nome || index).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return 42 + (seed % 86)
  }

  function handleWheel(e) {
    e.preventDefault()
    const nextZoom = view.zoom - e.deltaY * 0.003
    zoomAt(pointFromEvent(e), nextZoom)
  }

  function handleDoubleClick(e) {
    e.preventDefault()
    zoomAt(pointFromEvent(e), view.zoom + 1)
  }

  function screenRingForFeature(feature) {
    return (getFeatureRing(feature) || []).map(coordScreenPosition)
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
      const nextZoom = clamp(gesture.startView.zoom + Math.log2(Math.max(0.35, ratio)), TILE_MIN_ZOOM, TILE_MAX_ZOOM)
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

  function centerDeviceMarker(marker) {
    setView(current => ({
      ...current,
      lat: marker.latitude,
      lng: marker.longitude,
      zoom: Math.max(current.zoom, 16)
    }))
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
    <div
      ref={containerRef}
      style={{ ...(fullBleed ? { ...simpleMapFullStyle, minHeight: height } : simpleMapStyle), height, cursor: placingPluviometro ? 'crosshair' : 'grab' }}
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
            style={{ ...satelliteTileStyle, width: tile.size, height: tile.size, transform: `translate3d(${tile.left}px, ${tile.top}px, 0)` }}
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
            const screen = coordScreenPosition(coord)
            return `${screen.x},${screen.y}`
          }).join(' ')
          const labelCoord = getRingLabelCoord(ring)
          const labelWorld = labelCoord ? coordScreenPosition(labelCoord) : null
          const selected = selectedCode && feature.properties?.codigo === selectedCode
          const monitoramento = feature.properties?.monitoramento || getMonitoramentoMeta(null)
          const monitoringFill = monitoramento.fill || 'rgba(138,144,112,0.52)'
          const monitoringStroke = monitoramento.stroke || 'rgba(230,230,215,0.74)'
          const selectedFill = selectedMode === 'chuvas' ? 'rgba(55,145,210,0.42)' : selectedMode === 'monitoramento' ? monitoringFill : 'rgba(232,168,76,0.40)'
          const baseFill = selectedMode === 'monitoramento' ? monitoringFill : 'rgba(46,124,42,0.26)'
          const baseStroke = selectedMode === 'monitoramento' ? monitoringStroke : 'rgba(255,255,255,0.70)'
          const labelSize = selected ? (fullBleed ? 11 : 10) : (fullBleed ? 9 : 8)
          return (
            <g key={`${feature.properties?.codigo || index}-${index}`} style={{ cursor: onFeatureClick ? 'pointer' : 'default' }}>
              <polygon points={points} fill={selected ? selectedFill : baseFill} stroke={selected ? 'rgba(255,255,255,0.96)' : baseStroke} strokeWidth={selected ? 1.4 : 0.8} />
              {labelWorld && (
                <text
                  x={labelWorld.x}
                  y={labelWorld.y}
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
        {deviceMarker && (() => {
          const pos = markerScreenPosition(deviceMarker)
          return (
            <g key="device-position" transform={`translate(${pos.x} ${pos.y})`}>
              <circle cx="0" cy="0" r="17" fill="rgba(47,145,255,0.20)" stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
              <circle cx="0" cy="0" r="7" fill="#2f91ff" stroke="white" strokeWidth="2" />
              <text x="0" y="27" fill="white" fontSize="9" fontWeight="900" textAnchor="middle" paintOrder="stroke" stroke="rgba(0,0,0,0.7)" strokeWidth="3">Voce</text>
            </g>
          )
        })()}
      </svg>
      <div style={controlsOnRight ? satelliteControlsMobileStyle : satelliteControlsStyle} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
        <button type="button" aria-label="Aproximar mapa" onClick={e => changeZoom(e, 1)} style={satelliteControlButtonStyle}>+</button>
        <button type="button" aria-label="Afastar mapa" onClick={e => changeZoom(e, -1)} style={satelliteControlButtonStyle}>-</button>
        {controlsOnRight && (
          <button type="button" aria-label="Centralizar no GPS" title="Centralizar no GPS" onClick={centerOnDevice} style={satelliteGpsButtonStyle}>
            {locatingDevice ? '...' : '⌖'}
          </button>
        )}
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

