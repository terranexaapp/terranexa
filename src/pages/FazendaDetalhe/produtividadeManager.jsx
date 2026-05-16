import { useEffect, useId, useMemo, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  listarProdutividades,
  criarProdutividade,
  atualizarProdutividade,
  desativarProdutividade,
  calcularProdutividadePorHa,
  calcularReceita,
  getUnidadeInfo,
  UNIDADES_PRODUTIVIDADE
} from '../../lib/produtividades'
import { listarSafras } from '../../lib/safras'
import { formatCultura, formatShortDate, money } from './utils'
import {
  eyebrowStyle,
  panelStyle,
  panelTitleStyle,
  primaryActionStyle,
  secondaryActionStyle,
  dangerGhostButtonStyle,
  inputStyle,
  formLabelStyle,
  formErrorStyle,
  mapCounterStyle
} from './styles'

const C = theme.normal

function emptyDraft(talhaoId = '') {
  return {
    talhao_id: talhaoId,
    safra_id: '',
    data_colheita: new Date().toISOString().slice(0, 10),
    quantidade_colhida: '',
    unidade: 'sacas',
    area_colhida_ha: '',
    preco_unitario: '',
    observacoes: ''
  }
}

export function ProdutividadeManager({ fazendaId, talhoes = [] }) {
  const [registros, setRegistros] = useState([])
  const [safras, setSafras] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterTalhao, setFilterTalhao] = useState('todos')
  const [filterSafra, setFilterSafra] = useState('todas')
  const [mode, setMode] = useState('idle')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const talhaoId = useId()
  const safraId = useId()
  const dataId = useId()
  const qtdId = useId()
  const unidadeId = useId()
  const areaId = useId()
  const precoId = useId()
  const obsId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const [regs, safs] = await Promise.all([
        listarProdutividades(fazendaId),
        listarSafras(fazendaId, { incluirInativas: true }).catch(() => [])
      ])
      setRegistros(regs)
      setSafras(safs)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar produtividade')
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId])

  const selected = registros.find(r => r.id === selectedId) || null

  const filtrados = useMemo(() => {
    return registros
      .filter(r => filterTalhao === 'todos' || r.talhao_id === filterTalhao)
      .filter(r => filterSafra === 'todas' || r.safra_id === filterSafra)
  }, [registros, filterTalhao, filterSafra])

  const kpis = useMemo(() => {
    const totalRegistros = filtrados.length
    const totalReceita = filtrados.reduce((s, r) => s + calcularReceita(r), 0)
    const produtividades = filtrados.map(calcularProdutividadePorHa).filter(p => p !== null && p > 0)
    const mediaProdutividade =
      produtividades.length > 0 ? produtividades.reduce((s, p) => s + p, 0) / produtividades.length : 0
    const talhoesColhidos = new Set(filtrados.map(r => r.talhao_id)).size
    return { totalRegistros, totalReceita, mediaProdutividade, talhoesColhidos }
  }, [filtrados])

  function startCreate(talhaoId = '') {
    setMode('create')
    setSelectedId(null)
    setDraft(emptyDraft(talhaoId))
    setFormError('')
  }

  function startEdit(registro) {
    setMode('edit')
    setSelectedId(registro.id)
    setDraft({
      talhao_id: registro.talhao_id || '',
      safra_id: registro.safra_id || '',
      data_colheita: registro.data_colheita || '',
      quantidade_colhida: registro.quantidade_colhida ?? '',
      unidade: registro.unidade || 'sacas',
      area_colhida_ha: registro.area_colhida_ha ?? '',
      preco_unitario: registro.preco_unitario ?? '',
      observacoes: registro.observacoes || ''
    })
    setFormError('')
  }

  function cancel() {
    setMode('idle')
    setDraft(emptyDraft())
    setFormError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    if (!draft.talhao_id) {
      setFormError('Selecione o talhão colhido.')
      return
    }
    if (!draft.data_colheita) {
      setFormError('Informe a data de colheita.')
      return
    }
    if (!draft.quantidade_colhida || Number(draft.quantidade_colhida) <= 0) {
      setFormError('Quantidade colhida precisa ser maior que zero.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        await criarProdutividade({ fazenda_id: fazendaId, ...draft })
      } else if (mode === 'edit' && selected) {
        await atualizarProdutividade(selected.id, draft)
      }
      await carregar()
      cancel()
    } catch (err) {
      setFormError(err.message || 'Nao foi possivel salvar o registro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(registro) {
    if (!confirm(`Confirma remover o registro de colheita do talhão "${registro.talhao?.codigo}"?`)) return
    try {
      await desativarProdutividade(registro.id)
      await carregar()
    } catch (err) {
      alert(err.message || 'Nao foi possivel remover o registro.')
    }
  }

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>PRODUTIVIDADE</p>
          <h3 style={panelTitleStyle}>Histórico de colheitas</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Registros de colheita por talhão e safra. Cálculo automático de produtividade por hectare e receita
            estimada.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
          </span>
          <button type="button" onClick={() => startCreate()} style={primaryActionStyle}>
            + Novo registro
          </button>
        </div>
      </div>

      <div style={kpiGridStyle}>
        <KpiCard label="Talhões colhidos" value={kpis.talhoesColhidos} tone={C.textDk} />
        <KpiCard
          label="Produtividade média"
          value={kpis.mediaProdutividade > 0 ? `${kpis.mediaProdutividade.toFixed(1)} /ha` : '—'}
          tone={C.greenDp}
          hint={kpis.mediaProdutividade > 0 ? 'na unidade de cada registro' : 'sem dados ainda'}
        />
        <KpiCard label="Receita estimada" value={money(kpis.totalReceita)} tone={C.greenDp} />
      </div>

      {loadError && (
        <div style={formErrorStyle}>
          {loadError}
          {loadError.toLowerCase().includes('does not exist') ||
          loadError.toLowerCase().includes('relation') ? (
            <p style={{ margin: '6px 0 0', fontSize: 11 }}>
              Rode <code>database/001I_produtividades.sql</code> no SQL Editor do Supabase pra criar a tabela.
            </p>
          ) : null}
        </div>
      )}

      <div style={filtersStyle}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: C.textMid }}>
          Talhão:
          <select value={filterTalhao} onChange={e => setFilterTalhao(e.target.value)} style={miniSelectStyle}>
            <option value="todos">Todos</option>
            {talhoes.map(t => (
              <option key={t.id} value={t.id}>
                {t.codigo}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: C.textMid }}>
          Safra:
          <select value={filterSafra} onChange={e => setFilterSafra(e.target.value)} style={miniSelectStyle}>
            <option value="todas">Todas</option>
            {safras.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={layoutStyle}>
        <div style={listStyle}>
          {loading ? (
            <p style={emptyHintStyle}>Carregando…</p>
          ) : filtrados.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>
                {registros.length === 0 ? 'Nenhuma colheita registrada' : 'Nenhum registro no filtro atual'}
              </p>
              <p style={{ margin: '6px 0 12px', color: C.textMid, fontSize: 12 }}>
                {registros.length === 0
                  ? 'Registre a primeira colheita pra começar a acompanhar produtividade.'
                  : 'Tente outro filtro de talhão ou safra.'}
              </p>
              {registros.length === 0 && (
                <button type="button" onClick={() => startCreate()} style={primaryActionStyle}>
                  + Cadastrar colheita
                </button>
              )}
            </div>
          ) : (
            filtrados.map(registro => {
              const isSelected = selectedId === registro.id
              const produtividade = calcularProdutividadePorHa(registro)
              const receita = calcularReceita(registro)
              const unidade = getUnidadeInfo(registro.unidade)
              return (
                <button
                  key={registro.id}
                  type="button"
                  onClick={() => startEdit(registro)}
                  style={{ ...cardStyle, borderColor: isSelected ? C.greenDp : C.border }}
                >
                  <div style={cardHeaderStyle}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: C.textDk, fontSize: 14, display: 'block' }}>
                        {registro.talhao?.codigo || 'Talhão removido'} ·{' '}
                        {formatCultura(registro.talhao?.cultura || '')}
                      </strong>
                      <span style={{ color: C.textMid, fontSize: 11 }}>
                        {formatShortDate(registro.data_colheita)}
                        {registro.safra && ` · ${registro.safra.nome}`}
                      </span>
                    </div>
                    <span style={badgeStyle}>{Number(registro.quantidade_colhida).toLocaleString('pt-BR')} {unidade.label.split(' ')[0].toLowerCase()}</span>
                  </div>
                  <div style={cardMetaStyle}>
                    {produtividade !== null && (
                      <span>
                        <strong style={{ color: C.greenDp }}>{produtividade.toFixed(1)}</strong> /ha
                      </span>
                    )}
                    {registro.area_colhida_ha && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{Number(registro.area_colhida_ha).toFixed(2)} ha colhida</span>
                      </>
                    )}
                    {receita > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{money(receita)}</span>
                      </>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div style={editorStyle}>
          {mode === 'idle' ? (
            <div style={emptyEditorStyle}>
              <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>Selecione ou crie</p>
              <p style={{ margin: '6px 0 0', color: C.textMid, fontSize: 12 }}>
                Clique num registro pra editar ou em &quot;+ Novo registro&quot; pra adicionar uma colheita.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 10 }}>
              <p style={eyebrowStyle}>{mode === 'create' ? 'NOVO REGISTRO' : 'EDITAR REGISTRO'}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={talhaoId} style={formLabelStyle}>
                    TALHÃO *
                  </label>
                  <select
                    id={talhaoId}
                    required
                    value={draft.talhao_id}
                    onChange={e => setDraft(d => ({ ...d, talhao_id: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Selecione…</option>
                    {talhoes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.codigo} ({formatCultura(t.cultura)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={safraId} style={formLabelStyle}>
                    SAFRA
                  </label>
                  <select
                    id={safraId}
                    value={draft.safra_id}
                    onChange={e => setDraft(d => ({ ...d, safra_id: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Sem safra vinculada</option>
                    {safras.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={dataId} style={formLabelStyle}>
                  DATA DA COLHEITA *
                </label>
                <input
                  id={dataId}
                  type="date"
                  required
                  value={draft.data_colheita}
                  onChange={e => setDraft(d => ({ ...d, data_colheita: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={qtdId} style={formLabelStyle}>
                    QUANTIDADE *
                  </label>
                  <input
                    id={qtdId}
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={draft.quantidade_colhida}
                    onChange={e => setDraft(d => ({ ...d, quantidade_colhida: e.target.value }))}
                    placeholder="850"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor={unidadeId} style={formLabelStyle}>
                    UNIDADE
                  </label>
                  <select
                    id={unidadeId}
                    value={draft.unidade}
                    onChange={e => setDraft(d => ({ ...d, unidade: e.target.value }))}
                    style={inputStyle}
                  >
                    {UNIDADES_PRODUTIVIDADE.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={areaId} style={formLabelStyle}>
                    ÁREA COLHIDA (ha)
                  </label>
                  <input
                    id={areaId}
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.area_colhida_ha}
                    onChange={e => setDraft(d => ({ ...d, area_colhida_ha: e.target.value }))}
                    placeholder="Vazio = área total do talhão"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor={precoId} style={formLabelStyle}>
                    PREÇO POR UNIDADE (R$)
                  </label>
                  <input
                    id={precoId}
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.preco_unitario}
                    onChange={e => setDraft(d => ({ ...d, preco_unitario: e.target.value }))}
                    placeholder="120.00"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={obsId} style={formLabelStyle}>
                  OBSERVAÇÕES
                </label>
                <textarea
                  id={obsId}
                  value={draft.observacoes}
                  onChange={e => setDraft(d => ({ ...d, observacoes: e.target.value }))}
                  placeholder="Boa safra, umidade 13%, perda estimada de 3%, etc."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {formError && <div style={formErrorStyle}>{formError}</div>}

              <div style={footerStyle}>
                <button type="button" onClick={cancel} style={secondaryActionStyle}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ ...primaryActionStyle, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Salvando…' : mode === 'create' ? 'Registrar colheita' : 'Salvar alterações'}
                </button>
                {mode === 'edit' && selected && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selected)}
                    style={{ ...dangerGhostButtonStyle, marginLeft: 'auto' }}
                  >
                    Remover
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
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

const shellStyle = { ...panelStyle, display: 'grid', gap: 12 }
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }
const headerActionsStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const kpiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
const filtersStyle = { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }
const miniSelectStyle = { ...inputStyle, padding: '6px 8px', fontSize: 12, width: 'auto', minWidth: 120 }
const layoutStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)',
  gap: 12,
  alignItems: 'start'
}
const listStyle = { display: 'grid', gap: 8, alignContent: 'start' }
const cardStyle = {
  background: C.bg,
  border: `1.5px solid ${C.border}`,
  borderRadius: 12,
  padding: '12px 14px',
  display: 'grid',
  gap: 6,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color .15s ease'
}
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }
const cardMetaStyle = { display: 'flex', gap: 6, alignItems: 'center', color: C.textMid, fontSize: 12, flexWrap: 'wrap', fontFamily: 'monospace' }
const badgeStyle = {
  borderRadius: 999,
  padding: '3px 9px',
  fontSize: 11,
  fontFamily: 'monospace',
  fontWeight: 900,
  color: C.greenDp,
  background: C.greenLight,
  whiteSpace: 'nowrap'
}
const editorStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  minHeight: 340,
  alignSelf: 'start'
}
const emptyEditorStyle = { textAlign: 'center', display: 'grid', placeContent: 'center', minHeight: 240, gap: 4 }
const emptyStateStyle = {
  background: C.bg,
  border: `1px dashed ${C.border}`,
  borderRadius: 12,
  padding: '24px 16px',
  textAlign: 'center'
}
const emptyHintStyle = { margin: 0, color: C.textDim, fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: 20 }
const footerStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
