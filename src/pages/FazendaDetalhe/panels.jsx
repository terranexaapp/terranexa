import { theme } from '../../styles/theme'
import { getCategoriaInfo } from '../../lib/operacoes'
import { money } from './utils'
import { reportTypes } from './constants'
import { MetricCard } from './sharedComponents'
import {
  eyebrowStyle,
  panelStyle,
  panelTitleStyle,
  viewStackStyle,
  viewTitleStyle,
  viewSubtitleStyle,
  heroPanelStyle,
  primaryActionStyle,
  metricGridStyle,
  reportButtonStyle,
  reportPreviewStyle,
  reportCoverArtStyle,
  managementContentPanelStyle,
  managementPlaceholderGridStyle,
  managementPlaceholderCardStyle,
  farmConfigGridStyle,
  farmConfigFieldStyle
} from './styles'

const C = theme.normal

export function ManagementModulePanel({ item, navigate }) {
  const actions = {
    estoque: { label: 'Abrir estoque', run: () => navigate('/insumos') },
    insumos: { label: 'Abrir insumos', run: () => navigate('/insumos') }
  }
  const action = actions[item.id]

  return (
    <div style={managementContentPanelStyle}>
      <p style={eyebrowStyle}>{item.title.toUpperCase()}</p>
      <h3 style={panelTitleStyle}>{item.title}</h3>
      <p style={viewSubtitleStyle}>
        {item.text}. Este modulo fica isolado aqui para nao misturar informacoes de cadastro, mapa e operacao.
      </p>
      <div style={managementPlaceholderGridStyle}>
        {['Cadastro', 'Indicadores', 'Historico'].map(label => (
          <div key={label} style={managementPlaceholderCardStyle}>
            <span>{label}</span>
            <strong>Em organizacao</strong>
          </div>
        ))}
      </div>
      {action && (
        <button type="button" onClick={action.run} style={primaryActionStyle}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function ConfiguracaoFazendaPanel({ fazenda, talhoes, total }) {
  const rows = [
    ['Nome da fazenda', fazenda?.nome || 'Nao informado'],
    ['Municipio', fazenda?.municipio || 'Nao informado'],
    ['UF', fazenda?.estado || 'Nao informado'],
    ['Area calculada', `${Number(total || 0).toFixed(2)} ha`],
    ['Talhoes ativos', String(talhoes.length)],
    ['Preferencias', 'Mapa satelite e gerenciamento modular']
  ]

  return (
    <div style={managementContentPanelStyle}>
      <p style={eyebrowStyle}>CONFIGURACAO DA FAZENDA</p>
      <h3 style={panelTitleStyle}>Dados e preferencias da propriedade</h3>
      <div style={farmConfigGridStyle}>
        {rows.map(([label, value]) => (
          <div key={label} style={farmConfigFieldStyle}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RelatoriosView({ talhoes, total }) {
  return (
    <section style={viewStackStyle}>
      <div style={heroPanelStyle}>
        <div>
          <p style={eyebrowStyle}>RELATORIOS</p>
          <h2 style={viewTitleStyle}>Construtor de relatórios agrícolas</h2>
          <p style={viewSubtitleStyle}>
            Modelos executivos, técnicos e financeiros usando dados de operações, solo, chuva, scouting e estoque.
          </p>
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
              <h3 style={{ margin: '10px 0 6px', color: C.textDk, fontSize: 24, fontFamily: 'Georgia, serif' }}>
                Relatório Agronômico Completo
              </h3>
              <p style={{ margin: 0, color: C.textMid, fontSize: 13 }}>
                Área total {total.toFixed(2)} ha · {talhoes.length} talhões · Safra atual
              </p>
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

export function CustosPanel({ custos, totalCusto }) {
  return (
    <div
      style={{
        background: C.bg,
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 12,
        border: `1px solid ${C.border}`
      }}
    >
      <p style={{ ...eyebrowStyle, marginBottom: 10 }}>CUSTO POR CATEGORIA</p>
      {custos
        .sort((a, b) => b.custo_total - a.custo_total)
        .map(c => {
          const info = getCategoriaInfo(c.categoria)
          const perc = totalCusto > 0 ? (c.custo_total / totalCusto) * 100 : 0
          return (
            <div key={c.categoria} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: info.cor }} />
                  <span style={{ fontSize: 11, color: C.textDk }}>{info.label}</span>
                  <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>{c.qtd_operacoes} op.</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: info.cor, fontFamily: 'monospace' }}>
                    {money(c.custo_total)}
                  </span>
                  <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', marginLeft: 6 }}>
                    {perc.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div style={{ background: C.border, borderRadius: 99, height: 5, overflow: 'hidden' }}>
                <div style={{ width: perc + '%', height: 5, borderRadius: 99, background: info.cor }} />
              </div>
            </div>
          )
        })}
      <div
        style={{
          paddingTop: 8,
          borderTop: `1px solid ${C.borderSoft}`,
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textDk }}>Total</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.greenDp, fontFamily: 'monospace' }}>
          {money(totalCusto)}
        </span>
      </div>
    </div>
  )
}
