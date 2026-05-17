import { useEffect, useId, useState } from 'react'
import { theme } from '../../styles/theme'
import { listarEquipes, criarEquipe, atualizarEquipe, desativarEquipe, reativarEquipe } from '../../lib/equipes'
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

function emptyDraft() {
  return { nome: '', responsavel: '' }
}

export function EquipeManager({ fazendaId }) {
  const [equipes, setEquipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [incluirInativas, setIncluirInativas] = useState(false)
  const [mode, setMode] = useState('idle')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const nomeId = useId()
  const responsavelId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await listarEquipes(fazendaId, { incluirInativas })
      setEquipes(data)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar equipes')
      setEquipes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, incluirInativas])

  const selected = equipes.find(e => e.id === selectedId) || null

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setDraft(emptyDraft())
    setFormError('')
  }

  function startEdit(equipe) {
    setMode('edit')
    setSelectedId(equipe.id)
    setDraft({ nome: equipe.nome || '', responsavel: equipe.responsavel || '' })
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
    if (!draft.nome.trim()) {
      setFormError('Informe o nome da equipe.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        await criarEquipe({ fazenda_id: fazendaId, ...draft })
      } else if (mode === 'edit' && selected) {
        await atualizarEquipe(selected.id, draft)
      }
      await carregar()
      cancel()
    } catch (err) {
      setFormError(err.message || 'Nao foi possivel salvar a equipe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtiva(equipe) {
    const acao = equipe.ativa ? 'desativar' : 'reativar'
    if (!confirm(`Confirma ${acao} a equipe "${equipe.nome}"?`)) return
    try {
      if (equipe.ativa) await desativarEquipe(equipe.id)
      else await reativarEquipe(equipe.id)
      await carregar()
    } catch (err) {
      alert(err.message || `Nao foi possivel ${acao} a equipe.`)
    }
  }

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>EQUIPE</p>
          <h3 style={panelTitleStyle}>Equipes da fazenda</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Equipes de campo cadastradas. Usadas na atribuição de ordens de serviço.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {equipes.length} {equipes.length === 1 ? 'equipe' : 'equipes'}
          </span>
          <button type="button" onClick={startCreate} style={primaryActionStyle}>
            + Nova equipe
          </button>
        </div>
      </div>

      <label style={toggleRowStyle}>
        <input type="checkbox" checked={incluirInativas} onChange={e => setIncluirInativas(e.target.checked)} />
        <span>Mostrar equipes inativas</span>
      </label>

      {loadError && <div style={formErrorStyle}>{loadError}</div>}

      <div style={layoutStyle}>
        <div style={listStyle}>
          {loading ? (
            <p style={emptyHintStyle}>Carregando…</p>
          ) : equipes.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>Nenhuma equipe cadastrada</p>
              <p style={{ margin: '6px 0 12px', color: C.textMid, fontSize: 12 }}>
                Cadastre a primeira equipe pra atribuir em ordens de serviço.
              </p>
              <button type="button" onClick={startCreate} style={primaryActionStyle}>
                + Cadastrar equipe
              </button>
            </div>
          ) : (
            equipes.map(equipe => {
              const isSelected = selectedId === equipe.id
              return (
                <button
                  key={equipe.id}
                  type="button"
                  onClick={() => startEdit(equipe)}
                  style={{ ...cardStyle, borderColor: isSelected ? C.greenDp : C.border }}
                >
                  <div style={cardHeaderStyle}>
                    <strong style={{ color: C.textDk, fontSize: 14 }}>{equipe.nome}</strong>
                    <span
                      style={{
                        ...badgeStyle,
                        color: equipe.ativa ? C.greenDp : C.textDim,
                        background: equipe.ativa ? C.greenLight : C.bgSoft
                      }}
                    >
                      {equipe.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p style={cardMetaStyle}>
                    {equipe.responsavel ? `Responsável: ${equipe.responsavel}` : 'Sem responsável definido'}
                  </p>
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
                Clique numa equipe pra editar ou em &quot;+ Nova equipe&quot; pra criar uma.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
              <p style={eyebrowStyle}>{mode === 'create' ? 'NOVA EQUIPE' : 'EDITAR EQUIPE'}</p>

              <div>
                <label htmlFor={nomeId} style={formLabelStyle}>
                  NOME *
                </label>
                <input
                  id={nomeId}
                  required
                  value={draft.nome}
                  onChange={e => setDraft(d => ({ ...d, nome: e.target.value }))}
                  placeholder="Equipe Norte"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor={responsavelId} style={formLabelStyle}>
                  RESPONSÁVEL
                </label>
                <input
                  id={responsavelId}
                  value={draft.responsavel}
                  onChange={e => setDraft(d => ({ ...d, responsavel: e.target.value }))}
                  placeholder="João Silva"
                  style={inputStyle}
                />
              </div>

              {formError && <div style={formErrorStyle}>{formError}</div>}

              <div style={footerStyle}>
                <button type="button" onClick={cancel} style={secondaryActionStyle}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ ...primaryActionStyle, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Salvando…' : mode === 'create' ? 'Criar equipe' : 'Salvar alterações'}
                </button>
                {mode === 'edit' && selected && (
                  <button
                    type="button"
                    onClick={() => handleToggleAtiva(selected)}
                    style={{ ...dangerGhostButtonStyle, marginLeft: 'auto' }}
                  >
                    {selected.ativa ? 'Desativar' : 'Reativar'}
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

const shellStyle = { ...panelStyle, display: 'grid', gap: 12 }
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }
const headerActionsStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const toggleRowStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  color: C.textMid,
  fontSize: 12,
  cursor: 'pointer'
}
const layoutStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)',
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
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }
const cardMetaStyle = { margin: 0, color: C.textMid, fontSize: 12 }
const badgeStyle = {
  borderRadius: 999,
  padding: '3px 9px',
  fontSize: 10,
  fontFamily: 'monospace',
  fontWeight: 900,
  letterSpacing: '0.6px'
}
const editorStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  minHeight: 240,
  alignSelf: 'start'
}
const emptyEditorStyle = { textAlign: 'center', display: 'grid', placeContent: 'center', minHeight: 180, gap: 4 }
const emptyStateStyle = {
  background: C.bg,
  border: `1px dashed ${C.border}`,
  borderRadius: 12,
  padding: '24px 16px',
  textAlign: 'center'
}
const emptyHintStyle = { margin: 0, color: C.textDim, fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: 20 }
const footerStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
