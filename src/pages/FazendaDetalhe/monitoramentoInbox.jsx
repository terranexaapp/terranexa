import { useEffect, useMemo, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  listarMonitoramentosFazenda,
  listarPontosFazenda,
  listarPontosDoMonitoramento,
  getSeveridadeInfo,
  ESCALAS_SEVERIDADE
} from '../../lib/monitoramentos'
import { podeAbrirOrdemServico, podeVerPeriodosLongosMonitoramento } from '../../lib/fazendaPapeis'
import { useMediaQuery } from './hooks'
import { formatCultura, formatMonitoramentoDate, getMonitoramentoMeta } from './utils'
import { requestOfflineStorage } from './offline'
import { eyebrowStyle } from './styles'

const C = theme.normal

const FONTS = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'SF Mono', Monaco, 'Courier New', monospace"
}

const panelStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  overflow: 'hidden'
}

const filterRailButton = (active, dotColor) => ({
  width: '100%',
  background: active ? C.greenDp : 'transparent',
  color: active ? C.bg : C.textDk,
  border: `1px solid ${active ? C.greenDp : 'transparent'}`,
  borderRadius: 9,
  padding: '9px 11px',
  display: 'grid',
  gridTemplateColumns: dotColor ? '8px 1fr auto' : '1fr auto',
  gap: 9,
  alignItems: 'center',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: FONTS.sans
})

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

const periodBtnStyle = (active) => ({
  background: active ? C.greenDp : 'transparent',
  color: active ? C.bg : C.textMid,
  border: 'none',
  borderRadius: 7,
  padding: '7px 12px',
  fontWeight: 900,
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: FONTS.sans
})

const pillStyle = (color, bg, border) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: bg || C.greenLight,
  color: color || C.greenDp,
  border: border ? `1px solid ${border}` : 'none',
  borderRadius: 999,
  padding: '4px 9px',
  fontSize: 10,
  fontFamily: FONTS.mono,
  fontWeight: 900,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap'
})

function severidadeLabel(id) {
  return getSeveridadeInfo(id)?.label || 'Sem visita'
}

function exportToCsv(filename, rows) {
  if (!rows.length) return
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n;]/.test(s) ? `"${s}"` : s
  }
  const headers = Object.keys(rows[0])
  const csv = [headers.join(';'), ...rows.map(r => headers.map(h => escape(r[h])).join(';'))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function MonitoramentoInboxView({
  fazendaId,
  fazenda,
  talhoes = [],
  monitoramentosResumo = {},
  abrirTalhao,
  setActiveView,
  navigate,
  acesso
}) {
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const canOpenOs = podeAbrirOrdemServico(acesso)
  const canUseLongPeriods = isDesktop && podeVerPeriodosLongosMonitoramento(acesso)
  const periodOptions = useMemo(() => (canUseLongPeriods ? [8, 30, 90] : [8]), [canUseLongPeriods])
  const [periodo, setPeriodo] = useState(8)
  const [filtroSev, setFiltroSev] = useState('todas')
  const [filtroTecnico, setFiltroTecnico] = useState(null)
  const [filtroCultura, setFiltroCultura] = useState(null)
  const [filtroTalhao, setFiltroTalhao] = useState(null)
  const [ordenacao, setOrdenacao] = useState('data')
  const [selectedId, setSelectedId] = useState(null)
  const [visitas, setVisitas] = useState([])
  const [pontos, setPontos] = useState([])
  const [pontosSel, setPontosSel] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [erro, setErro] = useState('')

  const talhoesMap = useMemo(() => new Map(talhoes.map(t => [t.id, t])), [talhoes])

  useEffect(() => {
    if (!periodOptions.includes(periodo)) setPeriodo(8)
  }, [periodOptions, periodo])

  useEffect(() => {
    if (!fazendaId) return
    let active = true
    setLoading(true)
    setErro('')
    ;(async () => {
      try {
        const dataInicio = new Date(Date.now() - periodo * 86400000).toISOString().slice(0, 10)
        const [{ monitoramentos }, pontosArr] = await Promise.all([
          listarMonitoramentosFazenda(fazendaId, { dataInicio }),
          listarPontosFazenda(fazendaId, { dataInicio })
        ])
        if (!active) return
        setVisitas(monitoramentos)
        setPontos(pontosArr)
      } catch (err) {
        if (active) setErro(err.message || 'Nao foi possivel carregar visitas')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [fazendaId, periodo])

  const pontosByVisita = useMemo(() => {
    const map = new Map()
    pontos.forEach(p => {
      const arr = map.get(p.monitoramento_id) || []
      arr.push(p)
      map.set(p.monitoramento_id, arr)
    })
    return map
  }, [pontos])

  function tecnicoNome(visita) {
    return visita?.tecnico_nome || 'Sem tecnico'
  }

  function severidadeAgregada(visita) {
    const pts = pontosByVisita.get(visita.id) || []
    if (visita.severidade && ESCALAS_SEVERIDADE.find(s => s.id === visita.severidade)) {
      return visita.severidade
    }
    if (pts.some(p => p.severidade === 'nde')) return 'nde'
    if (pts.some(p => p.severidade === 'severa')) return 'severa'
    if (pts.some(p => p.severidade === 'moderada')) return 'moderada'
    if (pts.length) return 'leve'
    return null
  }

  const tecnicos = useMemo(() => {
    const counts = new Map()
    visitas.forEach(v => {
      const nome = tecnicoNome(v)
      counts.set(nome, (counts.get(nome) || 0) + 1)
    })
    return Array.from(counts.entries()).map(([n, c]) => ({ nome: n, count: c }))
  }, [visitas])

  const culturas = useMemo(() => {
    const counts = new Map()
    visitas.forEach(v => {
      const t = talhoesMap.get(v.talhao_id)
      const cult = t?.cultura ? formatCultura(t.cultura) : 'Sem cultura'
      counts.set(cult, (counts.get(cult) || 0) + 1)
    })
    return Array.from(counts.entries()).map(([n, c]) => ({ nome: n, count: c }))
  }, [visitas, talhoesMap])

  const counts = useMemo(() => {
    return {
      todas: visitas.length,
      severa: visitas.filter(v => ['severa', 'nde'].includes(severidadeAgregada(v))).length,
      moderada: visitas.filter(v => severidadeAgregada(v) === 'moderada').length,
      leve: visitas.filter(v => {
        const s = severidadeAgregada(v)
        return s === 'leve' || s == null
      }).length
    }
  }, [visitas, pontosByVisita])

  const visitasFiltradas = useMemo(() => {
    let list = [...visitas]
    if (filtroSev !== 'todas') {
      if (filtroSev === 'severa') {
        list = list.filter(v => ['severa', 'nde'].includes(severidadeAgregada(v)))
      } else if (filtroSev === 'leve') {
        list = list.filter(v => {
          const s = severidadeAgregada(v)
          return s === 'leve' || s == null
        })
      } else {
        list = list.filter(v => severidadeAgregada(v) === filtroSev)
      }
    }
    if (filtroTecnico) list = list.filter(v => tecnicoNome(v) === filtroTecnico)
    if (filtroCultura) {
      list = list.filter(v => {
        const t = talhoesMap.get(v.talhao_id)
        const cult = t?.cultura ? formatCultura(t.cultura) : 'Sem cultura'
        return cult === filtroCultura
      })
    }
    if (filtroTalhao) list = list.filter(v => v.talhao_id === filtroTalhao)
    if (ordenacao === 'data') {
      list.sort((a, b) => new Date(b.visitado_em) - new Date(a.visitado_em))
    } else if (ordenacao === 'severidade') {
      const ordem = { nde: 0, severa: 1, moderada: 2, leve: 3 }
      list.sort((a, b) => (ordem[severidadeAgregada(a)] ?? 9) - (ordem[severidadeAgregada(b)] ?? 9))
    } else if (ordenacao === 'pontos') {
      list.sort((a, b) => (pontosByVisita.get(b.id)?.length || 0) - (pontosByVisita.get(a.id)?.length || 0))
    }
    return list
  }, [visitas, filtroSev, filtroTecnico, filtroCultura, filtroTalhao, ordenacao, pontosByVisita, talhoesMap])

  useEffect(() => {
    if (visitasFiltradas.length === 0) {
      setSelectedId(null)
      return
    }
    if (!visitasFiltradas.find(v => v.id === selectedId)) {
      setSelectedId(visitasFiltradas[0].id)
    }
  }, [visitasFiltradas, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setPontosSel([])
      return
    }
    let active = true
    setLoadingDetalhe(true)
    listarPontosDoMonitoramento(selectedId)
      .then(data => {
        if (active) setPontosSel(data || [])
      })
      .catch(() => {
        if (active) setPontosSel([])
      })
      .finally(() => {
        if (active) setLoadingDetalhe(false)
      })
    return () => {
      active = false
    }
  }, [selectedId])

  const selected = visitas.find(v => v.id === selectedId)
  const selectedTalhao = selected ? talhoesMap.get(selected.talhao_id) : null
  const selectedSev = selected ? severidadeAgregada(selected) : null
  const selectedSevInfo = selectedSev ? getSeveridadeInfo(selectedSev) : null
  const selectedPontos = pontosSel.length
    ? pontosSel
    : selected
      ? pontosByVisita.get(selected.id) || []
      : []

  const danoMedio = useMemo(() => {
    const valores = selectedPontos
      .map(p => Number(p.percentual_dano))
      .filter(v => !Number.isNaN(v) && v > 0)
    if (!valores.length) return 0
    return Math.round(valores.reduce((s, v) => s + v, 0) / valores.length)
  }, [selectedPontos])

  const kpis = useMemo(() => {
    const totalPontos = pontos.length
    const criticas = pontos.filter(p => ['severa', 'nde'].includes(p.severidade)).length
    const moderadas = pontos.filter(p => p.severidade === 'moderada').length
    const danoArr = pontos.map(p => Number(p.percentual_dano)).filter(v => !Number.isNaN(v) && v > 0)
    const danoMed = danoArr.length ? Math.round(danoArr.reduce((s, v) => s + v, 0) / danoArr.length) : 0
    return {
      total: visitas.length,
      criticas,
      moderadas,
      danoMed,
      totalPontos
    }
  }, [visitas, pontos])

  async function novaVisita() {
    await requestOfflineStorage()
    const target = selectedTalhao || talhoes[0]
    if (!target) {
      alert('Cadastre um talhão antes de iniciar uma visita.')
      return
    }
    await abrirTalhao(target)
    setActiveView('monitoramento-registro')
  }

  async function abrirOSDoTalhao() {
    if (!canOpenOs) return
    if (selectedTalhao) await abrirTalhao(selectedTalhao)
    navigate('/os')
  }

  function exportarCsv() {
    if (!visitasFiltradas.length) {
      alert('Nenhuma visita no período/filtro selecionado.')
      return
    }
    const rows = visitasFiltradas.map(v => {
      const t = talhoesMap.get(v.talhao_id)
      const pts = pontosByVisita.get(v.id) || []
      const sev = severidadeAgregada(v)
      return {
        data: formatMonitoramentoDate(v.visitado_em),
        talhao: t?.codigo || '—',
        cultura: t?.cultura ? formatCultura(t.cultura) : '—',
        severidade: severidadeLabel(sev),
        tecnico: tecnicoNome(v),
        pontos: pts.length,
        observacoes: v.observacoes || ''
      }
    })
    const stamp = new Date().toISOString().slice(0, 10)
    exportToCsv(`visitas-${fazenda?.nome || 'fazenda'}-${stamp}.csv`, rows)
  }

  function limparFiltros() {
    setFiltroSev('todas')
    setFiltroTecnico(null)
    setFiltroCultura(null)
    setFiltroTalhao(null)
  }

  const filtros = [
    { id: 'todas', label: 'Todas', dot: null },
    { id: 'severa', label: 'Severa + NDE', dot: C.redDk },
    { id: 'moderada', label: 'Moderada', dot: C.amberDk },
    { id: 'leve', label: 'Leve · sem dano', dot: C.greenDp }
  ]

  return (
    <section
      style={{
        display: 'grid',
        gap: 16,
        padding: 'clamp(16px, 3vw, 24px)',
        fontFamily: FONTS.sans,
        color: C.textDk
      }}
    >
      {/* Hero */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
          paddingBottom: 12,
          borderBottom: `1px solid ${C.border}`
        }}
      >
        <div>
          <button
            onClick={() => setActiveView('monitoramento')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 11,
              color: C.greenDp,
              fontWeight: 900,
              fontFamily: FONTS.sans,
              marginBottom: 4
            }}
          >
            ← Voltar ao mapa
          </button>
          <p style={eyebrowStyle}>MONITORAMENTO · SCOUTING</p>
          <h1
            style={{
              margin: '6px 0 0',
              fontSize: 28,
              color: C.textDk,
              fontWeight: 800,
              fontFamily: FONTS.serif,
              lineHeight: 1.05
            }}
          >
            Inbox do técnico
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textMid, maxWidth: 560, lineHeight: 1.45 }}>
            Todas as visitas a campo registradas em {fazenda?.nome || 'esta fazenda'}. Triagem por severidade,
            técnico e cultura. Clique numa visita pra ver detalhes{canOpenOs ? ' e abrir OS' : ''}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: 3,
              background: C.bg
            }}
          >
            {periodOptions.map(d => (
              <button key={d} onClick={() => setPeriodo(d)} style={periodBtnStyle(periodo === d)}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={exportarCsv} style={secondaryBtnStyle}>
            Exportar CSV
          </button>
          <button onClick={novaVisita} style={primaryBtnStyle}>
            + Nova visita
          </button>
        </div>
      </div>

      {erro && (
        <div
          style={{
            background: C.redLight,
            border: `1px solid ${C.red}33`,
            color: C.redDk,
            padding: 12,
            borderRadius: 10,
            fontSize: 12
          }}
        >
          {erro}
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { l: 'Visitas no período', v: kpis.total, tone: C.textDk, sub: `${periodo} dias` },
          { l: 'Severa + NDE', v: kpis.criticas, tone: kpis.criticas > 0 ? C.redDk : C.greenDp, sub: 'Pontos críticos' },
          { l: 'Moderada', v: kpis.moderadas, tone: C.amberDk, sub: 'Pontos moderados' },
          { l: 'Dano médio', v: `${kpis.danoMed}%`, tone: kpis.danoMed > 10 ? C.amberDk : C.greenDp, sub: 'Ponderado' },
          { l: 'Pontos GPS', v: kpis.totalPontos, tone: C.greenDp, sub: 'Georreferenciados' }
        ].map((k, i) => (
          <div
            key={i}
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 12
            }}
          >
            <p style={eyebrowStyle}>{k.l.toUpperCase()}</p>
            <strong
              style={{
                display: 'block',
                marginTop: 4,
                color: k.tone,
                fontSize: 22,
                fontFamily: FONTS.serif,
                fontWeight: 800,
                lineHeight: 1
              }}
            >
              {k.v}
            </strong>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 10,
                color: C.textMid,
                fontFamily: FONTS.mono,
                fontWeight: 700
              }}
            >
              {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Two-pane: filters | list | detail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(170px, 200px) minmax(0, 1.4fr) minmax(340px, 1fr)',
          gap: 12,
          alignItems: 'stretch',
          minHeight: 540
        }}
      >
        {/* Filters rail */}
        <div
          style={{
            ...panelStyle,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <p style={{ ...eyebrowStyle, marginLeft: 4 }}>SEVERIDADE</p>
          {filtros.map(f => {
            const active = filtroSev === f.id
            return (
              <button key={f.id} onClick={() => setFiltroSev(f.id)} style={filterRailButton(active, f.dot)}>
                {f.dot && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: f.dot,
                      display: 'inline-block'
                    }}
                  />
                )}
                <span style={{ fontSize: 12, fontWeight: 800 }}>{f.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: FONTS.mono,
                    fontWeight: 900,
                    color: active ? 'rgba(255,255,255,0.85)' : C.textDim
                  }}
                >
                  {counts[f.id] ?? 0}
                </span>
              </button>
            )
          })}

          {tecnicos.length > 0 && (
            <>
              <p style={{ ...eyebrowStyle, marginLeft: 4, marginTop: 14 }}>TÉCNICO</p>
              {tecnicos.map(t => {
                const active = filtroTecnico === t.nome
                const initials = t.nome
                  .split(' ')
                  .map(s => s[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                return (
                  <button
                    key={t.nome}
                    onClick={() => setFiltroTecnico(active ? null : t.nome)}
                    style={{
                      ...filterRailButton(active, null),
                      gridTemplateColumns: '22px 1fr auto'
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 99,
                        background: active ? 'rgba(255,255,255,0.16)' : C.greenLight,
                        color: active ? C.bg : C.greenDp,
                        fontSize: 9,
                        fontWeight: 900,
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      {initials}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.nome}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: FONTS.mono,
                        fontWeight: 900,
                        color: active ? 'rgba(255,255,255,0.85)' : C.textDim
                      }}
                    >
                      {t.count}
                    </span>
                  </button>
                )
              })}
            </>
          )}

          {culturas.length > 0 && (
            <>
              <p style={{ ...eyebrowStyle, marginLeft: 4, marginTop: 14 }}>CULTURA</p>
              {culturas.map(c => {
                const active = filtroCultura === c.nome
                return (
                  <button
                    key={c.nome}
                    onClick={() => setFiltroCultura(active ? null : c.nome)}
                    style={filterRailButton(active, C.greenDp)}
                  >
                    <span
                      style={{ width: 8, height: 8, borderRadius: 99, background: C.greenDp, display: 'inline-block' }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{c.nome}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: FONTS.mono,
                        fontWeight: 900,
                        color: active ? 'rgba(255,255,255,0.85)' : C.textDim
                      }}
                    >
                      {c.count}
                    </span>
                  </button>
                )
              })}
            </>
          )}

          {(filtroSev !== 'todas' || filtroTecnico || filtroCultura || filtroTalhao) && (
            <button
              onClick={limparFiltros}
              style={{
                marginTop: 14,
                background: 'transparent',
                color: C.greenDp,
                border: `1px solid ${C.greenDp}55`,
                borderRadius: 9,
                padding: '7px 10px',
                fontSize: 11,
                fontWeight: 900,
                cursor: 'pointer',
                fontFamily: FONTS.sans
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '11px 14px',
              borderBottom: `1px solid ${C.borderSoft}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap'
            }}
          >
            <div>
              <p style={eyebrowStyle}>VISITAS</p>
              <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 800, color: C.textDk }}>
                {visitasFiltradas.length} resultado{visitasFiltradas.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'data', label: 'Data' },
                { id: 'severidade', label: 'Severidade' },
                { id: 'pontos', label: 'Pontos' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setOrdenacao(s.id)}
                  style={{
                    ...secondaryBtnStyle,
                    padding: '6px 10px',
                    fontSize: 11,
                    background: ordenacao === s.id ? C.greenLight : C.bg,
                    color: ordenacao === s.id ? C.greenDp : C.textDk,
                    borderColor: ordenacao === s.id ? C.greenDp : C.border
                  }}
                >
                  ↓ {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 560 }}>
            {loading && (
              <p
                style={{
                  margin: 0,
                  padding: 18,
                  fontSize: 10,
                  color: C.textDim,
                  fontFamily: FONTS.mono,
                  fontWeight: 800,
                  textAlign: 'center'
                }}
              >
                CARREGANDO…
              </p>
            )}
            {!loading && visitasFiltradas.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>
                  Nenhuma visita encontrada nos filtros selecionados.
                </p>
                <button onClick={novaVisita} style={{ ...primaryBtnStyle, marginTop: 12 }}>
                  + Registrar primeira visita
                </button>
              </div>
            )}
            {!loading &&
              visitasFiltradas.map(v => {
                const sev = severidadeAgregada(v)
                const sevInfo = getSeveridadeInfo(sev)
                const cor = sevInfo?.cor || C.textDim
                const t = talhoesMap.get(v.talhao_id)
                const pts = pontosByVisita.get(v.id) || []
                const isSel = v.id === selectedId
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedId(v.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: isSel ? '#F0F7E8' : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${C.borderSoft}`,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: '4px 1fr',
                      gap: 12,
                      position: 'relative'
                    }}
                  >
                    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 99, background: cor }} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'baseline',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 8,
                            minWidth: 0,
                            flex: 1
                          }}
                        >
                          <strong style={{ fontSize: 13, color: C.textDk, fontWeight: 900 }}>
                            {t?.codigo || 'Talhão'}
                          </strong>
                          <span style={{ fontSize: 12, color: C.textMid, whiteSpace: 'nowrap' }}>
                            {t?.cultura ? formatCultura(t.cultura) : '—'}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: C.textDim,
                            fontFamily: FONTS.mono,
                            letterSpacing: '0.5px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
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
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 12,
                          color: C.textDk,
                          lineHeight: 1.35,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {v.observacoes ? (
                          v.observacoes
                        ) : (
                          <em style={{ color: C.textDim }}>Sem observações</em>
                        )}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          gap: 10,
                          marginTop: 7,
                          alignItems: 'center',
                          fontSize: 10,
                          color: C.textMid,
                          fontFamily: FONTS.mono,
                          fontWeight: 700,
                          flexWrap: 'wrap'
                        }}
                      >
                        <span style={pillStyle(cor, `${cor}1a`)}>{sevInfo?.label || 'Sem severidade'}</span>
                        <span>· {tecnicoNome(v)}</span>
                        <span>· {pts.length} pts</span>
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>

        {/* Detail pane */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          {!selected && (
            <div style={{ padding: 24, textAlign: 'center', flex: 1, display: 'grid', placeItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>
                Selecione uma visita para ver detalhes.
              </p>
            </div>
          )}
          {selected && (
            <>
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: `1px solid ${C.borderSoft}`,
                  background: selectedSevInfo ? `${selectedSevInfo.cor}0a` : C.bgLight
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 10,
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <p
                      style={{
                        ...eyebrowStyle,
                        color: selectedSevInfo?.cor || C.greenDp
                      }}
                    >
                      OCORRÊNCIA · #{String(selected.id).slice(0, 8).toUpperCase()}
                    </p>
                    <h2
                      style={{
                        margin: '4px 0 0',
                        fontSize: 22,
                        fontFamily: FONTS.serif,
                        fontWeight: 900,
                        color: C.textDk,
                        lineHeight: 1.05
                      }}
                    >
                      {selectedTalhao?.codigo || 'Talhão'} ·{' '}
                      {selectedTalhao?.cultura ? formatCultura(selectedTalhao.cultura) : '—'}
                    </h2>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 11,
                        color: C.textMid,
                        fontFamily: FONTS.mono,
                        fontWeight: 700
                      }}
                    >
                      {formatMonitoramentoDate(selected.visitado_em).toUpperCase()} ·{' '}
                      {tecnicoNome(selected).toUpperCase()}
                    </p>
                  </div>
                  {selectedSevInfo && (
                    <span
                      style={pillStyle(selectedSevInfo.cor, `${selectedSevInfo.cor}22`, `${selectedSevInfo.cor}55`)}
                    >
                      {selectedSevInfo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div
                style={{
                  padding: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  borderBottom: `1px solid ${C.borderSoft}`
                }}
              >
                {[
                  {
                    l: 'Dano médio',
                    v: `${danoMedio}%`,
                    tone: danoMedio > 15 ? C.redDk : danoMedio > 5 ? C.amberDk : C.greenDp
                  },
                  { l: 'Pontos GPS', v: selectedPontos.length, tone: C.textDk },
                  {
                    l: 'Sem visita',
                    v: selectedTalhao ? getMonitoramentoMeta(monitoramentosResumo[selectedTalhao.id]).shortLabel : '—',
                    tone: C.textDk
                  }
                ].map(k => (
                  <div
                    key={k.l}
                    style={{
                      background: '#FBFBF7',
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 10
                    }}
                  >
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

              {/* Pragas list */}
              <div style={{ padding: 14, borderBottom: `1px solid ${C.borderSoft}` }}>
                <p style={eyebrowStyle}>PRAGAS / DOENÇAS</p>
                {loadingDetalhe && (
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 10,
                      color: C.textDim,
                      fontFamily: FONTS.mono,
                      fontWeight: 800
                    }}
                  >
                    CARREGANDO…
                  </p>
                )}
                {!loadingDetalhe && selectedPontos.length === 0 && (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: C.textDim }}>
                    <em>Nenhuma ocorrência registrada nesta visita.</em>
                  </p>
                )}
                {!loadingDetalhe && selectedPontos.length > 0 && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                    {selectedPontos.slice(0, 6).map(p => {
                      const sev = getSeveridadeInfo(p.severidade)
                      const cor = sev?.cor || C.textDim
                      const nome =
                        p.praga_doenca?.nome_comum ||
                        p.praga_doenca?.nome_cientifico ||
                        (p.tipo === 'ocorrencia' ? 'Ocorrência' : p.tipo || 'Ponto')
                      const incidencia = p.percentual_dano != null ? `${Number(p.percentual_dano)}%` : null
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '4px 1fr auto',
                            gap: 10,
                            padding: '10px 12px',
                            background: '#FBFBF7',
                            border: `1px solid ${C.borderSoft}`,
                            borderRadius: 9,
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ width: 3, alignSelf: 'stretch', background: cor, borderRadius: 99 }} />
                          <div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.textDk }}>{nome}</p>
                            {(p.recomendacao || p.observacoes) && (
                              <p
                                style={{
                                  margin: '3px 0 0',
                                  fontSize: 11,
                                  color: C.textMid,
                                  lineHeight: 1.35
                                }}
                              >
                                {String(p.recomendacao || p.observacoes).slice(0, 90)}
                              </p>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: cor,
                              fontFamily: FONTS.mono,
                              fontWeight: 900,
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase'
                            }}
                          >
                            {incidencia || sev?.label || '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recommendation + actions */}
              <div style={{ padding: 14, marginTop: 'auto', display: 'grid', gap: 12 }}>
                {selectedSev && ['severa', 'nde'].includes(selectedSev) ? (
                  <div
                    style={{
                      padding: 11,
                      background: C.redLight,
                      border: `1px solid ${C.red}44`,
                      borderRadius: 10
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 9,
                        fontFamily: FONTS.mono,
                        fontWeight: 900,
                        color: C.redDk,
                        letterSpacing: '1px'
                      }}
                    >
                      AÇÃO RECOMENDADA
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDk, lineHeight: 1.45 }}>
                      Ocorrência severa. Considere abrir OS de aplicação imediatamente e monitorar talhões vizinhos
                      em 48h.
                    </p>
                  </div>
                ) : selectedSev === 'moderada' ? (
                  <div
                    style={{
                      padding: 11,
                      background: C.amberLight,
                      border: `1px solid ${C.amber}44`,
                      borderRadius: 10
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 9,
                        fontFamily: FONTS.mono,
                        fontWeight: 900,
                        color: C.amberDk,
                        letterSpacing: '1px'
                      }}
                    >
                      AÇÃO RECOMENDADA
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDk, lineHeight: 1.45 }}>
                      Severidade moderada. Aumentar frequência de visitas e avaliar evolução.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 11,
                      background: C.greenLight,
                      border: `1px solid ${C.greenDp}33`,
                      borderRadius: 10
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 9,
                        fontFamily: FONTS.mono,
                        fontWeight: 900,
                        color: C.greenDp,
                        letterSpacing: '1px'
                      }}
                    >
                      OK · CONTINUAR MONITORAMENTO
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDk, lineHeight: 1.45 }}>
                      Sem dano econômico. Mantenha o calendário de visitas semanal.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {canOpenOs && (
                    <button onClick={abrirOSDoTalhao} style={{ ...primaryBtnStyle, flex: 1, minWidth: 140 }}>
                      Abrir OS →
                    </button>
                  )}
                  <button onClick={novaVisita} style={secondaryBtnStyle}>
                    Nova visita
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
