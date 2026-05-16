import { useState } from 'react'
import { theme } from '../../styles/theme'
import { getCategoriaInfo } from '../../lib/operacoes'
import { MONITORAMENTO_LEGEND } from './constants'
import { useMediaQuery, useDevicePosition } from './hooks'
import { SimpleFarmMap } from './maps'
import { requestOfflineStorage } from './offline'
import { normalizeFeature, getMonitoramentoMeta, formatCultura, formatShortDate, money } from './utils'
import {
  eyebrowStyle,
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
  timelineActionsStyle,
  timelineActionButtonStyle,
  timelineMobileActionButtonStyle,
  timelineModeTabsStyle,
  timelineModeTabsMobileStyle,
  timelineModeButtonStyle,
  timelineMobileModeButtonStyle,
  timelineSummaryCardStyle,
  timelineCardTitleStyle,
  timelineSummaryRowsStyle,
  timelineSummaryRowStyle,
  timelineSummaryLabelStyle,
  timelineSummaryValueStyle,
  timelineTextButtonStyle,
  timelineTableHorizontalStyle,
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
  timelineTableDesktopStyle,
  timelineCellStyle,
  timelineCellHorizontalStyle,
  timelineRainLayoutStyle,
  timelineDateGridStyle,
  timelineDateLabelStyle,
  timelineDateInputStyle,
  timelinePrimaryButtonStyle,
  timelineRainGridStyle,
  timelineRainMetricStyle
} from './styles'

const C = theme.normal

export function FazendaMapaPrincipal({
  fazenda,
  talhoes,
  pluviometros = [],
  monitoramentosResumo = {},
  talhaoSel,
  operacoes,
  custos,
  totalCusto,
  loadOps,
  alternarTalhao,
  navigate,
  setActiveView,
  setShowNovaOp
}) {
  const timelineIsDocked = useMediaQuery('(min-width: 900px)')
  const devicePosition = useDevicePosition(!timelineIsDocked)
  const [timelineMode, setTimelineMode] = useState('resumo')
  const [chuvaInicio, setChuvaInicio] = useState('2026-05-01')
  const [chuvaFim, setChuvaFim] = useState('2026-05-15')
  const features = talhoes
    .map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) }))
    .filter(item => item.feature)
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
  const chuvaSeed = selected
    ? String(selected.codigo || '')
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0)
    : 0
  const chuvaAcumulada = selected ? (82 + (chuvaSeed % 88) + (Number(selected.area_ha || 0) % 18)).toFixed(1) : '0.0'
  const chuvaMediaDia = selected ? (Number(chuvaAcumulada) / 15).toFixed(1) : '0.0'
  const maiorChuva = selected ? (18 + (chuvaSeed % 24)).toFixed(1) : '0.0'
  const menorChuva = selected ? (2 + (chuvaSeed % 9)).toFixed(1) : '0.0'
  const ultimaOperacao = operacoes[0] || null
  const ultimaOperacaoInfo = ultimaOperacao ? getCategoriaInfo(ultimaOperacao.categoria) : null
  const activePluviometros = pluviometros.filter(p => p.ativo !== false)
  const resumoRows = [
    {
      label: 'Situacao atual',
      value: loadOps
        ? 'Carregando operacoes'
        : operacoes.length
          ? 'Com historico registrado'
          : 'Sem operacoes registradas'
    },
    { label: 'Proxima acao', value: operacoes.length ? 'Revisar monitoramento de campo' : 'Monitoramento de campo' },
    {
      label: 'Ultima chuva',
      value: activePluviometros.length ? `${chuvaAcumulada} mm no periodo` : 'Sem registro no periodo'
    },
    {
      label: 'Ultima operacao',
      value: ultimaOperacao
        ? `${formatShortDate(ultimaOperacao.data_operacao)} · ${ultimaOperacaoInfo.label}`
        : 'Nenhuma operacao cadastrada'
    }
  ]
  const timeline =
    operacoes.length > 0
      ? operacoes.map(op => ({
          data: formatShortDate(op.data_operacao),
          titulo: getCategoriaInfo(op.categoria).label,
          status: 'Executada',
          valor: money(
            (op.insumos || []).reduce((s, i) => s + Number(i.custo_total || 0), 0) + Number(op.custo_aplicacao || 0)
          )
        }))
      : [
          { data: 'Hoje', titulo: 'Sem operacoes', status: 'Pendente', valor: 'Adicionar registro' },
          { data: 'Proximo passo', titulo: 'Monitoramento', status: 'Aberta', valor: 'Scouting' },
          { data: 'Proximo passo', titulo: 'Ordem servico', status: 'Aberta', valor: 'Planejar' }
        ]

  async function handleFeatureClick(index) {
    const talhao = features[index]?.talhao
    if (!talhao) return
    if (talhaoSel?.id !== talhao.id && timelineMode !== 'monitoramento')
      setTimelineMode(timelineIsDocked ? 'resumo' : 'historico')
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
        selectedMode={
          timelineMode === 'chuvas' ? 'chuvas' : timelineMode === 'monitoramento' ? 'monitoramento' : 'timeline'
        }
        pluviometros={[]}
        devicePosition={devicePosition}
        onFeatureClick={handleFeatureClick}
      />

      {selected && (
        <div style={timelineIsDocked ? timelineDockStyle : timelineMobileStyle}>
          <div style={timelineIsDocked ? timelineHeaderStyle : timelineHeaderMobileStyle}>
            <div>
              <p style={timelineIsDocked ? eyebrowStyle : timelineMobileEyebrowStyle}>
                {timelineIsDocked ? 'TALHAO SELECIONADO' : 'TALHAO'}
              </p>
              <h3 style={timelineIsDocked ? timelineTitleStyle : timelineMobileTitleStyle}>
                {selected.codigo} · {formatCultura(selected.cultura)}
              </h3>
            </div>
            <span style={timelineAreaPillStyle}>{Number(selected.area_ha || 0).toFixed(2)} ha</span>
          </div>
          <div style={timelineActionsStyle}>
            <button
              onClick={abrirMonitoramento}
              style={timelineIsDocked ? timelineActionButtonStyle : timelineMobileActionButtonStyle}
            >
              Monitorar
            </button>
            <button
              onClick={() => navigate('/os')}
              style={timelineIsDocked ? timelineActionButtonStyle : timelineMobileActionButtonStyle}
            >
              Criar ordem
            </button>
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
          {timelineMode === 'resumo' &&
            (timelineIsDocked ? (
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
                <button onClick={() => setShowNovaOp(true)} style={timelineTextButtonStyle}>
                  {operacoes.length ? 'Registrar nova operacao' : 'Adicionar primeiro registro'}
                </button>
              </div>
            ) : (
              <div style={timelineTableHorizontalStyle}>
                {resumoRows.map(item => (
                  <div key={item.label} style={timelineInfoHorizontalCardStyle}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
                <button onClick={() => setShowNovaOp(true)} style={timelineCtaHorizontalStyle}>
                  {operacoes.length ? 'Nova operacao' : 'Adicionar registro'}
                </button>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            ))}
          {timelineMode === 'monitoramento' &&
            (timelineIsDocked ? (
              <div style={timelineSummaryCardStyle}>
                <h4 style={timelineCardTitleStyle}>Dias sem monitoramento</h4>
                <div style={{ ...timelineMonitoringStatusStyle, borderColor: selectedMonitoring.color }}>
                  <span style={timelineSummaryLabelStyle}>Talhao selecionado</span>
                  <strong style={{ ...timelineSummaryValueStyle, fontSize: 16, color: selectedMonitoring.color }}>
                    {selectedMonitoring.title}
                  </strong>
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
                <button onClick={abrirMonitoramento} style={timelineTextButtonStyle}>
                  Registrar monitoramento
                </button>
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
                <button onClick={abrirMonitoramento} style={timelineCtaHorizontalStyle}>
                  Registrar visita
                </button>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            ))}
          {timelineMode === 'historico' && (
            <div style={timelineIsDocked ? timelineTableDesktopStyle : timelineTableHorizontalStyle}>
              {timeline.map((item, index) => (
                <button
                  key={`${item.data}-${item.titulo}-${index}`}
                  style={timelineIsDocked ? timelineCellStyle : timelineCellHorizontalStyle}
                >
                  <span>{item.data}</span>
                  <strong>{item.titulo}</strong>
                  <em>{item.status}</em>
                  <small>{item.valor}</small>
                </button>
              ))}
              {!timelineIsDocked && <div aria-hidden="true" style={timelineScrollEndStyle} />}
            </div>
          )}
          {timelineMode === 'chuvas' &&
            (timelineIsDocked ? (
              <div style={timelineRainLayoutStyle}>
                <div style={timelineDateGridStyle}>
                  <label style={timelineDateLabelStyle}>
                    Data inicial
                    <input
                      type="date"
                      value={chuvaInicio}
                      onChange={e => setChuvaInicio(e.target.value)}
                      style={timelineDateInputStyle}
                    />
                  </label>
                  <label style={timelineDateLabelStyle}>
                    Data final
                    <input
                      type="date"
                      value={chuvaFim}
                      onChange={e => setChuvaFim(e.target.value)}
                      style={timelineDateInputStyle}
                    />
                  </label>
                  <button onClick={() => setActiveView('chuvas')} style={timelinePrimaryButtonStyle}>
                    Abrir mapa interpolado
                  </button>
                </div>
                <div style={timelineRainGridStyle}>
                  <div style={timelineRainMetricStyle}>
                    <span>Acumulado no talhao</span>
                    <strong>{chuvaAcumulada} mm</strong>
                  </div>
                  <div style={timelineRainMetricStyle}>
                    <span>Media diaria</span>
                    <strong>{chuvaMediaDia} mm</strong>
                  </div>
                  <div style={timelineRainMetricStyle}>
                    <span>Maior precipitacao</span>
                    <strong>{maiorChuva} mm</strong>
                  </div>
                  <div style={timelineRainMetricStyle}>
                    <span>Menor precipitacao</span>
                    <strong>{menorChuva} mm</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={timelineTableHorizontalStyle}>
                <label style={timelineInputHorizontalCardStyle}>
                  <span>Data inicial</span>
                  <input
                    type="date"
                    value={chuvaInicio}
                    onChange={e => setChuvaInicio(e.target.value)}
                    style={timelineDateInputStyle}
                  />
                </label>
                <label style={timelineInputHorizontalCardStyle}>
                  <span>Data final</span>
                  <input
                    type="date"
                    value={chuvaFim}
                    onChange={e => setChuvaFim(e.target.value)}
                    style={timelineDateInputStyle}
                  />
                </label>
                <button onClick={() => setActiveView('chuvas')} style={timelineCtaHorizontalStyle}>
                  Abrir mapa de chuvas
                </button>
                <div style={timelineMetricHorizontalCardStyle}>
                  <span>Acumulado</span>
                  <strong>{chuvaAcumulada} mm</strong>
                </div>
                <div style={timelineMetricHorizontalCardStyle}>
                  <span>Media diaria</span>
                  <strong>{chuvaMediaDia} mm</strong>
                </div>
                <div style={timelineMetricHorizontalCardStyle}>
                  <span>Maior chuva</span>
                  <strong>{maiorChuva} mm</strong>
                </div>
                <div style={timelineMetricHorizontalCardStyle}>
                  <span>Menor chuva</span>
                  <strong>{menorChuva} mm</strong>
                </div>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            ))}
          {timelineMode === 'solo' &&
            (timelineIsDocked ? (
              <div style={timelineSummaryCardStyle}>
                <h4 style={timelineCardTitleStyle}>Solo do talhao</h4>
                <div style={timelineSummaryRowsStyle}>
                  <div style={timelineSummaryRowStyle}>
                    <span style={timelineSummaryLabelStyle}>Camada atual</span>
                    <strong style={timelineSummaryValueStyle}>Mapa de solo disponivel</strong>
                  </div>
                  <div style={timelineSummaryRowStyle}>
                    <span style={timelineSummaryLabelStyle}>Fertilidade</span>
                    <strong style={timelineSummaryValueStyle}>Aguardando leitura recente</strong>
                  </div>
                  <div style={timelineSummaryRowStyle}>
                    <span style={timelineSummaryLabelStyle}>Recomendacao</span>
                    <strong style={timelineSummaryValueStyle}>Conferir pagina Solo</strong>
                  </div>
                </div>
                <button onClick={() => setActiveView('solo')} style={timelineTextButtonStyle}>
                  Abrir pagina Solo
                </button>
              </div>
            ) : (
              <div style={timelineTableHorizontalStyle}>
                <div style={timelineInfoHorizontalCardStyle}>
                  <span>Camada atual</span>
                  <strong>Mapa de solo disponivel</strong>
                </div>
                <div style={timelineInfoHorizontalCardStyle}>
                  <span>Fertilidade</span>
                  <strong>Aguardando leitura recente</strong>
                </div>
                <div style={timelineInfoHorizontalCardStyle}>
                  <span>Recomendacao</span>
                  <strong>Conferir pagina Solo</strong>
                </div>
                <button onClick={() => setActiveView('solo')} style={timelineCtaHorizontalStyle}>
                  Abrir Solo
                </button>
                <div aria-hidden="true" style={timelineScrollEndStyle} />
              </div>
            ))}
        </div>
      )}
    </section>
  )
}
