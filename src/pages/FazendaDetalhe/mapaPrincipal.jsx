// Mapa principal (Menu Mapa) — versão V3 "Dock + floating widgets"
// Base do design: deliverables Tela Mapa · 3 Versões (V3) + componentes existentes
// (SimpleFarmMap, monitoramentoCockpit). Estilos inline pra evitar acoplar a
// arquivos novos de styles.js — mesma estratégia adotada no cockpit.
import { useMemo, useState } from 'react'
import { getCategoriaInfo } from '../../lib/operacoes'
import { useDevicePosition, useMediaQuery } from './hooks'
import { SimpleFarmMap } from './maps'
import { requestOfflineStorage } from './offline'
import { normalizeFeature, getMonitoramentoMeta, formatCultura, formatShortDate, formatMonitoramentoDate } from './utils'

const FONT_UI = "'Inter', -apple-system, system-ui, 'Segoe UI', sans-serif"
const FONT_MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace"

const COLOR = {
  ink: '#1a2017',
  ink2: '#4a5447',
  ink3: '#7a8276',
  line: '#e6e3d8',
  line2: '#efece2',
  surface: '#ffffff',
  surface2: '#faf9f4',
  forest: '#1f3a2a',
  forest2: '#2d5a3f',
  leaf: '#4a7c4e',
  amber: '#d99a2b',
  crimson: '#b54a3f',
  forestSoft: '#eef5e8'
}

// SVG icons (16/20px, inherit currentColor)
const Ico = {
  Menu: p => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  ),
  ChevR: p => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
  Boot: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <path d="M5 4l5-1v9l4 6h6v3H3v-3l2-2z" />
    </svg>
  ),
  Order: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  ),
  Drop: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <path d="M12 3c-3 4-6 8-6 12a6 6 0 0 0 12 0c0-4-3-8-6-12z" />
    </svg>
  ),
  Soil: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <path d="M3 18c4 0 4-3 9-3s5 3 9 3" />
      <path d="M3 14c4 0 4-3 9-3s5 3 9 3" />
      <path d="M3 22h18" />
    </svg>
  ),
  History: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 9 8 9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  ),
  Leaf: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14z" />
      <path d="M5 19l9-9" />
    </svg>
  ),
  Sum: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="4" y1="9" x2="20" y2="9" />
    </svg>
  ),
  Eye: p => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <path d="M2 12s4 -7 10 -7 10 7 10 7 -4 7 -10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  X: p => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  ),
  Layers: p => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <polygon points="12 2 22 8 12 14 2 8 12 2" />
      <polyline points="2 14 12 20 22 14" />
    </svg>
  )
}

const railBaseStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  color: COLOR.ink2,
  position: 'relative',
  background: 'transparent',
  border: 'none',
  fontFamily: FONT_UI
}

function RailIcon({ icon: IconCmp, label, active = false, badge = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        ...railBaseStyle,
        background: active ? COLOR.forest : 'transparent',
        color: active ? '#d8e8c4' : COLOR.ink2
      }}
    >
      <IconCmp />
      {badge && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: COLOR.crimson,
            border: `2px solid ${COLOR.surface}`
          }}
        />
      )}
    </button>
  )
}

function railActions({ setActiveView, navigate, setMenuOpen }) {
  return [
    {
      key: 'menu',
      icon: Ico.Menu,
      label: 'Abrir menu',
      onClick: () => (setMenuOpen ? setMenuOpen(true) : null),
      divider: true
    },
    { key: 'mapa', icon: Ico.Sum, label: 'Resumo do mapa', active: true, onClick: () => setActiveView('mapa') },
    { key: 'monitoramento', icon: Ico.Leaf, label: 'Monitoramento', onClick: () => setActiveView('monitoramento') },
    { key: 'historico', icon: Ico.History, label: 'Ordens de servico', badge: true, onClick: () => navigate('/os') },
    { key: 'chuvas', icon: Ico.Drop, label: 'Chuvas', onClick: () => setActiveView('chuvas') },
    { key: 'solo', icon: Ico.Soil, label: 'Solo', onClick: () => setActiveView('solo') }
  ]
}

function statusFromOperacao(op) {
  if (!op) return null
  // Sem campo de status no schema. Heurística: operação registrada = concluída.
  return { label: 'fechada', color: COLOR.leaf, bg: COLOR.forestSoft }
}

function pluviometroMaisProximo(pluviometros) {
  const ativos = (pluviometros || []).filter(p => p?.ativo !== false)
  return ativos[0] || null
}

function nomeTalhaoHash(codigo) {
  if (!codigo) return 0
  return String(codigo)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function chuvaMockDoTalhao(selected) {
  // Mock determinístico (mesma estratégia do código anterior, ate ter telemetria real).
  if (!selected) return null
  const seed = nomeTalhaoHash(selected.codigo)
  const total = (12 + (seed % 18) + (Number(selected.area_ha || 0) % 6)).toFixed(1)
  return { total, dataLabel: 'periodo 15 dias' }
}

function FazendaMapaPrincipalDesktop({
  fazenda,
  talhoes,
  pluviometros,
  monitoramentosResumo,
  talhaoSel,
  operacoes,
  loadOps,
  alternarTalhao,
  navigate,
  setActiveView,
  setMenuOpen,
  abrirMonitoramento
}) {
  const devicePosition = useDevicePosition(false)
  const features = useMemo(
    () =>
      talhoes
        .map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) }))
        .filter(item => item.feature),
    [talhoes]
  )
  const selected = talhaoSel || null
  const selectedMonitoring = getMonitoramentoMeta(selected ? monitoramentosResumo[selected.id] : null)
  const mapFeatures = useMemo(
    () =>
      features.map(item => {
        const monitoramento = getMonitoramentoMeta(monitoramentosResumo[item.talhao.id])
        return {
          ...item.feature,
          properties: {
            ...item.feature.properties,
            codigo: item.talhao.codigo,
            monitoramento
          }
        }
      }),
    [features, monitoramentosResumo]
  )

  async function handleFeatureClick(index) {
    const talhao = features[index]?.talhao
    if (!talhao) return
    await alternarTalhao(talhao)
  }

  const ultimaOperacao = operacoes?.[0] || null
  const ultimaOperacaoInfo = ultimaOperacao ? getCategoriaInfo(ultimaOperacao.categoria) : null
  const ultimaOperacaoStatus = statusFromOperacao(ultimaOperacao)
  const chuva = chuvaMockDoTalhao(selected)
  const pluvProx = pluviometroMaisProximo(pluviometros)
  const totalPluvAtivos = (pluviometros || []).filter(p => p?.ativo !== false).length

  const rail = railActions({ setActiveView, navigate, setMenuOpen })

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: COLOR.surface2,
        fontFamily: FONT_UI,
        color: COLOR.ink,
        overflow: 'hidden'
      }}
    >
      <SimpleFarmMap
        features={mapFeatures}
        height="100vh"
        fullBleed
        selectedCode={selected?.codigo}
        selectedMode="timeline"
        pluviometros={[]}
        devicePosition={devicePosition}
        onFeatureClick={handleFeatureClick}
      />

      {/* Left rail */}
      <div
        style={{
          position: 'absolute',
          top: 22,
          left: 22,
          width: 56,
          background: COLOR.surface,
          borderRadius: 14,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,.16)',
          zIndex: 5
        }}
      >
        {rail.map((item, idx) => (
          <div key={item.key} style={{ width: '100%' }}>
            <RailIcon
              icon={item.icon}
              label={item.label}
              active={item.key === 'mapa'}
              badge={item.badge}
              onClick={item.onClick}
            />
            {idx === 0 && (
              <div aria-hidden="true" style={{ height: 1, background: COLOR.line, margin: '4px 6px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: 22,
          left: 92,
          display: 'flex',
          alignItems: 'center',
          background: COLOR.surface,
          borderRadius: 12,
          height: 40,
          padding: '0 14px',
          fontSize: 12,
          fontFamily: FONT_MONO,
          color: COLOR.ink3,
          boxShadow: '0 4px 12px rgba(0,0,0,.14)',
          gap: 8,
          border: 'none',
          cursor: 'pointer',
          zIndex: 5
        }}
      >
        <span>{fazenda?.nome || 'Fazenda'}</span>
        <Ico.ChevR />
        <b style={{ color: COLOR.ink, fontWeight: 700 }}>{selected?.codigo || 'MAPA'}</b>
      </button>

      {/* Layers button (placeholder visual — alterna camada futura) */}
      <button
        type="button"
        aria-label="Camadas do mapa"
        style={{
          position: 'absolute',
          top: 22,
          right: selected ? 320 : 22,
          width: 40,
          height: 40,
          borderRadius: 12,
          background: COLOR.surface,
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,.18)',
          display: 'grid',
          placeItems: 'center',
          color: COLOR.ink2,
          cursor: 'pointer',
          zIndex: 5
        }}
      >
        <Ico.Layers />
      </button>

      {/* Talhão chip top-right (only when selected) */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            right: 22,
            background: COLOR.surface,
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 4px 14px rgba(0,0,0,.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 5
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: COLOR.ink }}>
              {selected.codigo}
            </div>
            <div style={{ fontSize: 11, fontFamily: FONT_MONO, color: COLOR.ink3, marginTop: 2 }}>
              {formatCultura(selected.cultura)} · {selectedMonitoring.shortLabel}
            </div>
          </div>
          <span
            style={{
              padding: '5px 10px',
              background: COLOR.forestSoft,
              color: COLOR.forest,
              borderRadius: 8,
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 700
            }}
          >
            {Number(selected.area_ha || 0).toFixed(2)} ha
          </span>
          <button
            type="button"
            onClick={() => alternarTalhao(selected)}
            aria-label="Fechar talhao selecionado"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: COLOR.ink3,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <Ico.X />
          </button>
        </div>
      )}

      {/* GPS pill + zoom (decorative — controles reais do Leaflet existem) */}
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          left: 22,
          display: 'flex',
          flexDirection: 'column',
          background: COLOR.surface,
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,.18)',
          zIndex: 4
        }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          style={{
            width: 36,
            height: 36,
            border: 'none',
            background: COLOR.surface,
            cursor: 'pointer',
            fontSize: 16,
            color: COLOR.ink2,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONT_UI,
            borderBottom: `1px solid ${COLOR.line}`
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          style={{
            width: 36,
            height: 36,
            border: 'none',
            background: COLOR.surface,
            cursor: 'pointer',
            fontSize: 16,
            color: COLOR.ink2,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONT_UI
          }}
        >
          −
        </button>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 22,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: COLOR.surface,
          borderRadius: 999,
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: 700,
          color: COLOR.forest,
          letterSpacing: '0.04em',
          boxShadow: '0 2px 8px rgba(0,0,0,.18)',
          zIndex: 4
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: COLOR.leaf,
            boxShadow: `0 0 0 4px rgba(74,124,78,.25)`
          }}
        />
        GPS · ±2 m
      </div>

      {/* Bottom dock */}
      {selected ? (
        <div
          style={{
            position: 'absolute',
            left: 96,
            right: 22,
            bottom: 22,
            background: COLOR.surface,
            borderRadius: 18,
            padding: '16px 22px',
            boxShadow: '0 10px 32px rgba(0,0,0,.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            zIndex: 5
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingRight: 18,
              borderRight: `1px solid ${COLOR.line}`,
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: COLOR.forest,
                color: '#d8e8c4',
                fontFamily: FONT_UI,
                fontWeight: 800,
                fontSize: 16,
                display: 'grid',
                placeItems: 'center'
              }}
            >
              {String(selected.codigo || 'T').charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: COLOR.ink }}>
                {selected.codigo}
              </div>
              <div style={{ fontSize: 11, fontFamily: FONT_MONO, color: COLOR.ink3, marginTop: 2 }}>
                {formatCultura(selected.cultura)} · {Number(selected.area_ha || 0).toFixed(2)} ha
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, gap: 0, minWidth: 0 }}>
            <DockKpi
              icon={<Ico.Order />}
              label="Situacao · ultima operacao"
              value={
                loadOps ? (
                  <span style={{ color: COLOR.ink3, fontStyle: 'italic', fontWeight: 500 }}>Carregando…</span>
                ) : ultimaOperacao ? (
                  <>
                    <span>{ultimaOperacaoInfo.label}</span>
                    {ultimaOperacaoStatus && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 18,
                          padding: '0 7px',
                          marginLeft: 8,
                          borderRadius: 5,
                          fontFamily: FONT_MONO,
                          fontSize: 9.5,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          background: ultimaOperacaoStatus.bg,
                          color: ultimaOperacaoStatus.color
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: ultimaOperacaoStatus.color,
                            marginRight: 5
                          }}
                        />
                        {ultimaOperacaoStatus.label}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: COLOR.ink3, fontStyle: 'italic', fontWeight: 500 }}>Sem operacoes</span>
                )
              }
              sub={ultimaOperacao ? formatShortDate(ultimaOperacao.data_operacao) : null}
            />
            <DockKpi
              icon={<Ico.Eye />}
              label="Ultimo monitoramento"
              value={
                selectedMonitoring.status === 'never' ? (
                  <span style={{ color: COLOR.ink3, fontStyle: 'italic', fontWeight: 500 }}>Sem registro</span>
                ) : (
                  <>
                    {formatMonitoramentoDate(monitoramentosResumo[selected.id]?.visitado_em)}
                    <span style={{ marginLeft: 6, fontWeight: 500, color: COLOR.ink3, fontFamily: FONT_MONO, fontSize: 11 }}>
                      · {selectedMonitoring.shortLabel}
                    </span>
                  </>
                )
              }
            />
            <DockKpi
              icon={<Ico.Drop />}
              label={`Chuva · ${totalPluvAtivos} pluv. ativos`}
              value={
                totalPluvAtivos > 0 && chuva ? (
                  <>
                    {chuva.total} mm
                    <span style={{ marginLeft: 6, fontWeight: 500, color: COLOR.ink3, fontFamily: FONT_MONO, fontSize: 11 }}>
                      · {chuva.dataLabel}
                    </span>
                  </>
                ) : (
                  <span style={{ color: COLOR.ink3, fontStyle: 'italic', fontWeight: 500 }}>
                    {pluvProx ? 'Sem leitura recente' : 'Sem pluviometros'}
                  </span>
                )
              }
              last
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={abrirMonitoramento}
              style={{
                height: 44,
                padding: '0 16px',
                borderRadius: 12,
                background: 'transparent',
                color: COLOR.ink,
                border: `1px solid ${COLOR.line}`,
                fontFamily: FONT_UI,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Ico.Boot />
              Monitorar
            </button>
            <button
              type="button"
              onClick={() => navigate('/os')}
              style={{
                height: 44,
                padding: '0 20px',
                borderRadius: 12,
                background: COLOR.forest,
                color: '#f0f5e8',
                border: 'none',
                fontFamily: FONT_UI,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Ico.Order />
              Abrir OS
            </button>
          </div>
        </div>
      ) : (
        <EmptyDock totalTalhoes={talhoes.length} setActiveView={setActiveView} />
      )}
    </section>
  )
}

function DockKpi({ icon, label, value, sub, last = false }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '0 16px',
        borderRight: last ? 'none' : `1px solid ${COLOR.line2}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: COLOR.surface2,
          border: `1px solid ${COLOR.line}`,
          display: 'grid',
          placeItems: 'center',
          color: COLOR.ink2,
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: FONT_MONO,
            color: COLOR.ink3
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLOR.ink,
            marginTop: 1,
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 10, color: COLOR.ink3, fontFamily: FONT_MONO, marginTop: 1 }}>{sub}</div>
        )}
      </div>
    </div>
  )
}

function EmptyDock({ totalTalhoes, setActiveView }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        right: 22,
        bottom: 22,
        background: COLOR.surface,
        borderRadius: 18,
        padding: '16px 22px',
        boxShadow: '0 10px 32px rgba(0,0,0,.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        zIndex: 5,
        fontFamily: FONT_UI
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontFamily: FONT_MONO,
            color: COLOR.ink3,
            marginBottom: 4
          }}
        >
          Selecione um talhao
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.ink, letterSpacing: '-0.005em' }}>
          {totalTalhoes > 0
            ? `${totalTalhoes} ${totalTalhoes === 1 ? 'talhao disponivel' : 'talhoes disponiveis'} no mapa`
            : 'Nenhum talhao cadastrado nesta fazenda'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setActiveView(totalTalhoes > 0 ? 'monitoramento' : 'gerencial')}
        style={{
          height: 44,
          padding: '0 20px',
          borderRadius: 12,
          background: COLOR.forest,
          color: '#f0f5e8',
          border: 'none',
          fontFamily: FONT_UI,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer'
        }}
      >
        {totalTalhoes > 0 ? 'Ver monitoramento' : 'Cadastrar talhao'}
      </button>
    </div>
  )
}

function FazendaMapaPrincipalMobile({
  fazenda,
  talhoes,
  pluviometros,
  monitoramentosResumo,
  talhaoSel,
  operacoes,
  loadOps,
  alternarTalhao,
  navigate,
  setActiveView,
  setMenuOpen,
  abrirMonitoramento
}) {
  const devicePosition = useDevicePosition(true)
  const [tab, setTab] = useState('resumo')
  const features = useMemo(
    () =>
      talhoes
        .map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) }))
        .filter(item => item.feature),
    [talhoes]
  )
  const selected = talhaoSel || null
  const selectedMonitoring = getMonitoramentoMeta(selected ? monitoramentosResumo[selected.id] : null)
  const mapFeatures = useMemo(
    () =>
      features.map(item => {
        const monitoramento = getMonitoramentoMeta(monitoramentosResumo[item.talhao.id])
        return {
          ...item.feature,
          properties: { ...item.feature.properties, codigo: item.talhao.codigo, monitoramento }
        }
      }),
    [features, monitoramentosResumo]
  )

  async function handleFeatureClick(index) {
    const talhao = features[index]?.talhao
    if (!talhao) return
    await alternarTalhao(talhao)
  }

  const ultimaOperacao = operacoes?.[0] || null
  const ultimaOperacaoInfo = ultimaOperacao ? getCategoriaInfo(ultimaOperacao.categoria) : null
  const chuva = chuvaMockDoTalhao(selected)
  const totalPluvAtivos = (pluviometros || []).filter(p => p?.ativo !== false).length

  const tabs = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'historico', label: 'Historico' },
    { id: 'chuvas', label: 'Chuvas' },
    { id: 'solo', label: 'Solo' }
  ]

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        background: COLOR.surface2,
        fontFamily: FONT_UI,
        color: COLOR.ink,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'relative', height: '46%', flexShrink: 0, overflow: 'hidden' }}>
        <SimpleFarmMap
          features={mapFeatures}
          height="100%"
          fullBleed
          selectedCode={selected?.codigo}
          selectedMode="timeline"
          pluviometros={[]}
          devicePosition={devicePosition}
          onFeatureClick={handleFeatureClick}
        />
        <button
          type="button"
          onClick={() => (setMenuOpen ? setMenuOpen(true) : null)}
          aria-label="Abrir menu"
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            width: 40,
            height: 40,
            borderRadius: 12,
            background: COLOR.forest,
            color: '#d8e8c4',
            display: 'grid',
            placeItems: 'center',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,.22)',
            zIndex: 3,
            cursor: 'pointer'
          }}
        >
          <Ico.Menu />
        </button>
        <button
          type="button"
          aria-label="Camadas"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 40,
            height: 40,
            borderRadius: 12,
            background: COLOR.surface,
            color: COLOR.ink2,
            display: 'grid',
            placeItems: 'center',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,.22)',
            zIndex: 3,
            cursor: 'pointer'
          }}
        >
          <Ico.Layers />
        </button>
        <div
          style={{
            position: 'absolute',
            top: 64,
            right: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: COLOR.surface,
            borderRadius: 999,
            fontFamily: FONT_MONO,
            fontSize: 10,
            fontWeight: 700,
            color: COLOR.forest,
            boxShadow: '0 2px 8px rgba(0,0,0,.18)',
            zIndex: 3
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: COLOR.leaf,
              boxShadow: '0 0 0 3px rgba(74,124,78,.25)'
            }}
          />
          GPS · ±2m
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          background: COLOR.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          boxShadow: '0 -8px 28px rgba(0,0,0,.18)',
          marginTop: -22,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          aria-hidden="true"
          style={{ width: 36, height: 4, borderRadius: 999, background: COLOR.line, margin: '8px auto 12px' }}
        />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 20 }}>
          {selected ? (
            <>
              <div style={{ padding: '0 20px 14px' }}>
                <div
                  style={{
                    fontSize: 9.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontFamily: FONT_MONO,
                    color: COLOR.ink3,
                    marginBottom: 5
                  }}
                >
                  Talhao selecionado
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: COLOR.ink,
                    letterSpacing: '-0.018em',
                    lineHeight: 1.15
                  }}
                >
                  {selected.codigo}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 6,
                    fontSize: 12,
                    color: COLOR.ink2,
                    fontFamily: FONT_MONO
                  }}
                >
                  <span
                    style={{
                      padding: '3px 9px',
                      background: COLOR.forestSoft,
                      color: COLOR.forest,
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 11
                    }}
                  >
                    {Number(selected.area_ha || 0).toFixed(2)} ha
                  </span>
                  <span>{formatCultura(selected.cultura)}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLOR.ink3 }} />
                  <span>{selectedMonitoring.shortLabel}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px' }}>
                <button
                  type="button"
                  onClick={abrirMonitoramento}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    background: COLOR.forest,
                    color: '#f0f5e8',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontFamily: FONT_UI
                  }}
                >
                  <Ico.Boot />
                  Monitorar
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/os')}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    background: COLOR.surface,
                    color: COLOR.ink,
                    border: `1px solid ${COLOR.line}`,
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontFamily: FONT_UI
                  }}
                >
                  <Ico.Order />
                  Abrir OS
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: '0 20px 14px',
                  overflowX: 'auto'
                }}
              >
                {tabs.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    style={{
                      flexShrink: 0,
                      padding: '8px 14px',
                      borderRadius: 999,
                      background: tab === t.id ? COLOR.forest : 'transparent',
                      color: tab === t.id ? '#f0f5e8' : COLOR.ink2,
                      border: tab === t.id ? 'none' : `1px solid ${COLOR.line}`,
                      fontFamily: FONT_UI,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'resumo' && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <MobileStatRow
                    icon={<Ico.Order />}
                    label="Situacao · ultima operacao"
                    value={
                      loadOps ? (
                        <em style={{ color: COLOR.ink3, fontStyle: 'italic' }}>Carregando…</em>
                      ) : ultimaOperacao ? (
                        `${ultimaOperacaoInfo.label} · ${formatShortDate(ultimaOperacao.data_operacao)}`
                      ) : (
                        <em style={{ color: COLOR.ink3, fontStyle: 'italic' }}>Sem operacoes</em>
                      )
                    }
                  />
                  <MobileStatRow
                    icon={<Ico.Eye />}
                    label="Ultimo monitoramento"
                    value={
                      selectedMonitoring.status === 'never' ? (
                        <em style={{ color: COLOR.ink3, fontStyle: 'italic' }}>Sem registro</em>
                      ) : (
                        `${formatMonitoramentoDate(monitoramentosResumo[selected.id]?.visitado_em)} · ${selectedMonitoring.shortLabel}`
                      )
                    }
                  />
                  <MobileStatRow
                    icon={<Ico.Drop />}
                    label={`Chuva · ${totalPluvAtivos} pluv. ativos`}
                    value={
                      totalPluvAtivos > 0 && chuva ? (
                        `${chuva.total} mm · ${chuva.dataLabel}`
                      ) : (
                        <em style={{ color: COLOR.ink3, fontStyle: 'italic' }}>Sem pluviometros</em>
                      )
                    }
                  />
                </div>
              )}

              {tab === 'historico' && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {operacoes && operacoes.length > 0 ? (
                    operacoes.slice(0, 6).map((op, idx) => (
                      <MobileHistRow
                        key={op.id || idx}
                        date={formatShortDate(op.data_operacao)}
                        title={getCategoriaInfo(op.categoria).label}
                        sub="Concluida"
                      />
                    ))
                  ) : (
                    <p style={{ fontSize: 13, color: COLOR.ink3, padding: '16px 0' }}>
                      Sem operacoes registradas neste talhao.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/os')}
                    style={{
                      marginTop: 8,
                      padding: '10px 14px',
                      background: 'transparent',
                      color: COLOR.forest,
                      border: `1px solid ${COLOR.line}`,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Ver ordens de servico
                  </button>
                </div>
              )}

              {tab === 'chuvas' && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <MobileStatRow
                    icon={<Ico.Drop />}
                    label="Acumulado estimado"
                    value={
                      totalPluvAtivos > 0 && chuva ? `${chuva.total} mm` : (
                        <em style={{ color: COLOR.ink3, fontStyle: 'italic' }}>Sem leitura</em>
                      )
                    }
                  />
                  <MobileStatRow
                    icon={<Ico.Drop />}
                    label="Pluviometros ativos"
                    value={`${totalPluvAtivos}`}
                  />
                  <button
                    type="button"
                    onClick={() => setActiveView('chuvas')}
                    style={{
                      marginTop: 8,
                      padding: '12px 14px',
                      background: COLOR.forest,
                      color: '#f0f5e8',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Abrir mapa interpolado
                  </button>
                </div>
              )}

              {tab === 'solo' && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <MobileStatRow icon={<Ico.Soil />} label="Camada atual" value="Mapa de solo disponivel" />
                  <MobileStatRow icon={<Ico.Soil />} label="Fertilidade" value={<em style={{ color: COLOR.ink3, fontStyle: 'italic' }}>Aguardando leitura</em>} />
                  <button
                    type="button"
                    onClick={() => setActiveView('solo')}
                    style={{
                      marginTop: 8,
                      padding: '12px 14px',
                      background: COLOR.forest,
                      color: '#f0f5e8',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Abrir pagina Solo
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '8px 20px 16px' }}>
              <div
                style={{
                  fontSize: 9.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontFamily: FONT_MONO,
                  color: COLOR.ink3,
                  marginBottom: 5
                }}
              >
                {fazenda?.nome || 'Fazenda'}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLOR.ink,
                  letterSpacing: '-0.005em'
                }}
              >
                {talhoes.length > 0
                  ? 'Toque em um talhao no mapa para ver detalhes'
                  : 'Nenhum talhao cadastrado'}
              </div>
              <button
                type="button"
                onClick={() => setActiveView(talhoes.length > 0 ? 'monitoramento' : 'gerencial')}
                style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: COLOR.forest,
                  color: '#f0f5e8',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {talhoes.length > 0 ? 'Ver monitoramento' : 'Cadastrar talhao'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function MobileStatRow({ icon, label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${COLOR.line2}`
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: COLOR.surface2,
          border: `1px solid ${COLOR.line}`,
          display: 'grid',
          placeItems: 'center',
          color: COLOR.ink2,
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: FONT_MONO,
            color: COLOR.ink3
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.ink, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function MobileHistRow({ date, title, sub }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${COLOR.line2}`
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: COLOR.ink3,
          width: 56,
          flexShrink: 0
        }}
      >
        {date}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.ink }}>{title}</div>
        <div style={{ fontSize: 11, color: COLOR.ink3, marginTop: 2 }}>{sub}</div>
      </div>
      <Ico.ChevR />
    </div>
  )
}

export function FazendaMapaPrincipal(props) {
  const isDesktop = useMediaQuery('(min-width: 900px)')
  // Garante que abrirMonitoramento exista mesmo com setShowNovaOp ausente
  async function abrirMonitoramento() {
    await requestOfflineStorage()
    props.setActiveView('monitoramento-registro')
  }
  const merged = { ...props, abrirMonitoramento }
  return isDesktop ? <FazendaMapaPrincipalDesktop {...merged} /> : <FazendaMapaPrincipalMobile {...merged} />
}

