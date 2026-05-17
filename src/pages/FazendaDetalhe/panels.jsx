import { theme } from '../../styles/theme'
import { CentrosCustoSection } from './centrosCustoSection'
import { CustosPorCCPanel } from './custosPorCC'
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

export function ManagementModulePanel({ item }) {
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
    </div>
  )
}

export function InsumosShortcut({ navigate }) {
  return (
    <div style={managementContentPanelStyle}>
      <p style={eyebrowStyle}>INSUMOS</p>
      <h3 style={panelTitleStyle}>Catálogo de insumos</h3>
      <p style={viewSubtitleStyle}>
        O catálogo completo de insumos (produtos, doses, fornecedores e custos) tem página dedicada. Para acompanhar
        saldos e alertas de mínimo, abra <strong>Estoque</strong> aqui no menu.
      </p>
      <button type="button" onClick={() => navigate('/insumos')} style={primaryActionStyle}>
        Abrir catálogo de insumos →
      </button>
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
    <div style={{ display: 'grid', gap: 14 }}>
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

      {fazenda?.id && <CentrosCustoSection fazendaId={fazenda.id} />}
    </div>
  )
}

export function RelatoriosView({ fazendaId, talhoes, total }) {
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

      {fazendaId && <CustosPorCCPanel fazendaId={fazendaId} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)', gap: 14 }}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>MODELOS (EM DESENVOLVIMENTO)</p>
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

