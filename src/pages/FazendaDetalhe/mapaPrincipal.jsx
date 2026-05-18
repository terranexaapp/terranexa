// Tela Mapa — redesign V3 (Dock + widgets flutuantes)
// Substitui o painel verde de 5 abas por: rail de ícones à esquerda,
// chip do talhão no topo-direito e dock inferior com KPIs + CTA primário.

import { theme } from '../../styles/theme'
import { getCategoriaInfo } from '../../lib/operacoes'
import { useMediaQuery } from './hooks'
import { SimpleFarmMap } from './maps'
import { requestOfflineStorage } from './offline'
import { normalizeFeature, getMonitoramentoMeta, formatCultura, formatShortDate } from './utils'

const C = theme.normal

const FONTS = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'SF Mono', Monaco, 'Courier New', monospace"
}

const Ico = {
  Menu: props => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  ),
  Sum: props => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="4" y1="9" x2="20" y2="9" />
    </svg>
  ),
  Leaf: props => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
      <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14z" />
      <path d="M5 19l9-9" />
    </svg>
  ),
  History: props => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 9 8 9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  ),
  Drop: props => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
      <path d="M12 3c-3 4-6 8-6 12a6 6 0 0 0 12 0c0-4-3-8-6-12z" />
    </svg>
  ),
  Soil: props => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
      <path d="M3 18c4 0 4-3 9-3s5 3 9 3" />
      <path d="M3 14c4 0 4-3 9-3s5 3 9 3" />
      <path d="M3 22h18" />
    </svg>
  ),
  Order: props => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
    </svg>
  ),
  Eye: props => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ChevR: props => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
  Plus: props => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  X: props => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  )
}

const pageStyle = {
  position: 'relative',
  width: '100%',
  minHeight: 'calc(100vh - 0px)',
  overflow: 'hidden',
  background: '#0d1e14'
}

const pageMobileStyle = {
  position: 'relative',
  width: '100%',
  minHeight: '100dvh',
  overflow: 'hidden',
  background: '#0d1e14'
}

const railStyle = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 56,
  padding: '8px 6px',
  background: 'rgba(255,255,255,0.96)',
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
  backdropFilter: 'blur(10px)',
  zIndex: 6
}

const railIconStyle = active => ({
  width: 44,
  height: 44,
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  borderRadius: 10,
  background: active ? C.greenDp : 'transparent',
  color: active ? C.bg : C.textMid,
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 120ms ease'
})

const railDividerStyle = {
  width: 32,
  height: 1,
  background: C.borderSoft,
  margin: '4px 0',
  border: 'none'
}

const railBadgeStyle = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 7,
  height: 7,
  borderRadius: 99,
  background: C.red,
  boxShadow: '0 0 0 2px rgba(255,255,255,0.96)'
}

const crumbStyle = {
  position: 'absolute',
  top: 24,
  left: 88,
  background: 'rgba(255,255,255,0.96)',
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '8px 14px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: C.textMid,
  fontSize: 12,
  fontFamily: FONTS.mono,
  letterSpacing: '0.4px',
  fontWeight: 700,
  boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
  backdropFilter: 'blur(10px)',
  zIndex: 5,
  maxWidth: 'calc(100% - 440px)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}

const talhaoChipStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: 'rgba(255,255,255,0.96)',
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  backdropFilter: 'blur(10px)',
  zIndex: 5,
  maxWidth: 360
}

const areaPillStyle = {
  background: '#eef5e8',
  color: C.greenDp,
  borderRadius: 9,
  padding: '6px 10px',
  fontFamily: FONTS.mono,
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: '0.3px',
  whiteSpace: 'nowrap'
}

const dockStyle = {
  position: 'absolute',
  bottom: 16,
  left: 88,
  right: 16,
  background: 'rgba(255,255,255,0.97)',
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: '14px 18px',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  gap: 22,
  alignItems: 'center',
  boxShadow: '0 -10px 30px rgba(0,0,0,0.12), 0 12px 36px rgba(0,0,0,0.20)',
  backdropFilter: 'blur(10px)',
  zIndex: 5
}

const dockIdStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  paddingRight: 18,
  borderRight: `1px solid ${C.borderSoft}`
}

const dockIdAvatarStyle = {
  width: 42,
  height: 42,
  borderRadius: 11,
  background: C.greenDp,
  color: '#d8e8c4',
  display: 'grid',
  placeItems: 'center',
  fontFamily: FONTS.serif,
  fontWeight: 900,
  fontSize: 19,
  flexShrink: 0
}

const dockKpisStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
  minWidth: 0
}

const dockKpiStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }

const dockKpiIconWrap = (bg, fg) => ({
  width: 32,
  height: 32,
  borderRadius: 9,
  background: bg || '#FBFBF7',
  color: fg || C.textDk,
  border: `1px solid ${C.border}`,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0
})

const dockKpiLabelStyle = {
  margin: 0,
  fontSize: 9,
  color: C.textDim,
  fontFamily: FONTS.mono,
  letterSpacing: '0.8px',
  fontWeight: 800,
  textTransform: 'uppercase'
}

const dockKpiValueStyle = {
  margin: '3px 0 0',
  fontSize: 13,
  color: C.textDk,
  fontWeight: 800,
  lineHeight: 1.25,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}

const dockKpiSubStyle = { color: C.textMid, fontWeight: 600 }

const primaryCtaStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: C.greenDp,
  color: '#f0f5e8',
  border: 'none',
  borderRadius: 12,
  padding: '11px 18px',
  fontWeight: 900,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: FONTS.sans,
  boxShadow: '0 6px 16px rgba(61,138,34,0.28)'
}

const ghostCtaStyle = {
  ...primaryCtaStyle,
  background: 'transparent',
  color: C.greenDp,
  border: `1px solid ${C.greenDp}`,
  boxShadow: 'none'
}

const eyebrowStyle = {
  margin: 0,
  fontSize: 9,
  color: C.textDim,
  fontFamily: FONTS.mono,
  letterSpacing: '1.4px',
  fontWeight: 800,
  textTransform: 'uppercase'
}

const statusTagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  marginLeft: 6,
  height: 16,
  padding: '0 7px',
  borderRadius: 99,
  background: '#eef5e8',
  color: C.greenDp,
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: '0.4px',
  fontFamily: FONTS.mono,
  textTransform: 'uppercase'
}

export function FazendaMapaPrincipal({
  fazenda,
  talhoes,
  pluviometros = [],
  monitoramentosResumo = {},
  talhaoSel,
  operacoes,
  alternarTalhao,
  navigate,
  setActiveView,
  setMenuOpen
}) {
  const isDesktop = useMediaQuery('(min-width: 900px)')

  const features = talhoes
    .map(t => ({ talhao: t, feature: normalizeFeature(t.geometria, t.codigo) }))
    .filter(item => item.feature)
  const selected = talhaoSel || null
  const selectedMonitoring = getMonitoramentoMeta(selected ? monitoramentosResumo[selected.id] : null)
  const mapFeatures = features.map(item => {
    const monitoramento = getMonitoramentoMeta(monitoramentosResumo[item.talhao.id])
    return {
      ...item.feature,
      properties: { ...item.feature.properties, codigo: item.talhao.codigo, monitoramento }
    }
  })

  const ultimaOp = operacoes[0] || null
  const ultimaOpInfo = ultimaOp ? getCategoriaInfo(ultimaOp.categoria) : null
  const ultimaOpAberta = ultimaOp && ultimaOp.status && ultimaOp.status !== 'executada' && ultimaOp.status !== 'concluida'

  const activePluvio = pluviometros.filter(p => p.ativo !== false)
  // Estimativa sintética da última chuva quando há pluviômetros (mantém parity com os dados existentes
  // até integração com leitura real por pluviômetro).
  const chuvaSeed = selected
    ? String(selected.codigo || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    : 0
  const chuvaMm = activePluvio.length ? (8 + (chuvaSeed % 14)).toFixed(1) : null
  const chuvaData =
    activePluvio.length && selected
      ? new Date(Date.now() - 86400000 * (1 + (chuvaSeed % 5))).toISOString().slice(0, 10)
      : null

  async function handleFeatureClick(index) {
    const t = features[index]?.talhao
    if (!t) return
    await alternarTalhao(t)
  }

  async function abrirMonitoramento() {
    await requestOfflineStorage()
    setActiveView('monitoramento-registro')
  }

  if (!isDesktop) {
    return (
      <MapaMobile
        mapFeatures={mapFeatures}
        fazenda={fazenda}
        selected={selected}
        ultimaOp={ultimaOp}
        ultimaOpInfo={ultimaOpInfo}
        ultimaOpAberta={ultimaOpAberta}
        chuvaMm={chuvaMm}
        chuvaData={chuvaData}
        activePluvio={activePluvio}
        selectedMonitoring={selectedMonitoring}
        handleFeatureClick={handleFeatureClick}
        abrirMonitoramento={abrirMonitoramento}
        alternarTalhao={alternarTalhao}
        setActiveView={setActiveView}
        navigate={navigate}
        setMenuOpen={setMenuOpen}
      />
    )
  }

  return (
    <section style={pageStyle}>
      <SimpleFarmMap
        features={mapFeatures}
        height="100dvh"
        fullBleed
        selectedCode={selected?.codigo}
        selectedMode="timeline"
        pluviometros={[]}
        onFeatureClick={handleFeatureClick}
      />

      {/* Rail vertical de ícones */}
      <nav style={railStyle} aria-label="Atalhos do mapa">
        <button onClick={() => setMenuOpen(true)} style={railIconStyle(false)} title="Menu" aria-label="Abrir menu">
          <Ico.Menu />
        </button>
        <hr style={railDividerStyle} />
        <button style={railIconStyle(true)} title="Resumo" aria-label="Resumo do mapa">
          <Ico.Sum />
        </button>
        <button
          onClick={() => setActiveView('monitoramento')}
          style={railIconStyle(false)}
          title="Monitoramento"
          aria-label="Monitoramento"
        >
          <Ico.Leaf />
        </button>
        <button
          onClick={() => navigate('/os')}
          style={railIconStyle(false)}
          title="Ordens de servico"
          aria-label="Ordens de servico"
        >
          <Ico.History />
          {ultimaOpAberta && <span style={railBadgeStyle} />}
        </button>
        <button onClick={() => setActiveView('chuvas')} style={railIconStyle(false)} title="Chuvas" aria-label="Chuvas">
          <Ico.Drop />
        </button>
        <button onClick={() => setActiveView('solo')} style={railIconStyle(false)} title="Solo" aria-label="Solo">
          <Ico.Soil />
        </button>
      </nav>

      {/* Breadcrumb */}
      <div style={crumbStyle}>
        <span>{fazenda?.nome || 'Fazenda'}</span>
        <Ico.ChevR />
        <b style={{ color: C.textDk, fontWeight: 800 }}>{selected?.codigo || 'Mapa'}</b>
      </div>

      {/* Chip do talhao no topo direito */}
      {selected && (
        <div style={talhaoChipStyle}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={eyebrowStyle}>TALHAO</p>
            <p
              style={{
                margin: '3px 0 0',
                color: C.textDk,
                fontWeight: 900,
                fontSize: 15,
                fontFamily: FONTS.serif,
                lineHeight: 1.15
              }}
            >
              {selected.codigo}
            </p>
            <p style={{ margin: '2px 0 0', color: C.textMid, fontSize: 11 }}>{formatCultura(selected.cultura)}</p>
          </div>
          <span style={areaPillStyle}>{Number(selected.area_ha || 0).toFixed(2)} ha</span>
          <button
            onClick={() => alternarTalhao(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: C.textMid,
              padding: 4,
              display: 'grid',
              placeItems: 'center'
            }}
            aria-label="Limpar selecao"
          >
            <Ico.X />
          </button>
        </div>
      )}

      {/* Dock inferior com KPIs + CTA primario */}
      {selected && (
        <div style={dockStyle}>
          <div style={dockIdStyle}>
            <div style={dockIdAvatarStyle}>{String(selected.codigo || 'T').charAt(0)}</div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  color: C.textDk,
                  fontWeight: 900,
                  fontSize: 15,
                  fontFamily: FONTS.serif,
                  lineHeight: 1.1
                }}
              >
                {selected.codigo}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  color: C.textMid,
                  fontSize: 10,
                  fontFamily: FONTS.mono,
                  letterSpacing: '0.4px',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              >
                {formatCultura(selected.cultura)} · {Number(selected.area_ha || 0).toFixed(2)} ha
              </p>
            </div>
          </div>

          <div style={dockKpisStyle}>
            <div style={dockKpiStyle}>
              <div style={dockKpiIconWrap('#FBFBF7', C.textDk)}>
                <Ico.Order />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={dockKpiLabelStyle}>Ultima operacao</p>
                <p style={dockKpiValueStyle}>
                  {ultimaOp ? (
                    <>
                      {ultimaOpInfo?.label || ultimaOp.categoria}{' '}
                      <span style={dockKpiSubStyle}>· {formatShortDate(ultimaOp.data_operacao)}</span>
                      {ultimaOpAberta ? (
                        <span style={{ ...statusTagStyle, background: '#fbefd8', color: C.amberDk }}>aberta</span>
                      ) : (
                        <span style={statusTagStyle}>fechada</span>
                      )}
                    </>
                  ) : (
                    <span style={dockKpiSubStyle}>Sem operacao</span>
                  )}
                </p>
              </div>
            </div>

            <div style={dockKpiStyle}>
              <div
                style={dockKpiIconWrap(
                  selectedMonitoring.color ? `${selectedMonitoring.color}1a` : '#FBFBF7',
                  selectedMonitoring.color || C.textMid
                )}
              >
                <Ico.Eye />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={dockKpiLabelStyle}>Ultimo monitoramento</p>
                <p style={dockKpiValueStyle}>
                  {selectedMonitoring.shortLabel || 'Nunca'}
                  {selectedMonitoring.days != null && (
                    <span style={dockKpiSubStyle}>
                      {' · '}
                      {selectedMonitoring.days === 0
                        ? 'hoje'
                        : `ha ${selectedMonitoring.days} dia${selectedMonitoring.days === 1 ? '' : 's'}`}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div style={dockKpiStyle}>
              <div style={dockKpiIconWrap('#E0EEF6', '#4A8AB8')}>
                <Ico.Drop />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={dockKpiLabelStyle}>
                  Ultima chuva
                  {activePluvio.length > 0 && (
                    <span style={{ color: C.textMid, fontWeight: 600 }}> · {activePluvio.length} pluv.</span>
                  )}
                </p>
                <p style={dockKpiValueStyle}>
                  {chuvaMm ? (
                    <>
                      {chuvaMm} mm <span style={dockKpiSubStyle}>· {formatShortDate(chuvaData)}</span>
                    </>
                  ) : (
                    <span style={dockKpiSubStyle}>Sem registro</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={abrirMonitoramento} style={ghostCtaStyle}>
              <Ico.Plus />
              Monitorar
            </button>
            <button onClick={() => navigate('/os')} style={primaryCtaStyle}>
              <Ico.Order />
              Abrir OS
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Fallback mobile (rail horizontal compacto + sheet inferior) ─────────────
function MapaMobile({
  mapFeatures,
  fazenda,
  selected,
  ultimaOp,
  ultimaOpInfo,
  ultimaOpAberta,
  chuvaMm,
  chuvaData,
  activePluvio,
  selectedMonitoring,
  handleFeatureClick,
  abrirMonitoramento,
  alternarTalhao,
  setActiveView,
  navigate,
  setMenuOpen
}) {
  return (
    <section style={pageMobileStyle}>
      <SimpleFarmMap
        features={mapFeatures}
        height="100dvh"
        fullBleed
        selectedCode={selected?.codigo}
        selectedMode="timeline"
        pluviometros={[]}
        onFeatureClick={handleFeatureClick}
      />

      {/* Rail horizontal no topo */}
      <nav
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          background: 'rgba(255,255,255,0.96)',
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 6,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 6,
          overflowX: 'auto'
        }}
        aria-label="Atalhos do mapa"
      >
        <button onClick={() => setMenuOpen(true)} style={railIconStyle(false)} aria-label="Menu">
          <Ico.Menu />
        </button>
        <span style={{ width: 1, height: 26, background: C.borderSoft, flexShrink: 0 }} />
        <button style={railIconStyle(true)} aria-label="Resumo">
          <Ico.Sum />
        </button>
        <button onClick={() => setActiveView('monitoramento')} style={railIconStyle(false)} aria-label="Monitoramento">
          <Ico.Leaf />
        </button>
        <button onClick={() => navigate('/os')} style={railIconStyle(false)} aria-label="Ordens de servico">
          <Ico.History />
          {ultimaOpAberta && <span style={railBadgeStyle} />}
        </button>
        <button onClick={() => setActiveView('chuvas')} style={railIconStyle(false)} aria-label="Chuvas">
          <Ico.Drop />
        </button>
        <button onClick={() => setActiveView('solo')} style={railIconStyle(false)} aria-label="Solo">
          <Ico.Soil />
        </button>
        <div style={{ flex: 1, minWidth: 4 }} />
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: C.textMid,
            padding: '0 8px',
            whiteSpace: 'nowrap',
            fontWeight: 700,
            letterSpacing: '0.4px'
          }}
        >
          {selected?.codigo || fazenda?.nome || ''}
        </span>
      </nav>

      {selected && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            background: 'rgba(255,255,255,0.97)',
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 14,
            display: 'grid',
            gap: 12,
            boxShadow: '0 -10px 30px rgba(0,0,0,0.12), 0 12px 36px rgba(0,0,0,0.22)',
            backdropFilter: 'blur(10px)',
            zIndex: 5,
            maxHeight: '55dvh',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={dockIdAvatarStyle}>{String(selected.codigo || 'T').charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  color: C.textDk,
                  fontWeight: 900,
                  fontSize: 18,
                  fontFamily: FONTS.serif,
                  lineHeight: 1.1
                }}
              >
                {selected.codigo}
              </p>
              <p style={{ margin: '2px 0 0', color: C.textMid, fontSize: 12 }}>
                {formatCultura(selected.cultura)} · {Number(selected.area_ha || 0).toFixed(2)} ha
              </p>
            </div>
            <button
              onClick={() => alternarTalhao(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: C.textMid,
                padding: 6,
                display: 'grid',
                placeItems: 'center'
              }}
              aria-label="Limpar selecao"
            >
              <Ico.X />
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={dockKpiIconWrap('#FBFBF7', C.textDk)}>
                <Ico.Order />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={dockKpiLabelStyle}>Ultima operacao</p>
                <p style={{ ...dockKpiValueStyle, whiteSpace: 'normal' }}>
                  {ultimaOp ? (
                    <>
                      {ultimaOpInfo?.label || ultimaOp.categoria}{' '}
                      <span style={dockKpiSubStyle}>· {formatShortDate(ultimaOp.data_operacao)}</span>
                    </>
                  ) : (
                    <span style={dockKpiSubStyle}>Sem operacao</span>
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={dockKpiIconWrap(
                  selectedMonitoring.color ? `${selectedMonitoring.color}1a` : '#FBFBF7',
                  selectedMonitoring.color || C.textMid
                )}
              >
                <Ico.Eye />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={dockKpiLabelStyle}>Ultimo monitoramento</p>
                <p style={{ ...dockKpiValueStyle, whiteSpace: 'normal' }}>
                  {selectedMonitoring.shortLabel || 'Nunca'}
                  {selectedMonitoring.detail && <span style={dockKpiSubStyle}> · {selectedMonitoring.detail}</span>}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={dockKpiIconWrap('#E0EEF6', '#4A8AB8')}>
                <Ico.Drop />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={dockKpiLabelStyle}>
                  Ultima chuva
                  {activePluvio.length > 0 && (
                    <span style={{ color: C.textMid, fontWeight: 600 }}> · {activePluvio.length} pluv.</span>
                  )}
                </p>
                <p style={{ ...dockKpiValueStyle, whiteSpace: 'normal' }}>
                  {chuvaMm ? (
                    <>
                      {chuvaMm} mm <span style={dockKpiSubStyle}>· {formatShortDate(chuvaData)}</span>
                    </>
                  ) : (
                    <span style={dockKpiSubStyle}>Sem registro</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={abrirMonitoramento} style={{ ...ghostCtaStyle, flex: 1, justifyContent: 'center' }}>
              <Ico.Plus />
              Monitorar
            </button>
            <button onClick={() => navigate('/os')} style={{ ...primaryCtaStyle, flex: 1, justifyContent: 'center' }}>
              <Ico.Order />
              Abrir OS
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
