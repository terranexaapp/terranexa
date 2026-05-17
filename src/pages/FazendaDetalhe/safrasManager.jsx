import { useEffect, useId, useState } from 'react'
import { theme } from '../../styles/theme'
import { listarSafras, criarSafra, atualizarSafra, desativarSafra, reativarSafra } from '../../lib/safras'
import { formatCultura, formatShortDate } from './utils'
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

const CULTURAS = ['soja', 'milho', 'algodao', 'feijao', 'sorgo', 'cana', 'cafe', 'outro']

function emptyDraft() {
  return { nome: '', cultura: 'soja', inicio: '', fim: '' }
}

function statusInfo(safra) {
  if (!safra.ativa) return { label: 'Inativa', cor: C.textDim, bg: C.bgSoft }
  if (!safra.inicio && !safra.fim) return { label: 'Em planejamento', cor: C.amberDk, bg: C.amberLight }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicio = safra.inicio ? new Date(safra.inicio) : null
  const fim = safra.fim ? new Date(safra.fim) : null
  if (inicio && hoje < inicio) return { label: 'Próxima', cor: C.blue, bg: C.blueLight }
  if (fim && hoje > fim) return { label: 'Encerrada', cor: C.textMid, bg: C.bgSoft }
  return { label: 'Em andamento', cor: C.greenDp, bg: C.greenLight }
}

export function SafrasManager({ fazendaId }) {
  const [safras, setSafras] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [incluirInativas, setIncluirInativas] = useState(false)
  const [mode, setMode] = useState('idle') // 'idle' | 'create' | 'edit'
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const nomeId = useId()
  const culturaId = useId()
  const inicioId = useId()
  const fimId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await listarSafras(fazendaId, { incluirInativas })
      setSafras(data)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar safras')
      setSafras([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, incluirInativas])

  const selected = safras.find(s => s.id === selectedId) || null

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setDraft(emptyDraft())
    setFormError('')
  }

  function startEdit(safra) {
    setMode('edit')
    setSelectedId(safra.id)
    setDraft({
      nome: safra.nome || '',
      cultura: safra.cultura || 'soja',
      inicio: safra.inicio || '',
      fim: safra.fim || ''
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
    if (!draft.nome.trim()) {
      setFormError('Informe o nome da safra.')
      return
    }
    if (draft.inicio && draft.fim && draft.fim < draft.inicio) {
      setFormError('Data final precisa ser depois da inicial.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        await criarSafra({ fazenda_id: fazendaId, ...draft })
      } else if (mode === 'edit' && selected) {
        await atualizarSafra(selected.id, draft)
      }
      await carregar()
      cancel()
    } catch (err) {
      setFormError(err.message || 'Nao foi possivel salvar a safra.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtiva(safra) {
    const acao = safra.ativa ? 'desativar' : 'reativar'
    if (!confirm(`Confirma ${acao} a safra "${safra.nome}"?`)) return
    try {
      if (safra.ativa) await desativarSafra(safra.id)
      else await reativarSafra(safra.id)
      await carregar()
    } catch (err) {
      alert(err.message || `Nao foi possivel ${acao} a safra.`)
    }
  }

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>SAFRAS E CICLOS</p>
          <h3 style={panelTitleStyle}>Safras da fazenda</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Ciclos agrícolas que organizam operações, custos e produtividade por período.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {safras.length} {safras.length === 1 ? 'safra' : 'safras'}
          </span>
          <button type="button" onClick={startCreate} style={primaryActionStyle}>
            + Nova safra
          </button>
        </div>
      </div>

      <label style={toggleRowStyle}>
        <input
          type="checkbox"
          checked={incluirInativas}
          onChange={e => setIncluirInativas(e.target.checked)}
        />
        <span>Mostrar safras inativas</span>
      </label>

      {loadError && <div style={formErrorStyle}>{loadError}</div>}

      <div style={layoutStyle}>
        <div style={listStyle}>
          {loading ? (
            <p style={emptyHintStyle}>Carregando…</p>
          ) : safras.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>Nenhuma safra cadastrada</p>
              <p style={{ margin: '6px 0 12px', color: C.textMid, fontSize: 12 }}>
                Crie a primeira safra pra organizar o ciclo agrícola da fazenda.
              </p>
              <button type="button" onClick={startCreate} style={primaryActionStyle}>
                + Cadastrar safra
              </button>
            </div>
          ) : (
            safras.map(safra => {
              const status = statusInfo(safra)
              const isSelected = selectedId === safra.id
              return (
                <button
                  key={safra.id}
                  type="button"
                  onClick={() => startEdit(safra)}
                  style={{ ...cardStyle, borderColor: isSelected ? C.greenDp : C.border }}
                >
                  <div style={cardHeaderStyle}>
                    <strong style={{ color: C.textDk, fontSize: 14 }}>{safra.nome}</strong>
                    <span style={{ ...badgeStyle, color: status.cor, background: status.bg }}>{status.label}</span>
                  </div>
                  <div style={cardMetaStyle}>
                    <span>{safra.cultura ? formatCultura(safra.cultura) : 'Sem cultura'}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {safra.inicio ? formatShortDate(safra.inicio) : '—'}
                      {' até '}
                      {safra.fim ? formatShortDate(safra.fim) : '—'}
                    </span>
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
                Clique numa safra pra editar ou em &quot;+ Nova safra&quot; pra criar uma.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
              <p style={eyebrowStyle}>{mode === 'create' ? 'NOVA SAFRA' : 'EDITAR SAFRA'}</p>

              <div>
                <label htmlFor={nomeId} style={formLabelStyle}>
                  NOME *
                </label>
                <input
                  id={nomeId}
                  required
                  value={draft.nome}
                  onChange={e => setDraft(d => ({ ...d, nome: e.target.value }))}
                  placeholder="Safra 2026/2027"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor={culturaId} style={formLabelStyle}>
                  CULTURA
                </label>
                <select
                  id={culturaId}
                  value={draft.cultura}
                  onChange={e => setDraft(d => ({ ...d, cultura: e.target.value }))}
                  style={inputStyle}
                >
                  {CULTURAS.map(c => (
                    <option key={c} value={c}>
                      {formatCultura(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={inicioId} style={formLabelStyle}>
                    INICIO
                  </label>
                  <input
                    id={inicioId}
                    type="date"
                    value={draft.inicio}
                    onChange={e => setDraft(d => ({ ...d, inicio: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor={fimId} style={formLabelStyle}>
                    FIM
                  </label>
                  <input
                    id={fimId}
                    type="date"
                    value={draft.fim}
                    onChange={e => setDraft(d => ({ ...d, fim: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              {formError && <div style={formErrorStyle}>{formError}</div>}

              <div style={footerStyle}>
                <button type="button" onClick={cancel} style={secondaryActionStyle}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ ...primaryActionStyle, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Salvando…' : mode === 'create' ? 'Criar safra' : 'Salvar alterações'}
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
const cardMetaStyle = { display: 'flex', gap: 6, alignItems: 'center', color: C.textMid, fontSize: 12, flexWrap: 'wrap' }
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
