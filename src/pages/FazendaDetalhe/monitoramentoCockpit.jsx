import { useEffect, useMemo, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  listarMonitoramentosFazenda,
  listarPontosFazenda,
  listarCaminhamentosFazenda,
  getSeveridadeInfo
} from '../../lib/monitoramentos'
import { MONITORAMENTO_LEGEND } from './constants'
import { SimpleFarmMap } from './maps'
import { useMediaQuery, useDevicePosition } from './hooks'
import {
  normalizeFeature,
  getMonitoramentoMeta,
  formatCultura,
  daysSinceDate
} from './utils'
import {
  requestOfflineStorage,
  countPendingMonitoringSessions,
  syncPendingMonitoringSessions
} from './offline'
import { eyebrowStyle } from './styles'

const C = theme.normal

const FONTS = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'SF Mono', Monaco, 'Courier New', monospace"
}

const emptyOfflineCount = { sessions: 0, points: 0, tracks: 0 }

// ─── Cockpit-local styles (kept inline so this file is the only diff) ──────

const glassPanel = {
  background: 'rgba(255,255,255,0.94)',
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
}

const heroStripStyle = {
  position: 'absolute',
  top: 16,
  left: 16,
  right: 16,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 14,
  pointerEvents: 'none',
  zIndex: 5
}

const heroCardStyle = {
  ...glassPanel,
  padding: '12px 16px',
  pointerEvents: 'auto',
  maxWidth: 460
}

const modeTabsStyle = {
  ...glassPanel,
  padding: 4,
  display: 'flex',
  gap: 0,
  pointerEvents: 'auto'
}

function modeButtonStyle(active) {
  return {
    background: active ? C.greenDp : 'transparent',
    color: active ? C.bg : C.textMid,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontWeight: 900,
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: FONTS.sans
  }
}

function OfflineSyncCard({ pending = emptyOfflineCount, syncing, message, onSync, compact = false }) {
  const totalItems = Number(pending.points || 0) + Number(pending.tracks || 0)
  const hasPending = Number(pending.sessions || 0) > 0 || totalItems > 0

  return (
    <div
      style={{
        ...glassPanel,
        padding: compact ? 10 : 12,
        display: 'grid',
        gap: 8,
        pointerEvents: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textDim, fontFamily: FONTS.mono, fontWeight: 900 }}>
            OFFLINE
          </p>
          <p style={{ margin: '2px 0 0', color: C.textDk, fontSize: compact ? 12 : 13, fontWeight: 900 }}>
            {hasPending ? `${totalItems} itens pendentes` : 'Tudo sincronizado'}
          </p>
        </div>
        <button
          onClick={onSync}
          disabled={!hasPending || syncing}
          style={{
            border: `1px solid ${hasPending ? C.greenDp : C.border}`,
            background: hasPending ? C.greenDp : C.bg,
            color: hasPending ? C.bg : C.textMid,
            borderRadius: 8,
            padding: compact ? '8px 10px' : '9px 12px',
            fontSize: 11,
            fontWeight: 900,
            cursor: !hasPending || syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.72 : 1,
            fontFamily: FONTS.sans,
            whiteSpace: 'nowrap'
          }}
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>
      <p style={{ margin: 0, color: hasPending ? C.amberDk : C.textMid, fontSize: 11, lineHeight: 1.35 }}>
        {message ||
          (hasPending
            ? `${pending.sessions} visita(s), ${pending.points} ponto(s), ${pending.tracks} trilha(s) no aparelho.`
            : 'Os registros locais ja foram enviados para a fazenda.')}
      </p>
    </div>
  )
}

const leftColStyle = {
  position: 'absolute',
  top: 102,
  left: 16,
  bottom: 108,
  width: 280,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  pointerEvents: 'auto',
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: 4,
  zIndex: 5
}

const rightColStyle = {
  position: 'absolute',
  top: 102,
  right: 16,
  bottom: 108,
  width: 320,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  pointerEvents: 'auto',
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: 4,
  zIndex: 5
}

const kpiStackStyle = { ...glassPanel, overflow: 'hidden' }

const kpiRowStyle = (last) => ({
  padding: '12px 14px',
  borderBottom: last ? 'none' : `1px solid ${C.borderSoft}`,
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  alignItems: 'center',
  gap: 10
})

const legendPanelStyle = { ...glassPanel, padding: 14 }

const periodPanelStyle = { ...glassPanel, padding: 12 }

const periodButtonStyle = (active) => ({
  flex: 1,
  background: active ? C.greenDp : C.bg,
  color: active ? C.bg : C.textMid,
  border: `1px solid ${active ? C.greenDp : C.border}`,
  borderRadius: 7,
  padding: '7px 0',
  fontWeight: 900,
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: FONTS.sans
})

const selectedCardStyle = {
  ...glassPanel,
  padding: 16,
  background: 'rgba(255,255,255,0.96)'
}

const selectedKpiCellStyle = {
  background: '#FBFBF7',
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 10
}

const historyPanelStyle = { ...glassPanel, padding: 14 }

const bottomStripStyle = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  right: 16,
  ...glassPanel,
  padding: '10px 14px',
  boxShadow: '0 -10px 30px rgba(0,0,0,0.12)',
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  overflow: 'hidden',
  pointerEvents: 'auto',
  zIndex: 5
}

const chipButtonStyle = (active) => ({
  flexShrink: 0,
  background: active ? C.greenDp : C.bg,
  color: active ? C.bg : C.textDk,
  border: `1px solid ${active ? C.greenDp : C.border}`,
  borderRadius: 10,
  padding: '8px 12px',
  cursor: 'pointer',
  display: 'grid',
  gridTemplateColumns: 'auto auto',
  gap: 8,
  alignItems: 'center',
  fontFamily: FONTS.sans,
  boxShadow: active ? '0 4px 12px rgba(61,138,34,0.25)' : 'none'
})

const pillBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  borderRadius: 999,
  padding: '4px 9px',
  fontSize: 10,
  fontFamily: FONTS.mono,
  fontWeight: 900,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap'
}

const primaryBtnStyle = {
  background: C.greenDp,
  color: C.bg,
  border: 'none',
  borderRadius: 9,
  padding: '9px 14px',
  fontWeight: 900,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: FONTS.sans,
  boxShadow: '0 6px 16px rgba(61, 138, 34, 0.18)'
}

const secondaryBtnStyle = {
  background: C.bg,
  color: C.textDk,
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  padding: '9px 14px',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: FONTS.sans
}

// ─── Component ─────────────────────────────────────────────────────────────

export function MonitoramentoCockpitView({
  fazendaId,
  fazenda,
  talhoes = [],
  monitoramentosResumo = {},
  abrirTalhao,
  setActiveView,
  navigate
}) {
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const devicePosition = useDevicePosition(!isDesktop)
  const [modo, setModo] = useState('severidade') // 'severidade' | 'atraso'
  const [periodo, setPeriodo] = useState(30)
  const [selectedId, setSelectedId] = useState(null)
  const [historico, setHistorico] = useState([])
  const [pontos, setPontos] = useState([])
  const [caminhamentos, setCaminhamentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [offlinePending, setOfflinePending] = useState(emptyOfflineCount)
  const [offlineSyncing, setOfflineSyncing] = useState(false)
  const [offlineMessage, setOfflineMessage] = useState('')

  // Auto-select first talhão with severidade > moderada, or first talhão.
  useEffect(() => {
    if (selectedId || talhoes.length === 0) return
    const critico = talhoes.find(t => {
      const meta = getMonitoramentoMeta(monitoramentosResumo[t.id])
      return meta?.status === 'late'
    })
    setSelectedId((critico || talhoes[0]).id)
  }, [talhoes, monitoramentosResumo, selectedId])

  useEffect(() => {
    if (!fazendaId) return
    let active = true
    setLoading(true)
    setLoadError('')
    ;(async () => {
      try {
        const dataInicio = new Date(Date.now() - periodo * 86400000).toISOString().slice(0, 10)
        const [{ monitoramentos }, ptsArr, caminhamentosArr] = await Promise.all([
          listarMonitoramentosFazenda(fazendaId, { dataInicio }),
          listarPontosFazenda(fazendaId, { dataInicio }),
          listarCaminhamentosFazenda(fazendaId, { dataInicio }).catch(() => [])
        ])
        if (!active) return
        setHistorico(monitoramentos)
        setPontos(ptsArr)
        setCaminhamentos(caminhamentosArr)
      } catch (err) {
        if (!active) return
        setLoadError(err.message || 'Nao foi possivel carregar historico de monitoramento')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [fazendaId, periodo, reloadToken])

  useEffect(() => {
    if (!fazendaId) return
    let active = true
    async function refresh() {
      const count = await countPendingMonitoringSessions(fazendaId)
      if (active) setOfflinePending(count)
    }
    refresh()
    window.addEventListener('online', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('online', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [fazendaId, reloadToken])

  const talhoesMap = useMemo(() => new Map(talhoes.map(t => [t.id, t])), [talhoes])
  const selected = selectedId ? talhoesMap.get(selectedId) : null
  const selectedHistorico = useMemo(
    () => historico.filter(h => h.talhao_id === selectedId).slice(0, 4),
    [historico, selectedId]
  )

  const kpis = useMemo(() => {
    const monitorados = new Set(historico.map(h => h.talhao_id)).size
    const ocorrenciasCriticas = pontos.filter(p => ['severa', 'nde'].includes(p.severidade)).length
    const emAtraso = talhoes.filter(t => {
      const reg = monitoramentosResumo[t.id]
      if (!reg?.visitado_em) return true
      return daysSinceDate(reg.visitado_em) > 10
    }).length
    return { monitorados, ocorrenciasCriticas, emAtraso }
  }, [historico, pontos, talhoes, monitoramentosResumo])

  // Build map features
  const mapFeatures = useMemo(
    () =>
      talhoes
        .map(t => {
          const feat = normalizeFeature(t.geometria, t.codigo)
          if (!feat) return null
          const monitoramento = getMonitoramentoMeta(monitoramentosResumo[t.id])
          return {
            ...feat,
            properties: { ...feat.properties, codigo: t.codigo, monitoramento }
          }
        })
        .filter(Boolean),
    [talhoes, monitoramentosResumo]
  )

  // Legend counts (talhões grouped by monitoramento status)
  const legendCounts = useMemo(() => {
    const acc = { recent: 0, attention: 0, late: 0, never: 0 }
    talhoes.forEach(t => {
      const meta = getMonitoramentoMeta(monitoramentosResumo[t.id])
      acc[meta.status] = (acc[meta.status] || 0) + 1
    })
    return acc
  }, [talhoes, monitoramentosResumo])

  async function abrirMonitoramento() {
    if (!selected) return
    await requestOfflineStorage()
    await abrirTalhao(selected)
    setActiveView('monitoramento-registro')
  }

  async function sincronizarOffline() {
    setOfflineSyncing(true)
    setOfflineMessage('')
    try {
      const result = await syncPendingMonitoringSessions({ fazendaId })
      const nextCount = await countPendingMonitoringSessions(fazendaId)
      setOfflinePending(nextCount)
      setReloadToken(value => value + 1)
      if (result.total === 0) {
        setOfflineMessage('Nao ha registros offline pendentes.')
      } else if (result.failed > 0) {
        setOfflineMessage(`${result.synced} visita(s) enviadas, ${result.failed} com erro. Tente novamente com internet estavel.`)
      } else {
        setOfflineMessage(`${result.synced} visita(s) enviadas para a fazenda.`)
      }
    } catch (err) {
      setOfflineMessage(err.message || 'Nao foi possivel sincronizar agora.')
    } finally {
      setOfflineSyncing(false)
    }
  }

  function handleFeatureClick(index) {
    const t = talhoes.find(x => x.codigo === mapFeatures[index]?.properties?.codigo)
    if (t) setSelectedId(t.id)
  }

  const selMeta = selected ? getMonitoramentoMeta(monitoramentosResumo[selected.id]) : null
  const selPontos = useMemo(
    () => pontos.filter(p => historico.find(h => h.id === p.monitoramento_id && h.talhao_id === selectedId)),
    [pontos, historico, selectedId]
  )
  const selSeveridade = selPontos.find(p => ['severa', 'nde'].includes(p.severidade))
    ? 'severa'
    : selPontos.find(p => p.severidade === 'moderada')
      ? 'moderada'
      : selPontos.length
        ? 'leve'
        : null
  const selSeverInfo = selSeveridade ? getSeveridadeInfo(selSeveridade) : null

  // Mobile fallback — list view (same data, simpler chrome)
  if (!isDesktop) {
    return (
      <MonitoramentoCockpitMobile
        talhoes={talhoes}
        monitoramentosResumo={monitoramentosResumo}
        historico={historico}
        loading={loading}
        loadError={loadError}
        periodo={periodo}
        setPeriodo={setPeriodo}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        abrirMonitoramento={abrirMonitoramento}
        offlinePending={offlinePending}
        offlineSyncing={offlineSyncing}
        offlineMessage={offlineMessage}
        sincronizarOffline={sincronizarOffline}
        navigate={navigate}
      />
    )
  }

  // Desktop cockpit
  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 76px)',
        overflow: 'hidden',
        background: '#0d1e14',
        color: C.textDk
      }}
    >
      <SimpleFarmMap
        features={mapFeatures}
        height="calc(100vh - 76px)"
        fullBleed
        selectedCode={selected?.codigo}
        selectedMode="monitoramento"
        pluviometros={[]}
        devicePosition={devicePosition}
        onFeatureClick={handleFeatureClick}
        monitoramentoPontos={pontos}
        caminhamentos={caminhamentos}
      />

      {/* Hero strip */}
      <div style={heroStripStyle}>
        <div style={heroCardStyle}>
          <p style={eyebrowStyle}>MONITORAMENTO</p>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: 22,
              fontFamily: FONTS.serif,
              fontWeight: 900,
              color: C.textDk,
              lineHeight: 1.05
            }}
          >
            Mapa de scouting
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: C.textMid, lineHeight: 1.4 }}>
            {fazenda?.area_total
              ? `${Number(fazenda.area_total).toFixed(1)} ha · `
              : ''}
            {talhoes.length} talhões · clique em um polígono pra ver detalhes
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', pointerEvents: 'auto' }}>
          <div style={modeTabsStyle}>
            {[
              { id: 'severidade', label: 'Severidade' },
              { id: 'atraso', label: 'Dias sem visita' }
            ].map(m => (
              <button key={m.id} onClick={() => setModo(m.id)} style={modeButtonStyle(modo === m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setActiveView('monitoramento-inbox')}
            style={{
              ...glassPanel,
              padding: '8px 14px',
              fontWeight: 900,
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: FONTS.sans,
              color: C.greenDp,
              border: `1px solid ${C.greenDp}55`
            }}
            title="Ver lista de visitas (inbox do técnico)"
          >
            Inbox ↗
          </button>
        </div>
      </div>

      {/* Left column — KPIs + legend + period */}
      <div style={leftColStyle}>
        {loadError && (
          <div
            style={{
              ...glassPanel,
              padding: 12,
              background: C.redLight,
              border: `1px solid ${C.red}33`,
              color: C.redDk,
              fontSize: 12
            }}
          >
            {loadError}
          </div>
        )}

        <OfflineSyncCard
          pending={offlinePending}
          syncing={offlineSyncing}
          message={offlineMessage}
          onSync={sincronizarOffline}
        />

        <div style={kpiStackStyle}>
          {[
            {
              l: 'Talhões monitorados',
              v: `${kpis.monitorados}/${talhoes.length}`,
              tone: C.greenDp,
              h: `Período · ${periodo}d`
            },
            {
              l: 'Em atraso',
              v: kpis.emAtraso,
              tone: kpis.emAtraso > 0 ? C.redDk : C.greenDp,
              h: '> 10 dias sem visita'
            },
            {
              l: 'Críticas',
              v: kpis.ocorrenciasCriticas,
              tone: C.amberDk,
              h: 'Severa + NDE'
            }
          ].map((k, i) => (
            <div key={k.l} style={kpiRowStyle(i === 2)}>
              <div>
                <p style={eyebrowStyle}>{k.l.toUpperCase()}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMid }}>{k.h}</p>
              </div>
              <strong
                style={{
                  color: k.tone,
                  fontSize: 22,
                  fontFamily: FONTS.serif,
                  fontWeight: 800,
                  lineHeight: 1
                }}
              >
                {k.v}
              </strong>
            </div>
          ))}
        </div>

        <div style={legendPanelStyle}>
          <p style={eyebrowStyle}>LEGENDA · {modo.toUpperCase()}</p>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {MONITORAMENTO_LEGEND.map(l => (
              <div
                key={l.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '12px 1fr auto',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 99,
                    background: l.color,
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.75)'
                  }}
                />
                <div>
                  <p style={{ margin: 0, color: C.textDk, fontSize: 12, fontWeight: 800 }}>{l.title}</p>
                  <p
                    style={{
                      margin: 0,
                      color: C.textMid,
                      fontSize: 10,
                      fontFamily: FONTS.mono,
                      letterSpacing: '0.5px',
                      fontWeight: 800
                    }}
                  >
                    {l.range}
                  </p>
                </div>
                <span
                  style={{
                    color: l.color,
                    fontFamily: FONTS.mono,
                    fontWeight: 900,
                    fontSize: 13
                  }}
                >
                  {legendCounts[l.key] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={periodPanelStyle}>
          <p style={eyebrowStyle}>PERÍODO</p>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setPeriodo(d)} style={periodButtonStyle(periodo === d)}>
                {d}d
              </button>
            ))}
          </div>
          {loading && (
            <p
              style={{
                margin: '8px 0 0',
                color: C.textDim,
                fontSize: 10,
                fontFamily: FONTS.mono,
                fontWeight: 800
              }}
            >
              CARREGANDO…
            </p>
          )}
        </div>
      </div>

      {/* Right column — selected detail */}
      {selected && (
        <div style={rightColStyle}>
          <div style={selectedCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ ...eyebrowStyle, color: C.greenDp }}>TALHÃO SELECIONADO</p>
                <h2
                  style={{
                    margin: '4px 0 0',
                    fontSize: 24,
                    fontFamily: FONTS.serif,
                    fontWeight: 900,
                    color: C.textDk,
                    lineHeight: 1
                  }}
                >
                  {selected.codigo}
                </h2>
                <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
                  {formatCultura(selected.cultura)} · {Number(selected.area_ha || 0).toFixed(2)} ha
                </p>
              </div>
              {selSeverInfo && (
                <span
                  style={{
                    ...pillBaseStyle,
                    color: selSeverInfo.cor,
                    background: `${selSeverInfo.cor}1a`,
                    border: `1px solid ${selSeverInfo.cor}55`
                  }}
                >
                  {selSeverInfo.label}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginTop: 14
              }}
            >
              {[
                { l: 'Sem visita', v: selMeta?.shortLabel || 'Nunca', tone: selMeta?.color || C.textDim },
                { l: 'Fase', v: selected.fase || '—', tone: C.textDk },
                { l: 'Ocorrências', v: selPontos.length, tone: selPontos.length ? C.amberDk : C.greenDp },
                {
                  l: 'Pontos GPS',
                  v: selPontos.length,
                  tone: C.textDk
                }
              ].map(k => (
                <div key={k.l} style={selectedKpiCellStyle}>
                  <p style={eyebrowStyle}>{k.l.toUpperCase()}</p>
                  <strong
                    style={{
                      display: 'block',
                      marginTop: 4,
                      color: k.tone,
                      fontSize: 16,
                      fontFamily: FONTS.serif,
                      fontWeight: 800
                    }}
                  >
                    {k.v}
                  </strong>
                </div>
              ))}
            </div>

            {selSeverInfo && (
              <div
                style={{
                  marginTop: 12,
                  padding: 11,
                  background: selSeveridade === 'severa' || selSeveridade === 'nde' ? C.redLight : C.amberLight,
                  border: `1px solid ${(selSeveridade === 'severa' || selSeveridade === 'nde' ? C.red : C.amber)}44`,
                  borderRadius: 10
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 9,
                    fontFamily: FONTS.mono,
                    fontWeight: 900,
                    color: selSeveridade === 'severa' || selSeveridade === 'nde' ? C.redDk : C.amberDk,
                    letterSpacing: '1px'
                  }}
                >
                  RECOMENDAÇÃO
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDk, lineHeight: 1.45 }}>
                  {selSeveridade === 'severa' || selSeveridade === 'nde'
                    ? 'Ocorrência severa detectada. Considere abrir OS de aplicação e monitorar talhões vizinhos.'
                    : 'Ocorrência moderada. Aumentar frequência de visitas e avaliar evolução.'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={abrirMonitoramento} style={{ ...primaryBtnStyle, flex: 1 }}>
                + Registrar visita
              </button>
              <button onClick={() => navigate('/os')} style={secondaryBtnStyle}>
                Abrir OS
              </button>
            </div>
          </div>

          <div style={historyPanelStyle}>
            <p style={eyebrowStyle}>HISTÓRICO RECENTE</p>
            <h3
              style={{
                margin: '4px 0 0',
                fontSize: 15,
                color: C.textDk,
                fontWeight: 800,
                fontFamily: FONTS.serif
              }}
            >
              Visitas em {selected.codigo}
            </h3>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {selectedHistorico.length === 0 ? (
                <p style={{ margin: 0, color: C.textDim, fontSize: 12 }}>
                  Sem visitas registradas no período.
                </p>
              ) : (
                selectedHistorico.map(v => {
                  const sev = getSeveridadeInfo(v.severidade)
                  const cor = sev?.cor || C.textMid
                  return (
                    <div
                      key={v.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '4px 1fr',
                        gap: 10,
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{ width: 3, alignSelf: 'stretch', background: cor, borderRadius: 99 }} />
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 9,
                            color: C.textDim,
                            fontFamily: FONTS.mono,
                            letterSpacing: '0.5px',
                            fontWeight: 800
                          }}
                        >
                          {new Date(v.visitado_em)
                            .toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            .toUpperCase()}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: C.textDk }}>
                          {sev?.label || 'Sem severidade'}
                          {v.observacoes ? ` · ${String(v.observacoes).slice(0, 60)}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom chip strip */}
      <div style={bottomStripStyle}>
        <div
          style={{
            flexShrink: 0,
            borderRight: `1px solid ${C.borderSoft}`,
            paddingRight: 14
          }}
        >
          <p style={eyebrowStyle}>TALHÕES</p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: C.textMid }}>Filtrar no mapa</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto' }}>
          {talhoes.map(t => {
            const meta = getMonitoramentoMeta(monitoramentosResumo[t.id])
            const isSel = t.id === selectedId
            return (
              <button key={t.id} onClick={() => setSelectedId(t.id)} style={chipButtonStyle(isSel)}>
                <div style={{ textAlign: 'left' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 900,
                      lineHeight: 1.1
                    }}
                  >
                    {t.codigo}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 10,
                      color: isSel ? 'rgba(255,255,255,0.8)' : C.textMid,
                      fontFamily: FONTS.mono,
                      fontWeight: 700
                    }}
                  >
                    {meta.shortLabel}
                  </p>
                </div>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: meta.color,
                    boxShadow: isSel ? '0 0 0 2px rgba(255,255,255,0.4)' : 'none',
                    display: 'inline-block'
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Mobile fallback ───────────────────────────────────────────────────────

function MonitoramentoCockpitMobile({
  talhoes,
  monitoramentosResumo,
  historico,
  loading,
  loadError,
  periodo,
  setPeriodo,
  selectedId,
  setSelectedId,
  abrirMonitoramento,
  offlinePending,
  offlineSyncing,
  offlineMessage,
  sincronizarOffline,
  navigate
}) {
  const selected = talhoes.find(t => t.id === selectedId) || null
  const selMeta = selected ? getMonitoramentoMeta(monitoramentosResumo[selected.id]) : null

  return (
    <section style={{ display: 'grid', gap: 12, padding: 12 }}>
      <div>
        <p style={eyebrowStyle}>MONITORAMENTO</p>
        <h2
          style={{
            margin: '4px 0 0',
            fontFamily: FONTS.serif,
            fontSize: 22,
            color: C.textDk,
            fontWeight: 900
          }}
        >
          Scouting
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setPeriodo(d)} style={periodButtonStyle(periodo === d)}>
            {d}d
          </button>
        ))}
      </div>

      <OfflineSyncCard
        pending={offlinePending}
        syncing={offlineSyncing}
        message={offlineMessage}
        onSync={sincronizarOffline}
        compact
      />

      {loadError && (
        <div
          style={{
            background: C.redLight,
            border: `1px solid ${C.red}33`,
            color: C.redDk,
            padding: 10,
            borderRadius: 10,
            fontSize: 12
          }}
        >
          {loadError}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {talhoes.map(t => {
          const meta = getMonitoramentoMeta(monitoramentosResumo[t.id])
          const isSel = t.id === selectedId
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{
                background: isSel ? `${meta.color}10` : C.bg,
                border: `1px solid ${isSel ? meta.color : C.border}`,
                borderRadius: 10,
                padding: '12px 14px',
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
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 99,
                    background: meta.color,
                    flexShrink: 0
                  }}
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
              <span
                style={{
                  color: meta.color,
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: FONTS.mono
                }}
              >
                {meta.shortLabel}
              </span>
            </button>
          )
        })}
      </div>

      {selected && (
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 14,
            display: 'grid',
            gap: 12
          }}
        >
          <div>
            <p style={eyebrowStyle}>TALHÃO SELECIONADO</p>
            <h3
              style={{
                margin: '4px 0 0',
                fontFamily: FONTS.serif,
                fontWeight: 900,
                fontSize: 20,
                color: C.textDk
              }}
            >
              {selected.codigo}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMid }}>
              {selMeta?.title} · {formatCultura(selected.cultura)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={abrirMonitoramento} style={{ ...primaryBtnStyle, flex: 1 }}>
              + Registrar visita
            </button>
            <button onClick={() => navigate('/os')} style={secondaryBtnStyle}>
              Abrir OS
            </button>
          </div>

          {historico.filter(h => h.talhao_id === selectedId).length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <p style={eyebrowStyle}>HISTÓRICO RECENTE</p>
              {historico
                .filter(h => h.talhao_id === selectedId)
                .slice(0, 4)
                .map(v => {
                  const sev = getSeveridadeInfo(v.severidade)
                  return (
                    <div
                      key={v.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '4px 1fr',
                        gap: 10,
                        alignItems: 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          width: 3,
                          alignSelf: 'stretch',
                          background: sev?.cor || C.textMid,
                          borderRadius: 99
                        }}
                      />
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 9,
                            color: C.textDim,
                            fontFamily: FONTS.mono,
                            letterSpacing: '0.5px',
                            fontWeight: 800
                          }}
                        >
                          {new Date(v.visitado_em)
                            .toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            .toUpperCase()}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: C.textDk }}>
                          {sev?.label || 'Sem severidade'}
                          {v.observacoes ? ` · ${String(v.observacoes).slice(0, 60)}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {loading && (
        <p
          style={{
            margin: 0,
            color: C.textDim,
            fontSize: 10,
            fontFamily: FONTS.mono,
            fontWeight: 800,
            textAlign: 'center'
          }}
        >
          CARREGANDO…
        </p>
      )}
    </section>
  )
}
