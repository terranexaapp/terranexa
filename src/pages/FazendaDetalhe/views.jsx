import { useEffect, useMemo, useRef, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  criarMonitoramento,
  criarMonitoramentoPonto,
  listarMonitoramentosFazenda,
  listarPontosFazenda,
  getSeveridadeInfo,
  ESCALAS_SEVERIDADE,
  TIPOS_PONTO
} from '../../lib/monitoramentos'
import { listarPragasDoencas } from '../../lib/pragasDoencas'
import { uploadFotoMonitoramento, getPublicUrl } from '../../lib/storage'
import { DESKTOP_NAV_GROUPS } from './constants'
import { DesktopIcon } from './DesktopIcon'
import { SimpleFarmMap } from './maps'
import { MetricCard, CustoPizzaCard, SmartInsightCard } from './sharedComponents'
import { formatCultura, normalizeFeature } from './utils'
import { requestOfflineStorage, saveMonitoringPointOffline } from './offline'
import {
  eyebrowStyle,
  panelStyle,
  panelTitleStyle,
  viewStackStyle,
  viewTitleStyle,
  viewSubtitleStyle,
  heroPanelStyle,
  primaryActionStyle,
  secondaryActionStyle,
  metricGridStyle,
  dashboardGridStyle,
  mapShellStyle,
  mapToolbarStyle,
  mapPillStyle,
  mapPillActiveStyle,
  monitoringGridStyle,
  monitoringActionGridStyle,
  inputStyle,
  formLabelStyle,
  gpsStatusStyle,
  gpsCanvasStyle,
  gpsPathLineStyle,
  gpsPointStyle,
  gpsTableStyle,
  gpsRowStyle,
  dateFilterGroupStyle,
  dateLabelStyle,
  dateInputStyle,
  rainMapFrameStyle,
  rainEmptyOverlayStyle,
  legendStyle,
  gradientBarStyle,
  soilResultsShellStyle,
  soilNutrientRowStyle,
  farmDesktopSidebarStyle,
  desktopSidebarGroupsStyle,
  desktopNavGroupStyle,
  desktopNavGroupTitleStyle,
  desktopNavButtonStyle,
  desktopNavIconStyle,
  desktopNavTextStyle,
  desktopNavLabelStyle,
  desktopSidebarFooterStyle,
  desktopSidebarReturnStyle
} from './styles'

const C = theme.normal

export function FarmDesktopSidebar({ activeView, setActiveView, activeManager, setActiveManager, navigate }) {
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
              const active = item.manager
                ? activeView === 'gerencial' && activeManager === item.manager
                : activeView === item.view
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
                  <span
                    style={{
                      ...desktopNavIconStyle,
                      color: active ? C.greenDp : C.textDk
                    }}
                  >
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
        <button type="button" onClick={() => navigate('/')} style={desktopSidebarReturnStyle}>
          {'<'} Recolher menu
        </button>
      </div>
    </aside>
  )
}

export function DashboardView({ total, talhoes, talhoesSemMonitoramento, navigate, setActiveView }) {
  const cards = [
    { label: 'Area monitorada', value: `${total.toFixed(2)} ha`, tone: C.greenDp },
    { label: 'Talhoes ativos', value: talhoes.length, tone: C.soilDk },
    {
      label: 'Alertas de monitoramento',
      value: talhoesSemMonitoramento,
      tone: talhoesSemMonitoramento > 0 ? C.redDk : C.greenDp
    }
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
      actionLabel: 'Ver monitoramento',
      onAction: () => setActiveView('monitoramento'),
      insights: [
        {
          label: 'Talhoes sem visita recente',
          value: `${talhoesSemMonitoramento}`,
          tone: talhoesSemMonitoramento > 0 ? 'danger' : 'ok'
        },
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
        {
          label: 'Cadastros pendentes',
          value: talhoes.length > 0 ? 'Talhoes cadastrados' : 'Cadastrar primeiro talhao',
          tone: talhoes.length > 0 ? 'ok' : 'danger'
        }
      ]
    }
  ]

  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>CENTRO DE DECISAO</p>
          <h2 style={viewTitleStyle}>Central dos talhões</h2>
          <p style={viewSubtitleStyle}>
            Mapa operacional da fazenda para selecionar talhões, abrir diagnósticos e acionar chuva, solo, scouting e
            ordens.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/os')} style={primaryActionStyle}>
            Criar Ordem de Serviço
          </button>
          <button onClick={() => setActiveView('relatorios')} style={secondaryActionStyle}>
            Gerar Relatório
          </button>
        </div>
      </div>

      <div style={metricGridStyle}>
        {cards.map(card => (
          <MetricCard key={card.label} {...card} />
        ))}
        <CustoPizzaCard />
      </div>

      <div style={dashboardGridStyle}>
        {smartCards.map(card => (
          <SmartInsightCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  )
}

export function MonitoramentoDashboardView({ fazendaId, talhoes, monitoramentosResumo, abrirTalhao, setActiveView }) {
  const [historicos, setHistoricos] = useState([])
  const [pontos, setPontos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [periodoDias, setPeriodoDias] = useState(30)

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const dataInicio = new Date(Date.now() - periodoDias * 86400000).toISOString().slice(0, 10)
      const [{ monitoramentos }, ptsArr] = await Promise.all([
        listarMonitoramentosFazenda(fazendaId, { dataInicio }),
        listarPontosFazenda(fazendaId, { dataInicio })
      ])
      setHistoricos(monitoramentos)
      setPontos(ptsArr)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar histórico de monitoramento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, periodoDias])

  const kpis = useMemo(() => {
    const ultimaVisita = historicos[0] || null
    const talhoesComMonitoramento = new Set(historicos.map(m => m.talhao_id)).size
    const talhoesEmAtraso = talhoes.filter(t => {
      const reg = monitoramentosResumo[t.id]
      if (!reg?.visitado_em) return true
      const dias = Math.floor((Date.now() - new Date(reg.visitado_em).getTime()) / 86400000)
      return dias > 10
    }).length
    const ocorrenciasCriticas = pontos.filter(p => ['severa', 'nde'].includes(p.severidade)).length
    return { ultimaVisita, talhoesComMonitoramento, talhoesEmAtraso, ocorrenciasCriticas }
  }, [historicos, pontos, talhoes, monitoramentosResumo])

  const talhoesMap = useMemo(() => new Map(talhoes.map(t => [t.id, t])), [talhoes])
  const visitasOrdenadas = useMemo(() => historicos.slice(0, 8), [historicos])

  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>MONITORAMENTO</p>
          <h2 style={viewTitleStyle}>Painel de monitoramento</h2>
          <p style={viewSubtitleStyle}>
            Visão consolidada das visitas a campo, ocorrências e talhões em atraso. Use o mapa principal pra iniciar
            uma nova visita.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setPeriodoDias(d)}
              style={periodoDias === d ? primaryActionStyle : secondaryActionStyle}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div
          style={{
            background: C.redLight,
            color: C.redDk,
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            border: `1px solid ${C.red}33`
          }}
        >
          {loadError}
        </div>
      )}

      <div style={metricGridStyle}>
        <MetricCard label="Talhões monitorados" value={kpis.talhoesComMonitoramento} tone={C.greenDp} />
        <MetricCard
          label="Talhões em atraso"
          value={kpis.talhoesEmAtraso}
          tone={kpis.talhoesEmAtraso > 0 ? C.redDk : C.greenDp}
        />
        <MetricCard label="Ocorrências críticas" value={kpis.ocorrenciasCriticas} tone={C.amberDk} />
        <MetricCard
          label="Última visita"
          value={
            kpis.ultimaVisita?.visitado_em
              ? new Date(kpis.ultimaVisita.visitado_em).toLocaleDateString('pt-BR')
              : 'Nenhuma'
          }
          tone={C.textDk}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)', gap: 14 }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <p style={eyebrowStyle}>STATUS POR TALHÃO</p>
              <h3 style={panelTitleStyle}>Quanto tempo cada talhão está sem visita</h3>
            </div>
            <button onClick={() => setActiveView('mapa')} style={secondaryActionStyle}>
              Abrir mapa
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {talhoes.length === 0 ? (
              <p style={{ color: C.textDim, fontSize: 12 }}>Nenhum talhão cadastrado.</p>
            ) : (
              talhoes.map(t => {
                const reg = monitoramentosResumo[t.id]
                const dias = reg?.visitado_em
                  ? Math.floor((Date.now() - new Date(reg.visitado_em).getTime()) / 86400000)
                  : null
                const tone = dias === null ? C.textDim : dias <= 5 ? C.greenDp : dias <= 10 ? C.amberDk : C.redDk
                const label = dias === null ? 'Nunca monitorado' : dias === 0 ? 'Hoje' : `${dias} dia(s)`
                return (
                  <button
                    key={t.id}
                    onClick={() => abrirTalhao(t)}
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{ width: 10, height: 10, borderRadius: 99, background: tone, flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ color: C.textDk, fontSize: 13, display: 'block' }}>
                          {t.codigo} · {formatCultura(t.cultura)}
                        </strong>
                        <span style={{ color: C.textMid, fontSize: 11 }}>
                          {Number(t.area_ha || 0).toFixed(2)} ha
                        </span>
                      </div>
                    </div>
                    <span style={{ color: tone, fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>{label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <aside style={panelStyle}>
          <p style={eyebrowStyle}>LINHA DO TEMPO</p>
          <h3 style={panelTitleStyle}>Últimas visitas ({periodoDias}d)</h3>
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {loading ? (
              <p style={{ color: C.textDim, fontFamily: 'monospace', fontSize: 11 }}>Carregando…</p>
            ) : visitasOrdenadas.length === 0 ? (
              <p style={{ color: C.textMid, fontSize: 12 }}>Nenhuma visita registrada no período.</p>
            ) : (
              visitasOrdenadas.map(v => {
                const t = talhoesMap.get(v.talhao_id)
                const sev = getSeveridadeInfo(v.severidade)
                const cor = sev?.cor || C.textMid
                return (
                  <div
                    key={v.id}
                    style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: 10, alignItems: 'flex-start' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: cor, marginTop: 4 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>
                        {new Date(v.visitado_em).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p style={{ margin: '2px 0 0', color: C.textDk, fontWeight: 800, fontSize: 13 }}>
                        Talhão {t?.codigo || '—'}
                      </p>
                      <p style={{ margin: '3px 0 0', color: C.textMid, fontSize: 12 }}>
                        {sev?.label || 'Sem severidade'}
                        {v.observacoes ? ` · ${v.observacoes.slice(0, 60)}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

export function MonitoramentoRegistroView({ fazenda, fazendaId, talhao, onBack }) {
  const [points, setPoints] = useState([])
  const [tracking, setTracking] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('Aguardando GPS')
  const [storageStatus, setStorageStatus] = useState('Preparando modo offline')
  const [catalogoPragas, setCatalogoPragas] = useState([])
  const [detailDraft, setDetailDraft] = useState(null) // { tipo, gps, draft, saving, error }
  const [uploading, setUploading] = useState(false)
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
        position => {
          if (active) addPosition(position, 'Posicao atual')
        },
        error => {
          if (active) setGpsStatus(error.message || 'Permissao de GPS pendente')
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      )
    } else {
      setGpsStatus('GPS indisponivel neste navegador')
    }
    return () => {
      active = false
    }
  }, [talhao?.id])

  async function ensureRemoteMonitoring() {
    if (!talhao?.id) return null
    if (monitoramentoIdRef.current) return monitoramentoIdRef.current
    if (!monitoramentoCreateRef.current) {
      monitoramentoCreateRef.current = criarMonitoramento({
        talhao_id: talhao.id,
        observacoes: 'Monitoramento georreferenciado pelo app TerraNexa'
      })
        .then(registro => {
          monitoramentoIdRef.current = registro.id
          return registro.id
        })
        .finally(() => {
          monitoramentoCreateRef.current = null
        })
    }
    return monitoramentoCreateRef.current
  }

  // Carrega o catálogo de pragas/doenças pra usar no modal de detalhes.
  useEffect(() => {
    if (!fazendaId) return
    listarPragasDoencas(fazendaId)
      .then(setCatalogoPragas)
      .catch(() => setCatalogoPragas([]))
  }, [fazendaId])

  async function addPosition(position, tipo, extras = {}) {
    const coords = position.coords || {}
    const lat = Number(coords.latitude)
    const lng = Number(coords.longitude)
    const registro = {
      tipo,
      lat,
      lng,
      precisao: coords.accuracy,
      hora: new Date().toLocaleString('pt-BR'),
      ...extras
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
          precisao_m: coords.accuracy,
          praga_doenca_id: extras.praga_doenca_id || null,
          estadio_fenologico: extras.estadio_fenologico || null,
          severidade: extras.severidade || null,
          percentual_dano: extras.percentual_dano,
          recomendacao: extras.recomendacao || null,
          foto_url: extras.foto_url || null,
          observacoes: extras.observacoes || null
        })
        setStorageStatus('Ponto sincronizado com a fazenda')
      }
    } catch {
      setStorageStatus('Ponto salvo offline; sincronizacao pendente')
    }
  }

  function capturarPonto(tipo = 'ponto') {
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

  function abrirDetalhes(tipo = 'ponto') {
    if (!navigator.geolocation) {
      setGpsStatus('GPS indisponivel neste navegador')
      return
    }
    setGpsStatus('Capturando GPS para detalhar...')
    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = position.coords || {}
        setGpsStatus('GPS pronto — preencha os detalhes')
        setDetailDraft({
          tipo,
          gps: {
            lat: Number(coords.latitude),
            lng: Number(coords.longitude),
            precisao: coords.accuracy
          },
          draft: {
            praga_doenca_id: '',
            estadio_fenologico: '',
            severidade: '',
            percentual_dano: '',
            recomendacao: '',
            observacoes: '',
            foto_file: null,
            foto_url: null
          },
          saving: false,
          error: ''
        })
      },
      error => setGpsStatus(error.message || 'Nao foi possivel capturar o GPS'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
  }

  function updateDetailDraft(patch) {
    setDetailDraft(curr => (curr ? { ...curr, draft: { ...curr.draft, ...patch }, error: '' } : curr))
  }

  async function handleFotoChange(file) {
    if (!file || !fazendaId) return
    setUploading(true)
    try {
      const result = await uploadFotoMonitoramento({ fazendaId, file })
      const url = getPublicUrl({ bucket: result.bucket, path: result.path }) || result.path
      updateDetailDraft({ foto_file: file, foto_url: url })
    } catch (err) {
      setDetailDraft(curr =>
        curr ? { ...curr, error: err.message || 'Nao foi possivel enviar a foto' } : curr
      )
    } finally {
      setUploading(false)
    }
  }

  async function confirmarDetalhes() {
    if (!detailDraft) return
    setDetailDraft(curr => (curr ? { ...curr, saving: true, error: '' } : curr))
    try {
      const fakePosition = {
        coords: {
          latitude: detailDraft.gps.lat,
          longitude: detailDraft.gps.lng,
          accuracy: detailDraft.gps.precisao
        }
      }
      const extras = {
        praga_doenca_id: detailDraft.draft.praga_doenca_id || null,
        estadio_fenologico: detailDraft.draft.estadio_fenologico || null,
        severidade: detailDraft.draft.severidade || null,
        percentual_dano: detailDraft.draft.percentual_dano ? Number(detailDraft.draft.percentual_dano) : null,
        recomendacao: detailDraft.draft.recomendacao || null,
        observacoes: detailDraft.draft.observacoes || null,
        foto_url: detailDraft.draft.foto_url || null
      }
      await addPosition(fakePosition, detailDraft.tipo, extras)
      setDetailDraft(null)
    } catch (err) {
      setDetailDraft(curr => (curr ? { ...curr, saving: false, error: err.message || 'Erro ao salvar' } : curr))
    }
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
          <p style={viewSubtitleStyle}>
            {fazenda?.nome}{' '}
            {talhao ? `· talhao ${talhao.codigo}` : '· selecione um talhao no mapa para registrar em campo'}
          </p>
        </div>
        <button onClick={onBack} style={secondaryActionStyle}>
          Voltar ao mapa
        </button>
      </div>

      <div style={monitoringGridStyle}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>TALHAO</p>
          <h3 style={{ margin: '5px 0 0', color: C.textDk, fontSize: 24, fontFamily: 'Georgia, serif' }}>
            {talhao?.codigo || 'Nenhum selecionado'}
          </h3>
          <p style={{ margin: '6px 0 0', color: C.textMid, fontSize: 13 }}>
            {talhao
              ? `${Number(talhao.area_ha || 0).toFixed(2)} ha · ${formatCultura(talhao.cultura)}`
              : 'Abra o mapa e clique em um talhao antes de iniciar.'}
          </p>

          <div style={monitoringActionGridStyle}>
            <button
              onClick={() => abrirDetalhes('ocorrencia')}
              disabled={!talhao}
              style={{ ...primaryActionStyle, opacity: talhao ? 1 : 0.5 }}
            >
              Registrar com detalhes
            </button>
            <button
              onClick={() => capturarPonto('ponto')}
              disabled={!talhao}
              style={{ ...secondaryActionStyle, opacity: talhao ? 1 : 0.5 }}
            >
              Ponto rápido
            </button>
            <button
              onClick={tracking ? finalizarCaminhamento : iniciarCaminhamento}
              disabled={!talhao}
              style={{ ...secondaryActionStyle, opacity: talhao ? 1 : 0.5 }}
            >
              {tracking ? 'Finalizar caminhamento' : 'Iniciar caminhamento'}
            </button>
            <button
              onClick={() => abrirDetalhes('armadilha')}
              disabled={!talhao}
              style={{ ...secondaryActionStyle, opacity: talhao ? 1 : 0.5 }}
            >
              Armadilha
            </button>
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
          ) : (
            points.map((point, index) => {
              const sev = getSeveridadeInfo(point.severidade)
              const praga = point.praga_doenca_id
                ? catalogoPragas.find(p => p.id === point.praga_doenca_id)
                : null
              return (
                <div key={`${point.hora}-${index}`} style={{ ...gpsRowStyle, alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                    <strong style={{ color: C.textDk, fontSize: 13 }}>
                      {TIPOS_PONTO.find(t => t.id === point.tipo)?.label || point.tipo}
                    </strong>
                    {praga && (
                      <span style={{ color: C.textMid, fontSize: 11 }}>
                        {praga.nome_comum}
                        {point.estadio_fenologico ? ` · ${point.estadio_fenologico}` : ''}
                      </span>
                    )}
                    {sev && (
                      <span
                        style={{
                          alignSelf: 'flex-start',
                          color: sev.cor,
                          background: `${sev.cor}22`,
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontSize: 9,
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          marginTop: 2
                        }}
                      >
                        {sev.label.toUpperCase()}
                        {point.percentual_dano ? ` · ${point.percentual_dano}%` : ''}
                      </span>
                    )}
                  </div>
                  <span style={{ color: C.textDim, fontSize: 11, fontFamily: 'monospace' }}>{point.hora}</span>
                  <span style={{ color: C.textMid, fontSize: 11, fontFamily: 'monospace' }}>
                    {point.lat?.toFixed(6)}, {point.lng?.toFixed(6)}
                  </span>
                  <span style={{ color: C.textDim, fontSize: 11, fontFamily: 'monospace' }}>
                    {Math.round(point.precisao || 0)} m
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {detailDraft && (
        <DetalheModal
          state={detailDraft}
          catalogoPragas={catalogoPragas}
          uploading={uploading}
          onUpdate={updateDetailDraft}
          onFoto={handleFotoChange}
          onCancel={() => setDetailDraft(null)}
          onConfirm={confirmarDetalhes}
        />
      )}
    </section>
  )
}

function DetalheModal({ state, catalogoPragas, uploading, onUpdate, onFoto, onCancel, onConfirm }) {
  const { draft, saving, error, tipo, gps } = state
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: 16,
          padding: 18,
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'grid',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p style={eyebrowStyle}>{TIPOS_PONTO.find(t => t.id === tipo)?.label || tipo}</p>
            <h3 style={{ margin: '4px 0 0', color: C.textDk, fontSize: 18, fontFamily: 'Georgia, serif' }}>
              Detalhes do ponto
            </h3>
            <p style={{ margin: '4px 0 0', color: C.textDim, fontSize: 11, fontFamily: 'monospace' }}>
              GPS: {gps.lat?.toFixed(6)}, {gps.lng?.toFixed(6)} · ±{Math.round(gps.precisao || 0)}m
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar"
            style={{
              background: C.bgLight,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div>
          <label style={formLabelStyle}>PRAGA / DOENÇA / DEFICIÊNCIA</label>
          <select
            value={draft.praga_doenca_id}
            onChange={e => onUpdate({ praga_doenca_id: e.target.value })}
            style={inputStyle}
          >
            <option value="">Não identificado</option>
            {catalogoPragas.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome_comum} ({p.tipo})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={formLabelStyle}>ESTÁDIO FENOLÓGICO</label>
            <input
              value={draft.estadio_fenologico}
              onChange={e => onUpdate({ estadio_fenologico: e.target.value })}
              placeholder="V3, R1, etc."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={formLabelStyle}>% DE DANO</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={draft.percentual_dano}
              onChange={e => onUpdate({ percentual_dano: e.target.value })}
              placeholder="0-100"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={formLabelStyle}>SEVERIDADE</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ESCALAS_SEVERIDADE.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onUpdate({ severidade: draft.severidade === s.id ? '' : s.id })}
                style={{
                  border: `1.5px solid ${draft.severidade === s.id ? s.cor : C.border}`,
                  background: draft.severidade === s.id ? `${s.cor}22` : C.bg,
                  color: draft.severidade === s.id ? s.cor : C.textMid,
                  borderRadius: 999,
                  padding: '7px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={formLabelStyle}>RECOMENDAÇÃO</label>
          <textarea
            rows={2}
            value={draft.recomendacao}
            onChange={e => onUpdate({ recomendacao: e.target.value })}
            placeholder="Ação sugerida (vira sugestão da OS)..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={formLabelStyle}>OBSERVAÇÕES</label>
          <textarea
            rows={2}
            value={draft.observacoes}
            onChange={e => onUpdate({ observacoes: e.target.value })}
            placeholder="Notas livres..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={formLabelStyle}>FOTO</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => e.target.files?.[0] && onFoto(e.target.files[0])}
            style={{ ...inputStyle, padding: '8px 10px' }}
          />
          {uploading && <p style={{ margin: '4px 0 0', color: C.amberDk, fontSize: 11 }}>Enviando foto…</p>}
          {draft.foto_url && (
            <p style={{ margin: '6px 0 0', color: C.greenDp, fontSize: 11, fontFamily: 'monospace' }}>
              ✓ Foto anexada
            </p>
          )}
        </div>

        {error && (
          <div
            style={{
              background: C.redLight,
              color: C.redDk,
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 12,
              border: `1px solid ${C.red}33`
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onCancel} style={{ ...secondaryActionStyle, flex: 1 }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || uploading}
            style={{ ...primaryActionStyle, flex: 2, opacity: saving || uploading ? 0.6 : 1 }}
          >
            {saving ? 'Salvando…' : 'Salvar ponto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function InterpolacaoView({ tipo, talhoes, pluviometros = [] }) {
  const isChuva = tipo === 'chuvas'
  const [dataInicial, setDataInicial] = useState('2026-05-01')
  const [dataFinal, setDataFinal] = useState('2026-05-15')
  const features = talhoes
    .map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) }))
    .filter(item => item.feature)
  const talhaoReferencia = talhoes[0]?.codigo || 'TH01'
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
              <input
                type="date"
                value={dataInicial}
                onChange={e => setDataInicial(e.target.value)}
                style={dateInputStyle}
              />
            </label>
            <label style={dateLabelStyle}>
              Data final
              <input
                type="date"
                value={dataFinal}
                onChange={e => setDataFinal(e.target.value)}
                style={dateInputStyle}
              />
            </label>
            <button style={primaryActionStyle}>Interpolar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {['Todos parametros', '0-20 cm', '20-40 cm', talhaoReferencia].map((filter, index) => (
              <button key={filter} style={index === 0 ? primaryActionStyle : secondaryActionStyle}>
                {filter}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={mapShellStyle}>
        <div style={mapToolbarStyle}>
          <button style={mapPillActiveStyle}>{isChuva ? 'Chuva interpolada' : 'Resultados de solo'}</button>
          <button style={mapPillStyle}>
            {dataInicial} - {dataFinal}
          </button>
          <button style={mapPillStyle}>{isChuva ? 'Pluviometros' : 'Nutrientes'}</button>
        </div>
        {isChuva ? (
          <div style={rainMapFrameStyle}>
            <SimpleFarmMap
              features={features.map(item => ({
                ...item.feature,
                properties: { ...item.feature.properties, codigo: item.talhao.codigo }
              }))}
              height={460}
              selectedMode="chuvas"
              pluviometros={pluviometros}
            />
            <div style={legendStyle}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800 }}>Chuva acumulada</p>
              <div style={gradientBarStyle} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.8)'
                }}
              >
                <span>Baixo</span>
                <span>Medio</span>
                <span>Alto</span>
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
                  <p style={{ margin: '3px 0 0', color: C.textMid, fontSize: 11 }}>
                    Talhao {talhao} · camada {camada}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p
                    style={{
                      margin: 0,
                      color: index % 3 === 0 ? C.greenDp : index % 3 === 1 ? C.amberDk : C.blue,
                      fontWeight: 900,
                      fontSize: 16
                    }}
                  >
                    {media}
                  </p>
                  <p style={{ margin: '3px 0 0', color: C.textDim, fontSize: 9, fontFamily: 'monospace' }}>
                    MEDIA DO NUTRIENTE
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={metricGridStyle}>
        <MetricCard
          label={isChuva ? 'Pluviometros ativos' : 'Media do nutriente no talhao'}
          value={isChuva ? pluviometros.length : '5,7 pH'}
          tone={C.greenDp}
        />
        <MetricCard
          label={isChuva ? 'Talhoes no recorte' : 'Talhao coberto'}
          value={isChuva ? talhoes.length : talhaoReferencia}
          tone={C.blue}
        />
        <MetricCard
          label={isChuva ? 'Periodo selecionado' : 'Camada analisada'}
          value={isChuva ? `${dataInicial} a ${dataFinal}` : '0-20 cm'}
          tone={C.amberDk}
        />
        <MetricCard
          label={isChuva ? 'Camada ativa' : 'Parametros avaliados'}
          value={isChuva ? 'Mapa principal e clima' : soilParams.length}
          tone={C.soilDk}
        />
      </div>
    </section>
  )
}
