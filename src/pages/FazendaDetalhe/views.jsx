import { theme } from '../../styles/theme'
import { DESKTOP_NAV_GROUPS } from './constants'
import { DesktopIcon } from './DesktopIcon'
import {
  MetricCard,
  CustoPizzaCard,
  SmartInsightCard,
  InsightPanel
} from './sharedComponents'
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
  scoutingMapStyle,
  plotShapeStyle,
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

export function DashboardView({ total, talhoes, talhoesSemMonitoramento, navigate, setActiveView }) {
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

export function ScoutingView({ talhoes, talhaoSel, abrirTalhao }) {
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
