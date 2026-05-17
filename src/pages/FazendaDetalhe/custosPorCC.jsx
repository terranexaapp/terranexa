import { useEffect, useId, useMemo, useState } from 'react'
import { theme } from '../../styles/theme'
import { agregarCustosPorCC } from '../../lib/centrosCusto'
import { listarSafras } from '../../lib/safras'
import { money } from './utils'
import {
  eyebrowStyle,
  panelStyle,
  panelTitleStyle,
  inputStyle,
  formLabelStyle,
  formErrorStyle,
  mapCounterStyle
} from './styles'

const C = theme.normal

export function CustosPorCCPanel({ fazendaId }) {
  const [linhas, setLinhas] = useState([])
  const [safras, setSafras] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [safraId, setSafraId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const safraSelectId = useId()
  const dataInicioId = useId()
  const dataFimId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await agregarCustosPorCC(fazendaId, {
        safraId: safraId || undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined
      })
      setLinhas(data)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel agregar os custos')
      setLinhas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId)
      listarSafras(fazendaId, { incluirInativas: true })
        .then(setSafras)
        .catch(() => setSafras([]))
  }, [fazendaId])

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, safraId, dataInicio, dataFim])

  const kpis = useMemo(() => {
    const totalGeral = linhas.reduce((s, l) => s + l.total, 0)
    const totalOps = linhas.reduce((s, l) => s + l.qtd_operacoes, 0)
    const mais = linhas[0] || null
    const ccUsados = linhas.length
    return { totalGeral, totalOps, mais, ccUsados }
  }, [linhas])

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>CUSTOS POR CENTRO DE CUSTO</p>
          <h3 style={panelTitleStyle}>Onde vai o dinheiro da fazenda</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Agregação automática das operações registradas (custo de aplicação + insumos usados), agrupada por centro
            de custo. Use os filtros pra recortar por safra ou período.
          </p>
        </div>
        <span style={mapCounterStyle}>{kpis.ccUsados} CCs com gasto</span>
      </div>

      <div style={filtersRowStyle}>
        <div style={{ display: 'grid', gap: 4 }}>
          <label htmlFor={safraSelectId} style={formLabelStyle}>
            SAFRA
          </label>
          <select
            id={safraSelectId}
            value={safraId}
            onChange={e => setSafraId(e.target.value)}
            style={{ ...inputStyle, maxWidth: 220 }}
          >
            <option value="">Todas</option>
            {safras.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
                {s.ativa ? '' : ' (inativa)'}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          <label htmlFor={dataInicioId} style={formLabelStyle}>
            DE
          </label>
          <input
            id={dataInicioId}
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            style={{ ...inputStyle, maxWidth: 160 }}
          />
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          <label htmlFor={dataFimId} style={formLabelStyle}>
            ATÉ
          </label>
          <input
            id={dataFimId}
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            style={{ ...inputStyle, maxWidth: 160 }}
          />
        </div>
        {(safraId || dataInicio || dataFim) && (
          <button
            type="button"
            onClick={() => {
              setSafraId('')
              setDataInicio('')
              setDataFim('')
            }}
            style={clearBtnStyle}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div style={kpiGridStyle}>
        <KpiCard label="Total agregado" value={money(kpis.totalGeral)} tone={C.greenDp} />
        <KpiCard label="Operações no filtro" value={kpis.totalOps} tone={C.textDk} />
        <KpiCard
          label="CC com maior gasto"
          value={kpis.mais ? `${kpis.mais.codigo} · ${money(kpis.mais.total)}` : '—'}
          tone={C.amberDk}
        />
      </div>

      {loadError && <div style={formErrorStyle}>{loadError}</div>}

      <div style={tableStyle}>
        <div style={tableHeaderStyle}>
          <span>CÓDIGO</span>
          <span>NOME</span>
          <span style={{ textAlign: 'right' }}>OPS</span>
          <span style={{ textAlign: 'right' }}>APLICAÇÃO</span>
          <span style={{ textAlign: 'right' }}>INSUMOS</span>
          <span style={{ textAlign: 'right' }}>TOTAL</span>
          <span style={{ textAlign: 'right' }}>%</span>
        </div>
        {loading ? (
          <p style={emptyHintStyle}>Carregando…</p>
        ) : linhas.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>Nenhuma operação no filtro</p>
            <p style={{ margin: '6px 0 0', color: C.textMid, fontSize: 12 }}>
              Registre operações nos talhões pra começar a popular esse relatório.
            </p>
          </div>
        ) : (
          linhas.map(l => {
            const pct = kpis.totalGeral > 0 ? (l.total / kpis.totalGeral) * 100 : 0
            const sem = l.codigo === 'SEM_CC'
            return (
              <div key={l.centro_custo_id || 'sem-cc'} style={tableRowStyle}>
                <code style={{ ...ccCodeStyle, opacity: sem ? 0.6 : 1 }}>{l.codigo}</code>
                <span style={{ color: sem ? C.textDim : C.textDk, fontSize: 13 }}>{l.nome}</span>
                <span style={numStyle}>{l.qtd_operacoes}</span>
                <span style={numStyle}>{money(l.total_aplicacao)}</span>
                <span style={numStyle}>{money(l.total_insumos)}</span>
                <strong style={{ ...numStyle, color: C.greenDp }}>{money(l.total)}</strong>
                <span style={{ ...numStyle, color: C.textDim }}>{pct.toFixed(1)}%</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, tone }) {
  return (
    <div style={kpiCardStyle}>
      <p style={kpiLabelStyle}>{label.toUpperCase()}</p>
      <strong style={{ ...kpiValueStyle, color: tone }}>{value}</strong>
    </div>
  )
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  marginBottom: 12
}
const filtersRowStyle = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  marginBottom: 12
}
const clearBtnStyle = {
  alignSelf: 'flex-end',
  background: 'transparent',
  border: 'none',
  color: C.greenDp,
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  textDecoration: 'underline'
}
const kpiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  marginBottom: 12
}
const kpiCardStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  display: 'grid',
  gap: 4
}
const kpiLabelStyle = { margin: 0, fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1.4px', fontWeight: 800 }
const kpiValueStyle = { display: 'block', fontSize: 18, fontWeight: 900, fontFamily: 'Georgia, serif', lineHeight: 1.1 }
const tableStyle = { border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }
const tableHeaderStyle = {
  display: 'grid',
  gridTemplateColumns: '80px minmax(140px, 1fr) 50px 110px 110px 110px 60px',
  gap: 10,
  padding: '8px 12px',
  background: C.bgSoft,
  fontSize: 9,
  fontFamily: 'monospace',
  letterSpacing: '1px',
  color: C.textDim,
  fontWeight: 900,
  borderBottom: `1px solid ${C.border}`
}
const tableRowStyle = {
  display: 'grid',
  gridTemplateColumns: '80px minmax(140px, 1fr) 50px 110px 110px 110px 60px',
  gap: 10,
  padding: '8px 12px',
  borderBottom: `1px solid ${C.borderSoft}`,
  alignItems: 'center'
}
const ccCodeStyle = {
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 900,
  color: C.greenDp,
  background: C.greenLight,
  borderRadius: 4,
  padding: '2px 6px',
  letterSpacing: '0.5px',
  textAlign: 'center'
}
const numStyle = { fontFamily: 'monospace', fontSize: 12, color: C.textDk, textAlign: 'right' }
const emptyHintStyle = { margin: 0, color: C.textDim, fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: 20 }
const emptyStateStyle = {
  background: C.bg,
  padding: '24px 16px',
  textAlign: 'center'
}
