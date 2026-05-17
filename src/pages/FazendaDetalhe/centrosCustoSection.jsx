import { useEffect, useId, useMemo, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  listarCentrosCusto,
  criarCentroCusto,
  atualizarCentroCusto,
  desativarCentroCusto,
  reativarCentroCusto
} from '../../lib/centrosCusto'
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
  return { codigo: '', nome: '', descricao: '', ordem: 999 }
}

export function CentrosCustoSection({ fazendaId }) {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [mode, setMode] = useState('idle')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const codigoId = useId()
  const nomeId = useId()
  const descricaoId = useId()
  const ordemId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await listarCentrosCusto(fazendaId, { incluirInativos })
      setCentros(data)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar centros de custo')
      setCentros([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, incluirInativos])

  const selected = centros.find(c => c.id === selectedId) || null

  const filtrados = useMemo(() => {
    if (!filterText.trim()) return centros
    const q = filterText.trim().toLowerCase()
    return centros.filter(c => c.codigo.toLowerCase().includes(q) || c.nome.toLowerCase().includes(q))
  }, [centros, filterText])

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setDraft({ ...emptyDraft(), ordem: Math.max(0, ...centros.map(c => c.ordem || 0)) + 10 })
    setFormError('')
  }

  function startEdit(cc) {
    setMode('edit')
    setSelectedId(cc.id)
    setDraft({
      codigo: cc.codigo || '',
      nome: cc.nome || '',
      descricao: cc.descricao || '',
      ordem: cc.ordem ?? 999
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
      setFormError('Informe um código curto (ex: DEFE, FERT).')
      return
    }
    if (!draft.nome.trim()) {
      setFormError('Informe o nome do centro de custo.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        await criarCentroCusto({ fazenda_id: fazendaId, ...draft })
      } else if (mode === 'edit' && selected) {
        await atualizarCentroCusto(selected.id, draft)
      }
      await carregar()
      cancel()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setFormError('Já existe um CC com esse código nesta fazenda. Escolha outro.')
      } else {
        setFormError(msg || 'Nao foi possivel salvar o centro de custo.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(cc) {
    const acao = cc.ativo ? 'desativar' : 'reativar'
    if (!confirm(`Confirma ${acao} o centro de custo "${cc.nome}"?`)) return
    try {
      if (cc.ativo) await desativarCentroCusto(cc.id)
      else await reativarCentroCusto(cc.id)
      await carregar()
    } catch (err) {
      alert(err.message || `Nao foi possivel ${acao} o CC.`)
    }
  }

  return (
    <div style={sectionStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>CENTROS DE CUSTO</p>
          <h3 style={panelTitleStyle}>Categorias financeiras</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Categorias usadas pra classificar todo gasto da fazenda (operações, OS, insumos, máquinas). 34 CCs padrão
            foram criados automaticamente — você pode editar, desativar ou adicionar mais.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {centros.length} {centros.length === 1 ? 'CC' : 'CCs'}
          </span>
          <button type="button" onClick={startCreate} style={primaryActionStyle}>
            + Novo CC
          </button>
        </div>
      </div>

      <div style={controlsRowStyle}>
        <input
          type="text"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Buscar por código ou nome…"
          style={{ ...inputStyle, maxWidth: 260 }}
        />
        <label style={toggleRowStyle}>
          <input type="checkbox" checked={incluirInativos} onChange={e => setIncluirInativos(e.target.checked)} />
          <span>Mostrar inativos</span>
        </label>
      </div>

      {loadError && (
        <div style={formErrorStyle}>
          {loadError}
          {(loadError.toLowerCase().includes('does not exist') || loadError.toLowerCase().includes('relation')) && (
            <p style={{ margin: '6px 0 0', fontSize: 11 }}>
              Rode <code>database/001J_centros_custo.sql</code> no SQL Editor do Supabase pra criar a tabela.
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
              <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>
                {centros.length === 0 ? 'Nenhum CC cadastrado' : 'Nenhum CC no filtro atual'}
              </p>
              <p style={{ margin: '6px 0 0', color: C.textMid, fontSize: 12 }}>
                {centros.length === 0
                  ? 'O backfill da migration deveria ter criado 34 CCs. Veja se a migration rodou.'
                  : 'Tente outro termo na busca ou marque "Mostrar inativos".'}
              </p>
            </div>
          ) : (
            filtrados.map(cc => {
              const isSelected = selectedId === cc.id
              return (
                <button
                  key={cc.id}
                  type="button"
                  onClick={() => startEdit(cc)}
                  style={{ ...cardStyle, borderColor: isSelected ? C.greenDp : C.border }}
                >
                  <div style={cardHeaderStyle}>
                    <div style={{ minWidth: 0, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <code style={codigoStyle}>{cc.codigo}</code>
                      <strong style={{ color: C.textDk, fontSize: 13 }}>{cc.nome}</strong>
                    </div>
                    <span
                      style={{
                        ...badgeStyle,
                        color: cc.ativo ? C.greenDp : C.textDim,
                        background: cc.ativo ? C.greenLight : C.bgSoft
                      }}
                    >
                      {cc.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {cc.descricao && <p style={cardDescStyle}>{cc.descricao}</p>}
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
                Clique num CC pra editar ou em &quot;+ Novo CC&quot; pra adicionar um novo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 10 }}>
              <p style={eyebrowStyle}>{mode === 'create' ? 'NOVO CC' : 'EDITAR CC'}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={codigoId} style={formLabelStyle}>
                    CÓDIGO *
                  </label>
                  <input
                    id={codigoId}
                    required
                    maxLength={12}
                    value={draft.codigo}
                    onChange={e => setDraft(d => ({ ...d, codigo: e.target.value.toUpperCase() }))}
                    placeholder="DEFE"
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label htmlFor={nomeId} style={formLabelStyle}>
                    NOME *
                  </label>
                  <input
                    id={nomeId}
                    required
                    value={draft.nome}
                    onChange={e => setDraft(d => ({ ...d, nome: e.target.value }))}
                    placeholder="Defensivos"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={descricaoId} style={formLabelStyle}>
                  DESCRIÇÃO
                </label>
                <textarea
                  id={descricaoId}
                  rows={2}
                  value={draft.descricao}
                  onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))}
                  placeholder="Herbicidas, fungicidas, inseticidas usados em pulverização."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'end' }}>
                <div>
                  <label htmlFor={ordemId} style={formLabelStyle}>
                    ORDEM
                  </label>
                  <input
                    id={ordemId}
                    type="number"
                    min="0"
                    value={draft.ordem}
                    onChange={e => setDraft(d => ({ ...d, ordem: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <p style={{ margin: 0, color: C.textDim, fontSize: 11 }}>
                  Define a posição nas listas (menor número aparece primeiro).
                </p>
              </div>

              {formError && <div style={formErrorStyle}>{formError}</div>}

              <div style={footerStyle}>
                <button type="button" onClick={cancel} style={secondaryActionStyle}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ ...primaryActionStyle, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Salvando…' : mode === 'create' ? 'Criar CC' : 'Salvar alterações'}
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
  gridTemplateColumns: 'minmax(280px, 1.4fr) minmax(280px, 1fr)',
  gap: 12,
  alignItems: 'start'
}
const listStyle = { display: 'grid', gap: 6, alignContent: 'start', maxHeight: 460, overflowY: 'auto', paddingRight: 4 }
const cardStyle = {
  background: C.bg,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  display: 'grid',
  gap: 4,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color .15s ease'
}
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }
const cardDescStyle = { margin: 0, color: C.textMid, fontSize: 11, lineHeight: 1.35 }
const codigoStyle = {
  fontFamily: 'monospace',
  fontSize: 11,
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
  letterSpacing: '0.6px'
}
const editorStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  minHeight: 280,
  alignSelf: 'start'
}
const emptyEditorStyle = { textAlign: 'center', display: 'grid', placeContent: 'center', minHeight: 200, gap: 4 }
const emptyStateStyle = {
  background: C.bg,
  border: `1px dashed ${C.border}`,
  borderRadius: 12,
  padding: '24px 16px',
  textAlign: 'center'
}
const emptyHintStyle = { margin: 0, color: C.textDim, fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: 20 }
const footerStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
