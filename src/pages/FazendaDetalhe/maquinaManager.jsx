import { useEffect, useId, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  listarMaquinas,
  criarMaquina,
  atualizarMaquina,
  desativarMaquina,
  reativarMaquina,
  getTipoMaquinaInfo,
  TIPOS_MAQUINA
} from '../../lib/maquinas'
import { listarCentrosCusto } from '../../lib/centrosCusto'
import { money } from './utils'
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
  return {
    nome: '',
    tipo: 'trator',
    marca: '',
    modelo: '',
    ano: '',
    capacidade: '',
    custo_hora: '',
    horimetro_atual: '',
    observacoes: '',
    centro_custo_padrao_id: ''
  }
}

export function MaquinaManager({ fazendaId }) {
  const [maquinas, setMaquinas] = useState([])
  const [centrosCusto, setCentrosCusto] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [incluirInativas, setIncluirInativas] = useState(false)
  const [mode, setMode] = useState('idle')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const nomeId = useId()
  const tipoId = useId()
  const marcaId = useId()
  const modeloId = useId()
  const anoId = useId()
  const capId = useId()
  const custoId = useId()
  const horId = useId()
  const obsId = useId()
  const ccId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      const [data, ccs] = await Promise.all([
        listarMaquinas(fazendaId, { incluirInativas }),
        listarCentrosCusto(fazendaId).catch(() => [])
      ])
      setMaquinas(data)
      setCentrosCusto(ccs)
    } catch (err) {
      setLoadError(err.message || 'Nao foi possivel carregar maquinas')
      setMaquinas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, incluirInativas])

  const selected = maquinas.find(m => m.id === selectedId) || null

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setDraft(emptyDraft())
    setFormError('')
  }

  function startEdit(maquina) {
    setMode('edit')
    setSelectedId(maquina.id)
    setDraft({
      nome: maquina.nome || '',
      tipo: maquina.tipo || 'trator',
      marca: maquina.marca || '',
      modelo: maquina.modelo || '',
      ano: maquina.ano || '',
      capacidade: maquina.capacidade || '',
      custo_hora: maquina.custo_hora ?? '',
      horimetro_atual: maquina.horimetro_atual ?? '',
      observacoes: maquina.observacoes || '',
      centro_custo_padrao_id: maquina.centro_custo_padrao_id || ''
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
      setFormError('Informe o nome da máquina.')
      return
    }
    if (draft.ano && (Number(draft.ano) < 1900 || Number(draft.ano) > new Date().getFullYear() + 1)) {
      setFormError('Ano inválido.')
      return
    }
    if (draft.custo_hora && Number(draft.custo_hora) < 0) {
      setFormError('Custo por hora não pode ser negativo.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        await criarMaquina({ fazenda_id: fazendaId, ...draft })
      } else if (mode === 'edit' && selected) {
        await atualizarMaquina(selected.id, draft)
      }
      await carregar()
      cancel()
    } catch (err) {
      setFormError(err.message || 'Nao foi possivel salvar a máquina.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtiva(maquina) {
    const acao = maquina.ativa ? 'desativar' : 'reativar'
    if (!confirm(`Confirma ${acao} a máquina "${maquina.nome}"?`)) return
    try {
      if (maquina.ativa) await desativarMaquina(maquina.id)
      else await reativarMaquina(maquina.id)
      await carregar()
    } catch (err) {
      alert(err.message || `Nao foi possivel ${acao} a máquina.`)
    }
  }

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>FROTA</p>
          <h3 style={panelTitleStyle}>Máquinas e implementos</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Frota cadastrada com tipo, capacidade e custo por hora. Usada pra custear operações e atribuir em OS.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {maquinas.length} {maquinas.length === 1 ? 'máquina' : 'máquinas'}
          </span>
          <button type="button" onClick={startCreate} style={primaryActionStyle}>
            + Nova máquina
          </button>
        </div>
      </div>

      <label style={toggleRowStyle}>
        <input type="checkbox" checked={incluirInativas} onChange={e => setIncluirInativas(e.target.checked)} />
        <span>Mostrar máquinas inativas</span>
      </label>

      {loadError && (
        <div style={formErrorStyle}>
          {loadError}
          {loadError.toLowerCase().includes('does not exist') ||
          loadError.toLowerCase().includes('relation') ? (
            <p style={{ margin: '6px 0 0', fontSize: 11 }}>
              Rode <code>database/001H_maquinas.sql</code> no SQL Editor do Supabase pra criar a tabela.
            </p>
          ) : null}
        </div>
      )}

      <div style={layoutStyle}>
        <div style={listStyle}>
          {loading ? (
            <p style={emptyHintStyle}>Carregando…</p>
          ) : maquinas.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>Nenhuma máquina cadastrada</p>
              <p style={{ margin: '6px 0 12px', color: C.textMid, fontSize: 12 }}>
                Cadastre a primeira máquina pra atribuir em ordens de serviço.
              </p>
              <button type="button" onClick={startCreate} style={primaryActionStyle}>
                + Cadastrar máquina
              </button>
            </div>
          ) : (
            maquinas.map(maquina => {
              const tipo = getTipoMaquinaInfo(maquina.tipo)
              const isSelected = selectedId === maquina.id
              return (
                <button
                  key={maquina.id}
                  type="button"
                  onClick={() => startEdit(maquina)}
                  style={{ ...cardStyle, borderColor: isSelected ? C.greenDp : C.border }}
                >
                  <div style={cardHeaderStyle}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      <span style={{ ...tipoDotStyle, background: tipo.cor }} aria-hidden="true" />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ color: C.textDk, fontSize: 14, display: 'block' }}>{maquina.nome}</strong>
                        <span style={{ color: C.textMid, fontSize: 11 }}>
                          {tipo.label}
                          {maquina.marca && ` · ${maquina.marca}`}
                          {maquina.modelo && ` ${maquina.modelo}`}
                          {maquina.ano && ` (${maquina.ano})`}
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        ...badgeStyle,
                        color: maquina.ativa ? C.greenDp : C.textDim,
                        background: maquina.ativa ? C.greenLight : C.bgSoft
                      }}
                    >
                      {maquina.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div style={cardMetaStyle}>
                    {maquina.capacidade && <span>{maquina.capacidade}</span>}
                    {maquina.capacidade && <span aria-hidden="true">·</span>}
                    <span>{money(maquina.custo_hora)}/h</span>
                    {Number(maquina.horimetro_atual) > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{Number(maquina.horimetro_atual).toFixed(1)} h</span>
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
                Clique numa máquina pra editar ou em &quot;+ Nova máquina&quot; pra criar uma.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 10 }}>
              <p style={eyebrowStyle}>{mode === 'create' ? 'NOVA MÁQUINA' : 'EDITAR MÁQUINA'}</p>

              <div>
                <label htmlFor={nomeId} style={formLabelStyle}>
                  NOME *
                </label>
                <input
                  id={nomeId}
                  required
                  value={draft.nome}
                  onChange={e => setDraft(d => ({ ...d, nome: e.target.value }))}
                  placeholder="Trator John Deere"
                  style={inputStyle}
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
                    {TIPOS_MAQUINA.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={anoId} style={formLabelStyle}>
                    ANO
                  </label>
                  <input
                    id={anoId}
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={draft.ano}
                    onChange={e => setDraft(d => ({ ...d, ano: e.target.value }))}
                    placeholder="2024"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={marcaId} style={formLabelStyle}>
                    MARCA
                  </label>
                  <input
                    id={marcaId}
                    value={draft.marca}
                    onChange={e => setDraft(d => ({ ...d, marca: e.target.value }))}
                    placeholder="John Deere"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor={modeloId} style={formLabelStyle}>
                    MODELO
                  </label>
                  <input
                    id={modeloId}
                    value={draft.modelo}
                    onChange={e => setDraft(d => ({ ...d, modelo: e.target.value }))}
                    placeholder="5078E"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={capId} style={formLabelStyle}>
                  CAPACIDADE
                </label>
                <input
                  id={capId}
                  value={draft.capacidade}
                  onChange={e => setDraft(d => ({ ...d, capacidade: e.target.value }))}
                  placeholder="75 HP / 5000 L / 8 ton"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={custoId} style={formLabelStyle}>
                    CUSTO POR HORA (R$)
                  </label>
                  <input
                    id={custoId}
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.custo_hora}
                    onChange={e => setDraft(d => ({ ...d, custo_hora: e.target.value }))}
                    placeholder="80.00"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor={horId} style={formLabelStyle}>
                    HORÍMETRO ATUAL (h)
                  </label>
                  <input
                    id={horId}
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.horimetro_atual}
                    onChange={e => setDraft(d => ({ ...d, horimetro_atual: e.target.value }))}
                    placeholder="1234.5"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={ccId} style={formLabelStyle}>
                  CENTRO DE CUSTO PADRÃO
                </label>
                <select
                  id={ccId}
                  value={draft.centro_custo_padrao_id}
                  onChange={e => setDraft(d => ({ ...d, centro_custo_padrao_id: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Sem padrão</option>
                  {centrosCusto.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.codigo} · {cc.nome}
                    </option>
                  ))}
                </select>
                <p style={{ margin: '4px 0 0', color: C.textDim, fontSize: 11 }}>
                  Sugestão de CC quando essa máquina for usada em operações ou OS.
                </p>
              </div>

              <div>
                <label htmlFor={obsId} style={formLabelStyle}>
                  OBSERVAÇÕES
                </label>
                <textarea
                  id={obsId}
                  value={draft.observacoes}
                  onChange={e => setDraft(d => ({ ...d, observacoes: e.target.value }))}
                  placeholder="Manutenção a cada 250h, óleo SAE 15W40, etc."
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
                  {saving ? 'Salvando…' : mode === 'create' ? 'Criar máquina' : 'Salvar alterações'}
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
  gap: 8,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color .15s ease'
}
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }
const cardMetaStyle = { display: 'flex', gap: 6, alignItems: 'center', color: C.textMid, fontSize: 12, flexWrap: 'wrap', fontFamily: 'monospace' }
const tipoDotStyle = { width: 10, height: 10, borderRadius: 99, flexShrink: 0 }
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
