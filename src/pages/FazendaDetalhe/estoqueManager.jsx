import { useEffect, useId, useMemo, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  listarInsumos,
  atualizarEstoque,
  statusEstoqueInfo,
  getClasseInfo,
  CLASSES_INSUMO
} from '../../lib/insumos'
import { listarCentrosCusto } from '../../lib/centrosCusto'
import { money } from './utils'
import {
  eyebrowStyle,
  panelStyle,
  panelTitleStyle,
  primaryActionStyle,
  secondaryActionStyle,
  inputStyle,
  formLabelStyle,
  formErrorStyle,
  mapCounterStyle
} from './styles'

const C = theme.normal

const STATUS_ORDER = ['critico', 'vazio', 'baixo', 'ok']
const STATUS_LABEL = { todos: 'Todos', ok: 'OK', baixo: 'Baixo', critico: 'Crítico', vazio: 'Esgotado' }

export function EstoqueManager({ fazendaId, navigate }) {
  const [insumos, setInsumos] = useState([])
  const [centrosCusto, setCentrosCusto] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterClasse, setFilterClasse] = useState('todas')
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ quantidade_atual: '', quantidade_minima: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const quantAtualId = useId()
  const quantMinId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const [data, ccs] = await Promise.all([
        listarInsumos(fazendaId),
        listarCentrosCusto(fazendaId).catch(() => [])
      ])
      setInsumos(data)
      setCentrosCusto(ccs)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar insumos')
      setInsumos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId])

  const kpis = useMemo(() => {
    const total = insumos.length
    const emAlerta = insumos.filter(i => ['baixo', 'critico', 'vazio'].includes(i.estoque?.status)).length
    const valorInvestido = insumos.reduce(
      (sum, i) => sum + Number(i.estoque?.quantidade_atual || 0) * Number(i.custo_unitario || 0),
      0
    )
    const porStatus = insumos.reduce((acc, i) => {
      const s = i.estoque?.status || 'vazio'
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
    return { total, emAlerta, valorInvestido, porStatus }
  }, [insumos])

  const topCCs = useMemo(() => {
    const ccMap = new Map(centrosCusto.map(c => [c.id, c]))
    const buckets = new Map()
    for (const i of insumos) {
      const ccId = i.centro_custo_padrao_id || null
      const valor = Number(i.estoque?.quantidade_atual || 0) * Number(i.custo_unitario || 0)
      if (!buckets.has(ccId)) {
        const cc = ccId ? ccMap.get(ccId) : null
        buckets.set(ccId, {
          centro_custo_id: ccId,
          codigo: cc?.codigo || 'SEM_CC',
          nome: cc?.nome || 'Sem centro de custo',
          total: 0,
          qtd_itens: 0
        })
      }
      const b = buckets.get(ccId)
      b.total += valor
      b.qtd_itens += 1
    }
    return Array.from(buckets.values())
      .filter(b => b.total > 0 || b.qtd_itens > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [insumos, centrosCusto])

  const filtrados = useMemo(() => {
    return insumos
      .filter(i => filterClasse === 'todas' || i.classe === filterClasse)
      .filter(i => filterStatus === 'todos' || i.estoque?.status === filterStatus)
      .sort((a, b) => {
        const sa = STATUS_ORDER.indexOf(a.estoque?.status || 'vazio')
        const sb = STATUS_ORDER.indexOf(b.estoque?.status || 'vazio')
        if (sa !== sb) return sa - sb
        return a.nome.localeCompare(b.nome, 'pt-BR')
      })
  }, [insumos, filterStatus, filterClasse])

  function startEdit(insumo) {
    setEditingId(insumo.id)
    setDraft({
      quantidade_atual: String(insumo.estoque?.quantidade_atual ?? 0),
      quantidade_minima: String(insumo.estoque?.quantidade_minima ?? 0)
    })
    setFormError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setFormError('')
  }

  async function handleSave(insumo, e) {
    e?.preventDefault?.()
    setFormError('')
    const qa = Number(draft.quantidade_atual)
    const qm = Number(draft.quantidade_minima)
    if (!Number.isFinite(qa) || qa < 0) {
      setFormError('Quantidade atual inválida.')
      return
    }
    if (!Number.isFinite(qm) || qm < 0) {
      setFormError('Quantidade mínima inválida.')
      return
    }
    setSaving(true)
    try {
      await atualizarEstoque(insumo.id, {
        quantidade_atual: qa,
        quantidade_inicial: Math.max(qa, Number(insumo.estoque?.quantidade_inicial || 0)),
        quantidade_minima: qm
      })
      await carregar()
      cancelEdit()
    } catch (err) {
      setFormError(err.message || 'Nao foi possivel salvar o estoque.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>ESTOQUE</p>
          <h3 style={panelTitleStyle}>Status do estoque</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Saldos atuais por insumo, alertas de mínimo e valor total investido. Para cadastrar novos insumos, abra o
            catálogo completo.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {kpis.total} {kpis.total === 1 ? 'insumo' : 'insumos'}
          </span>
          <button type="button" onClick={() => navigate('/insumos')} style={secondaryActionStyle}>
            Abrir catálogo
          </button>
        </div>
      </div>

      <div style={kpiGridStyle}>
        <KpiCard label="Total de insumos" value={kpis.total} tone={C.textDk} />
        <KpiCard
          label="Em alerta"
          value={kpis.emAlerta}
          tone={kpis.emAlerta > 0 ? C.redDk : C.greenDp}
          hint={`${kpis.total > 0 ? Math.round((kpis.emAlerta / kpis.total) * 100) : 0}% do catálogo`}
        />
        <KpiCard label="Sem saldo" value={kpis.porStatus.vazio || 0} tone={C.textDim} />
        <KpiCard label="Valor investido" value={money(kpis.valorInvestido)} tone={C.greenDp} />
      </div>

      {topCCs.length > 0 && (
        <div style={ccBlockStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <p style={eyebrowStyle}>INVESTIDO POR CENTRO DE CUSTO</p>
            <span style={{ fontSize: 11, color: C.textDim }}>Top {topCCs.length}</span>
          </div>
          <div style={ccListStyle}>
            {topCCs.map(cc => {
              const pct = kpis.valorInvestido > 0 ? (cc.total / kpis.valorInvestido) * 100 : 0
              return (
                <div key={cc.centro_custo_id || 'sem-cc'} style={ccRowStyle}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                    <code style={ccCodeStyle}>{cc.codigo}</code>
                    <span style={{ color: C.textDk, fontSize: 12 }}>{cc.nome}</span>
                    <span style={{ color: C.textDim, fontSize: 10, fontFamily: 'monospace' }}>
                      ({cc.qtd_itens} {cc.qtd_itens === 1 ? 'item' : 'itens'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.greenDp, fontSize: 12, fontFamily: 'monospace', fontWeight: 800 }}>
                      {money(cc.total)}
                    </span>
                    <span style={{ color: C.textDim, fontSize: 10, fontFamily: 'monospace', minWidth: 36, textAlign: 'right' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loadError && <div style={formErrorStyle}>{loadError}</div>}

      <div style={filtersStyle}>
        <div style={filterGroupStyle}>
          <span style={filterGroupLabelStyle}>Status</span>
          {['todos', 'critico', 'vazio', 'baixo', 'ok'].map(s => (
            <FilterChip
              key={s}
              label={STATUS_LABEL[s]}
              active={filterStatus === s}
              onClick={() => setFilterStatus(s)}
            />
          ))}
        </div>
        <div style={filterGroupStyle}>
          <span style={filterGroupLabelStyle}>Classe</span>
          <FilterChip label="Todas" active={filterClasse === 'todas'} onClick={() => setFilterClasse('todas')} />
          {CLASSES_INSUMO.map(c => (
            <FilterChip
              key={c.id}
              label={c.label}
              active={filterClasse === c.id}
              onClick={() => setFilterClasse(c.id)}
            />
          ))}
        </div>
      </div>

      <div style={listStyle}>
        {loading ? (
          <p style={emptyHintStyle}>Carregando…</p>
        ) : filtrados.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>
              {insumos.length === 0 ? 'Nenhum insumo cadastrado' : 'Nenhum insumo no filtro atual'}
            </p>
            <p style={{ margin: '6px 0 0', color: C.textMid, fontSize: 12 }}>
              {insumos.length === 0
                ? 'Abra o catálogo de insumos pra cadastrar o primeiro.'
                : 'Tente outro filtro de status ou classe.'}
            </p>
          </div>
        ) : (
          filtrados.map(insumo => {
            const st = statusEstoqueInfo(insumo.estoque?.status)
            const ci = getClasseInfo(insumo.classe)
            const isEditing = editingId === insumo.id
            return (
              <div key={insumo.id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <span style={{ ...classDotStyle, background: ci.cor }} aria-hidden="true" />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: C.textDk, fontSize: 14, display: 'block' }}>{insumo.nome}</strong>
                      <span style={{ color: C.textMid, fontSize: 11, fontFamily: 'monospace' }}>
                        {ci.label} · {insumo.unidade}
                      </span>
                    </div>
                  </div>
                  <span style={{ ...badgeStyle, color: st.cor, background: st.bg }}>{st.label}</span>
                </div>

                <div style={cardBodyStyle}>
                  <Metric label="Atual" value={`${Number(insumo.estoque?.quantidade_atual || 0)} ${insumo.unidade}`} />
                  <Metric label="Mínimo" value={`${Number(insumo.estoque?.quantidade_minima || 0)} ${insumo.unidade}`} />
                  <Metric label="Valor unitário" value={money(insumo.custo_unitario)} />
                  <Metric
                    label="Valor em estoque"
                    value={money(Number(insumo.estoque?.quantidade_atual || 0) * Number(insumo.custo_unitario || 0))}
                  />
                </div>

                {isEditing ? (
                  <form onSubmit={e => handleSave(insumo, e)} style={editFormStyle}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label htmlFor={`${quantAtualId}-${insumo.id}`} style={formLabelStyle}>
                          QUANTIDADE ATUAL
                        </label>
                        <input
                          id={`${quantAtualId}-${insumo.id}`}
                          type="number"
                          min="0"
                          step="any"
                          value={draft.quantidade_atual}
                          onChange={e => setDraft(d => ({ ...d, quantidade_atual: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${quantMinId}-${insumo.id}`} style={formLabelStyle}>
                          QUANTIDADE MÍNIMA
                        </label>
                        <input
                          id={`${quantMinId}-${insumo.id}`}
                          type="number"
                          min="0"
                          step="any"
                          value={draft.quantidade_minima}
                          onChange={e => setDraft(d => ({ ...d, quantidade_minima: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    {formError && <div style={formErrorStyle}>{formError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={cancelEdit} style={secondaryActionStyle}>
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{ ...primaryActionStyle, opacity: saving ? 0.6 : 1 }}
                      >
                        {saving ? 'Salvando…' : 'Salvar saldo'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => startEdit(insumo)} style={editLinkStyle}>
                    Ajustar saldo
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, tone, hint }) {
  return (
    <div style={kpiCardStyle}>
      <p style={kpiLabelStyle}>{label.toUpperCase()}</p>
      <strong style={{ ...kpiValueStyle, color: tone }}>{value}</strong>
      {hint && <span style={kpiHintStyle}>{hint}</span>}
    </div>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={active ? chipActiveStyle : chipStyle}>
      {label}
    </button>
  )
}

function Metric({ label, value }) {
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>{label.toUpperCase()}</span>
      <strong style={metricValueStyle}>{value}</strong>
    </div>
  )
}

const shellStyle = { ...panelStyle, display: 'grid', gap: 12 }
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }
const headerActionsStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const ccBlockStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '12px 14px'
}
const ccListStyle = { display: 'grid', gap: 6 }
const ccRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
  borderBottom: `1px dashed ${C.borderSoft}`
}
const ccCodeStyle = {
  fontFamily: 'monospace',
  fontSize: 10,
  fontWeight: 900,
  color: C.greenDp,
  background: C.greenLight,
  borderRadius: 4,
  padding: '2px 6px',
  letterSpacing: '0.5px'
}
const kpiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10
}
const kpiCardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '12px 14px',
  display: 'grid',
  gap: 4
}
const kpiLabelStyle = { margin: 0, fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1.4px', fontWeight: 800 }
const kpiValueStyle = { display: 'block', fontSize: 22, fontWeight: 900, fontFamily: 'Georgia, serif', lineHeight: 1.1 }
const kpiHintStyle = { fontSize: 11, color: C.textMid }
const filtersStyle = { display: 'grid', gap: 8 }
const filterGroupStyle = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }
const filterGroupLabelStyle = { fontSize: 10, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 900 }
const chipStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 999,
  padding: '6px 11px',
  fontSize: 11,
  fontWeight: 700,
  color: C.textMid,
  cursor: 'pointer'
}
const chipActiveStyle = { ...chipStyle, background: C.greenDp, color: C.bg, borderColor: C.greenDp }
const listStyle = { display: 'grid', gap: 10 }
const cardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  display: 'grid',
  gap: 10
}
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }
const classDotStyle = { width: 10, height: 10, borderRadius: 99, flexShrink: 0 }
const badgeStyle = {
  borderRadius: 999,
  padding: '3px 9px',
  fontSize: 10,
  fontFamily: 'monospace',
  fontWeight: 900,
  letterSpacing: '0.6px',
  whiteSpace: 'nowrap'
}
const cardBodyStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 8
}
const metricStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 8,
  padding: '7px 10px',
  display: 'grid',
  gap: 2
}
const metricLabelStyle = { fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 800 }
const metricValueStyle = { fontSize: 13, color: C.textDk, fontFamily: 'monospace', fontWeight: 700 }
const editLinkStyle = {
  justifySelf: 'flex-start',
  background: 'transparent',
  border: 'none',
  color: C.greenDp,
  padding: 0,
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer'
}
const editFormStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 12,
  display: 'grid',
  gap: 10
}
const emptyStateStyle = {
  background: C.bg,
  border: `1px dashed ${C.border}`,
  borderRadius: 12,
  padding: '24px 16px',
  textAlign: 'center'
}
const emptyHintStyle = { margin: 0, color: C.textDim, fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: 20 }
