import { theme } from '../../styles/theme'
import { getCategoriaInfo } from '../../lib/operacoes'
import { money } from './utils'
import { FASE_LABELS } from './constants'
import {
  eyebrowStyle,
  panelStyle,
  panelTitleStyle,
  metricCardStyle,
  pieChartStyle,
  pieHoleStyle,
  smartCardStyle,
  smartBadgeStyle,
  smartInsightRowStyle,
  smartDotStyle,
  smartActionStyle,
  talhaoMiniKpiStyle,
  formLabelStyle,
  inputStyle,
  iconButtonStyle,
  primaryActionStyle,
  secondaryActionStyle
} from './styles'

const C = theme.normal

export function TalhaoMiniKpi({ label, value }) {
  return (
    <div style={talhaoMiniKpiStyle}>
      <p style={eyebrowStyle}>{label.toUpperCase()}</p>
      <strong style={{ display: 'block', marginTop: 5, color: C.textDk, fontSize: 14, fontFamily: 'Georgia, serif' }}>{value}</strong>
    </div>
  )
}

export function TalhaoInsight({ tone, label, value }) {
  const color = tone === 'ok' ? C.greenDp : tone === 'attention' ? C.amberDk : tone === 'danger' ? C.redDk : C.textDim
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '9px 1fr', gap: 8, alignItems: 'start' }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: color, marginTop: 4 }} />
      <div>
        <p style={{ margin: 0, color: C.textDk, fontSize: 12, fontWeight: 800 }}>{label}</p>
        <p style={{ margin: '2px 0 0', color: C.textMid, fontSize: 12, lineHeight: 1.35 }}>{value}</p>
      </div>
    </div>
  )
}

export function MetricCard({ label, value, tone }) {
  return (
    <div style={metricCardStyle}>
      <p style={eyebrowStyle}>{label.toUpperCase()}</p>
      <strong style={{ display: 'block', marginTop: 6, color: tone, fontSize: 21, fontFamily: 'Georgia, serif' }}>{value}</strong>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label style={formLabelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function CustoPizzaCard() {
  const fatias = [
    { nome: 'Insumos', cor: C.greenDp, valor: 46 },
    { nome: 'Aplicacao', cor: C.amberDk, valor: 28 },
    { nome: 'Maquinas', cor: C.blue, valor: 16 },
    { nome: 'Equipe', cor: C.soil, valor: 10 }
  ]

  return (
    <div style={{ ...metricCardStyle, display: 'grid', gridTemplateColumns: '88px 1fr', gap: 12, alignItems: 'center' }}>
      <div style={pieChartStyle}>
        <div style={pieHoleStyle} />
      </div>
      <div>
        <p style={eyebrowStyle}>CUSTO TOTAL DA FAZENDA</p>
        <strong style={{ display: 'block', marginTop: 5, color: C.greenDp, fontSize: 20, fontFamily: 'Georgia, serif' }}>R$ 0,00</strong>
        <div style={{ display: 'grid', gap: 3, marginTop: 8 }}>
          {fatias.map(fatia => (
            <div key={fatia.nome} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: C.textMid }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: fatia.cor }} />
              <span>{fatia.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function insightToneStyle(tone) {
  if (tone === 'danger') return { color: C.redDk }
  if (tone === 'attention') return { color: C.amberDk }
  if (tone === 'ok') return { color: C.greenDp }
  return { color: C.textDim }
}

export function SmartInsightCard({ title, status, actionLabel, onAction, insights }) {
  const statusMap = {
    financeiro: { label: 'Financeiro', color: C.greenDp, bg: C.greenLight },
    atencao: { label: 'Atenção', color: C.amberDk, bg: C.amberLight },
    estavel: { label: 'Estável', color: C.greenDp, bg: C.greenLight },
    agronomico: { label: 'Agronômico', color: C.blue, bg: C.blueLight },
    operacional: { label: 'Operacional', color: C.soilDk, bg: C.soilLight }
  }
  const cfg = statusMap[status] || statusMap.estavel

  return (
    <div style={smartCardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={panelTitleStyle}>{title}</h3>
        <span style={{ ...smartBadgeStyle, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 13 }}>
        {insights.map(item => {
          const tone = insightToneStyle(item.tone)
          return (
            <div key={`${item.label}-${item.value}`} style={smartInsightRowStyle}>
              <span style={{ ...smartDotStyle, background: tone.color }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: C.textDk, fontSize: 12, fontWeight: 800 }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', color: C.textMid, fontSize: 12, lineHeight: 1.35 }}>{item.value}</p>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={onAction} style={smartActionStyle}>{actionLabel}</button>
    </div>
  )
}

export function InsightPanel({ title, items }) {
  return (
    <div style={panelStyle}>
      <h3 style={panelTitleStyle}>{title}</h3>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {items.map(item => (
          <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: C.greenDp, marginTop: 5, flexShrink: 0 }} />
            <p style={{ margin: 0, color: C.textMid, fontSize: 12, lineHeight: 1.45 }}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function OperacaoCard({ op, open, onToggle }) {
  const info = getCategoriaInfo(op.categoria)
  const totalInsumos = (op.insumos || []).reduce((s, i) => s + Number(i.custo_total || 0), 0)
  const totalOp = totalInsumos + Number(op.custo_aplicacao || 0)

  return (
    <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${open ? info.cor : C.border}`, overflow: 'hidden', marginBottom: 6, transition: 'border 0.2s' }}>
      <button onClick={onToggle} style={{ width: '100%', background: 'none', border: 'none', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 8, height: 32, borderRadius: 4, background: info.cor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textDk }}>{info.label}</p>
          <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>{op.data_operacao} · {op.insumos?.length || 0} insumo{(op.insumos?.length || 0) !== 1 ? 's' : ''}</p>
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: info.cor, fontFamily: 'monospace', flexShrink: 0 }}>{money(totalOp)}</p>
        <span style={{ color: C.textMid, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: 14 }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${C.borderSoft}`, background: C.bgSoft }}>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 8 }}>
            {[{ l: 'INSUMOS', v: totalInsumos, c: C.greenDp }, { l: 'APLICACAO', v: Number(op.custo_aplicacao || 0), c: C.amberDk }].map(x => (
              <div key={x.l} style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '7px 9px', border: `1px solid ${C.border}` }}>
                <p style={{ margin: 0, fontSize: 7, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1px' }}>{x.l}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: x.c, fontFamily: 'monospace' }}>{money(x.v)}</p>
              </div>
            ))}
          </div>
          {op.insumos?.length > 0 && (
            <>
              <p style={{ margin: '0 0 5px', fontSize: 8, color: C.textDim, fontFamily: 'monospace', letterSpacing: '2px' }}>INSUMOS</p>
              {op.insumos.map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', background: C.bg, borderRadius: 7, marginBottom: 4, border: `1px solid ${C.borderSoft}` }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: info.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDk }}>{i.insumo?.nome}</p>
                    <p style={{ margin: 0, fontSize: 9, color: C.textMid, fontFamily: 'monospace' }}>{i.dose} {i.dose_unidade} · {i.quantidade_total} {i.insumo?.unidade} total</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: info.cor, fontFamily: 'monospace' }}>{money(i.custo_total)}</p>
                </div>
              ))}
            </>
          )}
          {op.receituario_agronomo && (
            <div style={{ marginTop: 8, padding: '7px 9px', background: C.amberLight, borderRadius: 7, border: `1px solid ${C.amber}44` }}>
              <p style={{ margin: 0, fontSize: 8, color: C.amberDk, fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 700 }}>RECEITUARIO</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDk }}>{op.receituario_agronomo} - {op.receituario_crea}</p>
            </div>
          )}
          {op.observacoes && (
            <div style={{ marginTop: 8, padding: '7px 9px', background: C.bg, borderRadius: 7, border: `1px solid ${C.borderSoft}` }}>
              <p style={{ margin: 0, fontSize: 8, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1px' }}>OBSERVACOES</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMid, lineHeight: 1.4 }}>{op.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function NovoTalhaoModal({ form, erro, salvando, setForm, onClose, onSubmit }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 18, padding: '24px 22px', width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Novo Talhao</h2>
          <button onClick={onClose} style={iconButtonStyle}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          {[['CODIGO *', 'codigo', 'T1', 'text'], ['AREA (ha) *', 'area_ha', '28.5', 'number']].map(([l, k, ph, t]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={formLabelStyle}>{l}</label>
              <input required type={t} step={t === 'number' ? '0.01' : undefined} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={formLabelStyle}>CULTURA</label>
            <select value={form.cultura} onChange={e => setForm(p => ({ ...p, cultura: e.target.value }))} style={inputStyle}>
              {[['soja', 'Soja'], ['milho', 'Milho'], ['algodao', 'Algodao'], ['feijao', 'Feijao'], ['sorgo', 'Sorgo'], ['cana', 'Cana'], ['cafe', 'Cafe'], ['outro', 'Outro']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={formLabelStyle}>FASE</label>
            <select value={form.fase} onChange={e => setForm(p => ({ ...p, fase: e.target.value }))} style={inputStyle}>
              {Object.entries(FASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {erro && <div style={{ background: C.redLight, color: C.redDk, borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12 }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ ...secondaryActionStyle, flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={salvando} style={{ ...primaryActionStyle, flex: 2, opacity: salvando ? 0.65 : 1 }}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
