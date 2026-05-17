import { useEffect, useId, useMemo, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  listarPragasDoencas,
  criarPragaDoenca,
  atualizarPragaDoenca,
  desativarPragaDoenca,
  reativarPragaDoenca,
  getTipoPragaInfo,
  TIPOS_PRAGA_DOENCA,
  CULTURAS_PRAGA
} from '../../lib/pragasDoencas'
import { listarInsumos } from '../../lib/insumos'
import {
  eyebrowStyle,
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

function emptyDraft() {
  return {
    codigo: '',
    nome_comum: '',
    nome_cientifico: '',
    tipo: 'praga',
    cultura_alvo: 'multi',
    sintomas: '',
    nivel_dano_economico: '',
    manejo_recomendado: '',
    insumo_sugerido_id: ''
  }
}

export function PragasDoencasSection({ fazendaId }) {
  const [itens, setItens] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterCultura, setFilterCultura] = useState('todas')
  const [incluirInativas, setIncluirInativas] = useState(false)
  const [busca, setBusca] = useState('')
  const [mode, setMode] = useState('idle')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const codigoId = useId()
  const nomeId = useId()
  const cientId = useId()
  const tipoId = useId()
  const cultId = useId()
  const sintId = useId()
  const ndeId = useId()
  const manejoId = useId()
  const insumoId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const [data, ins] = await Promise.all([
        listarPragasDoencas(fazendaId, { incluirInativas }),
        listarInsumos(fazendaId).catch(() => [])
      ])
      setItens(data)
      setInsumos(ins)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar catálogo de pragas/doenças')
      setItens([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, incluirInativas])

  const selected = itens.find(i => i.id === selectedId) || null

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return itens.filter(i => {
      if (filterTipo !== 'todos' && i.tipo !== filterTipo) return false
      if (filterCultura !== 'todas' && i.cultura_alvo !== filterCultura && i.cultura_alvo !== 'multi') return false
      if (!q) return true
      return (
        i.codigo.toLowerCase().includes(q) ||
        i.nome_comum.toLowerCase().includes(q) ||
        (i.nome_cientifico || '').toLowerCase().includes(q)
      )
    })
  }, [itens, filterTipo, filterCultura, busca])

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setDraft(emptyDraft())
    setFormError('')
  }

  function startEdit(item) {
    setMode('edit')
    setSelectedId(item.id)
    setDraft({
      codigo: item.codigo || '',
      nome_comum: item.nome_comum || '',
      nome_cientifico: item.nome_cientifico || '',
      tipo: item.tipo || 'praga',
      cultura_alvo: item.cultura_alvo || 'multi',
      sintomas: item.sintomas || '',
      nivel_dano_economico: item.nivel_dano_economico || '',
      manejo_recomendado: item.manejo_recomendado || '',
      insumo_sugerido_id: item.insumo_sugerido_id || ''
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
    if (!draft.codigo.trim()) {
      setFormError('Informe um código curto.')
      return
    }
    if (!draft.nome_comum.trim()) {
      setFormError('Informe o nome comum.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        await criarPragaDoenca({ fazenda_id: fazendaId, ...draft })
      } else if (mode === 'edit' && selected) {
        await atualizarPragaDoenca(selected.id, draft)
      }
      await carregar()
      cancel()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setFormError('Já existe um item com esse código nesta fazenda.')
      } else {
        setFormError(msg || 'Nao foi possivel salvar.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item) {
    const acao = item.ativo ? 'desativar' : 'reativar'
    if (!confirm(`Confirma ${acao} "${item.nome_comum}"?`)) return
    try {
      if (item.ativo) await desativarPragaDoenca(item.id)
      else await reativarPragaDoenca(item.id)
      await carregar()
    } catch (err) {
      alert(err.message || `Nao foi possivel ${acao}.`)
    }
  }

  return (
    <div style={sectionStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>PRAGAS, DOENÇAS E DEFICIÊNCIAS</p>
          <h3 style={panelTitleStyle}>Catálogo agronômico da fazenda</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Catálogo pré-populado com 40+ itens comuns no Brasil (soja, milho, algodão, café, cana, daninhas,
            deficiências). Você pode adicionar próprios e vincular insumos sugeridos.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          </span>
          <button type="button" onClick={startCreate} style={primaryActionStyle}>
            + Novo item
          </button>
        </div>
      </div>

      <div style={controlsRowStyle}>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por código, nome comum ou científico…"
          style={{ ...inputStyle, maxWidth: 260 }}
        />
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="todos">Todos os tipos</option>
          {TIPOS_PRAGA_DOENCA.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={filterCultura}
          onChange={e => setFilterCultura(e.target.value)}
          style={{ ...inputStyle, maxWidth: 160 }}
        >
          <option value="todas">Todas culturas</option>
          {CULTURAS_PRAGA.map(c => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <label style={toggleRowStyle}>
          <input type="checkbox" checked={incluirInativas} onChange={e => setIncluirInativas(e.target.checked)} />
          <span>Inativos</span>
        </label>
      </div>

      {loadError && (
        <div style={formErrorStyle}>
          {loadError}
          {(loadError.toLowerCase().includes('does not exist') || loadError.toLowerCase().includes('relation')) && (
            <p style={{ margin: '6px 0 0', fontSize: 11 }}>
              Rode <code>database/001K_pragas_doencas.sql</code> no SQL Editor do Supabase.
            </p>
          )}
        </div>
      )}

      <div style={layoutStyle}>
        <div style={listStyle}>
          {loading ? (
            <p style={emptyHintStyle}>Carregando…</p>
          ) : filtrados.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>Nenhum item</p>
              <p style={{ margin: '6px 0 0', color: C.textMid, fontSize: 12 }}>Ajuste os filtros ou crie um novo.</p>
            </div>
          ) : (
            filtrados.map(item => {
              const tipo = getTipoPragaInfo(item.tipo)
              const isSelected = selectedId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => startEdit(item)}
                  style={{ ...cardStyle, borderColor: isSelected ? C.greenDp : C.border }}
                >
                  <div style={cardHeaderStyle}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0 }}>
                      <code style={codigoStyle}>{item.codigo}</code>
                      <strong style={{ color: C.textDk, fontSize: 13 }}>{item.nome_comum}</strong>
                    </div>
                    <span style={{ ...badgeStyle, color: tipo.cor, background: `${tipo.cor}22` }}>{tipo.label}</span>
                  </div>
                  <div style={cardMetaStyle}>
                    {item.nome_cientifico && <em style={{ color: C.textDim }}>{item.nome_cientifico}</em>}
                    {item.cultura_alvo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.cultura_alvo}</span>
                      </>
                    )}
                    {!item.ativo && <span style={{ color: C.textDim }}>(inativo)</span>}
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
                Clique num item da lista pra editar, ou em &quot;+ Novo item&quot; pra adicionar.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 10 }}>
              <p style={eyebrowStyle}>{mode === 'create' ? 'NOVO ITEM' : 'EDITAR ITEM'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={codigoId} style={formLabelStyle}>
                    CÓDIGO *
                  </label>
                  <input
                    id={codigoId}
                    required
                    maxLength={24}
                    value={draft.codigo}
                    onChange={e => setDraft(d => ({ ...d, codigo: e.target.value.toUpperCase() }))}
                    placeholder="LAG_SOJA"
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label htmlFor={nomeId} style={formLabelStyle}>
                    NOME COMUM *
                  </label>
                  <input
                    id={nomeId}
                    required
                    value={draft.nome_comum}
                    onChange={e => setDraft(d => ({ ...d, nome_comum: e.target.value }))}
                    placeholder="Lagarta-da-soja"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={cientId} style={formLabelStyle}>
                  NOME CIENTÍFICO
                </label>
                <input
                  id={cientId}
                  value={draft.nome_cientifico}
                  onChange={e => setDraft(d => ({ ...d, nome_cientifico: e.target.value }))}
                  placeholder="Anticarsia gemmatalis"
                  style={{ ...inputStyle, fontStyle: 'italic' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={tipoId} style={formLabelStyle}>
                    TIPO
                  </label>
                  <select
                    id={tipoId}
                    value={draft.tipo}
                    onChange={e => setDraft(d => ({ ...d, tipo: e.target.value }))}
                    style={inputStyle}
                  >
                    {TIPOS_PRAGA_DOENCA.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={cultId} style={formLabelStyle}>
                    CULTURA ALVO
                  </label>
                  <select
                    id={cultId}
                    value={draft.cultura_alvo}
                    onChange={e => setDraft(d => ({ ...d, cultura_alvo: e.target.value }))}
                    style={inputStyle}
                  >
                    {CULTURAS_PRAGA.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor={sintId} style={formLabelStyle}>
                  SINTOMAS CHAVE
                </label>
                <textarea
                  id={sintId}
                  rows={2}
                  value={draft.sintomas}
                  onChange={e => setDraft(d => ({ ...d, sintomas: e.target.value }))}
                  placeholder="Folhas com aspecto rendado, lagartas pretas com listras claras."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label htmlFor={ndeId} style={formLabelStyle}>
                  NÍVEL DE DANO ECONÔMICO (NDE)
                </label>
                <input
                  id={ndeId}
                  value={draft.nivel_dano_economico}
                  onChange={e => setDraft(d => ({ ...d, nivel_dano_economico: e.target.value }))}
                  placeholder="40 lagartas grandes / m²"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor={manejoId} style={formLabelStyle}>
                  MANEJO RECOMENDADO
                </label>
                <textarea
                  id={manejoId}
                  rows={2}
                  value={draft.manejo_recomendado}
                  onChange={e => setDraft(d => ({ ...d, manejo_recomendado: e.target.value }))}
                  placeholder="Pulverização de inseticida biológico ou IGR em V3-V4."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label htmlFor={insumoId} style={formLabelStyle}>
                  INSUMO SUGERIDO
                </label>
                <select
                  id={insumoId}
                  value={draft.insumo_sugerido_id}
                  onChange={e => setDraft(d => ({ ...d, insumo_sugerido_id: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Sem sugestão</option>
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.nome} ({i.classe})
                    </option>
                  ))}
                </select>
              </div>

              {formError && <div style={formErrorStyle}>{formError}</div>}

              <div style={footerStyle}>
                <button type="button" onClick={cancel} style={secondaryActionStyle}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ ...primaryActionStyle, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Salvando…' : mode === 'create' ? 'Criar' : 'Salvar'}
                </button>
                {mode === 'edit' && selected && (
                  <button
                    type="button"
                    onClick={() => handleToggle(selected)}
                    style={{ ...dangerGhostButtonStyle, marginLeft: 'auto' }}
                  >
                    {selected.ativo ? 'Desativar' : 'Reativar'}
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

const sectionStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 14,
  display: 'grid',
  gap: 12
}
const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap'
}
const headerActionsStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const controlsRowStyle = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }
const toggleRowStyle = { display: 'flex', gap: 8, alignItems: 'center', color: C.textMid, fontSize: 12, cursor: 'pointer' }
const layoutStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(320px, 1fr)',
  gap: 12,
  alignItems: 'start'
}
const listStyle = { display: 'grid', gap: 6, alignContent: 'start', maxHeight: 520, overflowY: 'auto', paddingRight: 4 }
const cardStyle = {
  background: C.bg,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  display: 'grid',
  gap: 4,
  textAlign: 'left',
  cursor: 'pointer'
}
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }
const cardMetaStyle = { display: 'flex', gap: 6, alignItems: 'center', color: C.textMid, fontSize: 11, flexWrap: 'wrap' }
const codigoStyle = {
  fontFamily: 'monospace',
  fontSize: 10,
  fontWeight: 900,
  color: C.greenDp,
  background: C.greenLight,
  borderRadius: 4,
  padding: '2px 6px',
  letterSpacing: '0.5px'
}
const badgeStyle = {
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 9,
  fontFamily: 'monospace',
  fontWeight: 900,
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap'
}
const editorStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  minHeight: 320,
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
