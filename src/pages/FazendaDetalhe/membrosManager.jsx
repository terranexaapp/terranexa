import { useEffect, useId, useState } from 'react'
import { theme } from '../../styles/theme'
import { convidarMembro, listarMembros, revogarConvite, atualizarPapelMembro, gerarLinkConvite } from '../../lib/convites'
import { FAZENDA_PAPEIS, getFazendaPapelMeta } from '../../lib/fazendaPapeis'
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

const PAPEL_OPTIONS = FAZENDA_PAPEIS
const PAPEL_LABEL = PAPEL_OPTIONS.reduce((acc, item) => {
  acc[item.papel] = item.label
  return acc
}, {})
const STATUS_LABEL = { pendente: 'Pendente', aceito: 'Ativo' }

function emptyDraft() {
  return { nome: '', email: '', papel: 'tecnico' }
}

export function MembrosManager({ fazendaId }) {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [mode, setMode] = useState('idle')
  const [draft, setDraft] = useState(emptyDraft())
  const [formError, setFormError] = useState('')
  const [emailNotice, setEmailNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const emailId = useId()
  const nomeId = useId()
  const papelId = useId()

  async function carregar() {
    setLoading(true)
    setLoadError('')
    try {
      setMembros(await listarMembros(fazendaId))
    } catch (err) {
      setLoadError(err.message || 'Não foi possível carregar membros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId])

  function startConvite() {
    setMode('convite')
    setDraft(emptyDraft())
    setFormError('')
    setEmailNotice('')
  }

  function cancel() {
    setMode('idle')
    setDraft(emptyDraft())
    setFormError('')
  }

  async function handleConvitar(e) {
    e.preventDefault()
    setFormError('')
    if (!draft.nome.trim()) {
      setFormError('Informe o nome do usuario.')
      return
    }
    if (!draft.email.trim() || !draft.email.includes('@')) {
      setFormError('Informe um e-mail válido.')
      return
    }
    setSaving(true)
    try {
      const convite = await convidarMembro({
        fazenda_id: fazendaId,
        nome: draft.nome,
        email: draft.email,
        papel: draft.papel
      })
      await carregar()
      cancel()
      setEmailNotice(convite.emailError || 'Convite criado e e-mail enviado ao usuario.')
    } catch (err) {
      if (err.message?.includes('unique') || err.code === '23505') {
        setFormError('Este e-mail já foi convidado para esta fazenda.')
      } else {
        setFormError(err.message || 'Não foi possível enviar o convite.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRevogar(membro) {
    const label = membro.status === 'pendente' ? 'cancelar este convite' : 'remover este membro'
    if (!confirm(`Confirma ${label}?`)) return
    try {
      await revogarConvite(membro.id)
      await carregar()
    } catch (err) {
      alert(err.message || 'Não foi possível revogar.')
    }
  }

  async function handleChangePapel(membro, novoPapel) {
    if (novoPapel === membro.papel) return
    try {
      await atualizarPapelMembro(membro.id, novoPapel)
      await carregar()
    } catch (err) {
      alert(err.message || 'Não foi possível alterar o papel.')
    }
  }

  function handleCopiarLink(membro) {
    const link = gerarLinkConvite(membro.token)
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(membro.id)
      setTimeout(() => setCopiedId(null), 2200)
    })
  }

  function handleAbrirEmail(membro) {
    const link = gerarLinkConvite(membro.token)
    const papel = PAPEL_LABEL[membro.papel]
    const assunto = encodeURIComponent('Convite para acessar fazenda no TerraNexa')
    const corpo = encodeURIComponent(
      `Olá,\n\nVocê foi convidado como ${papel} para acessar uma fazenda no TerraNexa.\n\nClique no link abaixo para aceitar o convite:\n${link}\n\nO link é pessoal e intransferível.`
    )
    window.open(`mailto:${membro.email}?subject=${assunto}&body=${corpo}`)
  }

  const ativos = membros.filter(m => m.status === 'aceito')
  const pendentes = membros.filter(m => m.status === 'pendente')

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>MEMBROS</p>
          <h3 style={panelTitleStyle}>Acesso à fazenda</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Convide colaboradores por e-mail com hierarquia por fazenda.
          </p>
        </div>
        <div style={headerActionsStyle}>
          <span style={mapCounterStyle}>
            {ativos.length} {ativos.length === 1 ? 'ativo' : 'ativos'}
          </span>
          <button type="button" onClick={startConvite} style={primaryActionStyle}>
            + Convidar membro
          </button>
        </div>
      </div>

      {loadError && <div style={formErrorStyle}>{loadError}</div>}
      {emailNotice && <div style={emailNotice.includes('nao foi enviado') ? formErrorStyle : successNoticeStyle}>{emailNotice}</div>}

      {mode === 'convite' && (
        <form onSubmit={handleConvitar} style={formStyle}>
          <p style={eyebrowStyle}>NOVO CONVITE</p>

          <div>
            <label htmlFor={nomeId} style={formLabelStyle}>
              NOME *
            </label>
            <input
              id={nomeId}
              required
              value={draft.nome}
              onChange={e => setDraft(d => ({ ...d, nome: e.target.value }))}
              placeholder="Nome do colaborador"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor={emailId} style={formLabelStyle}>
              E-MAIL *
            </label>
            <input
              id={emailId}
              type="email"
              required
              value={draft.email}
              onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="colaborador@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor={papelId} style={formLabelStyle}>
              PAPEL *
            </label>
            <div style={papelGridStyle}>
              {PAPEL_OPTIONS.map(option => (
                <button
                  key={option.papel}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, papel: option.papel }))}
                  style={{
                    ...papelCardStyle,
                    borderColor: draft.papel === option.papel ? C.greenDp : C.border,
                    background: draft.papel === option.papel ? C.greenLight : C.bg
                  }}
                >
                  <strong style={{ color: draft.papel === option.papel ? C.greenDp : C.textDk, fontSize: 13 }}>
                    {option.label}
                  </strong>
                  <span style={{ color: C.textMid, fontSize: 11 }}>{option.resumo}</span>
                </button>
              ))}
            </div>
          </div>

          {formError && <div style={formErrorStyle}>{formError}</div>}

          <div style={footerStyle}>
            <button type="button" onClick={cancel} style={secondaryActionStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ ...primaryActionStyle, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Gerando convite…' : 'Gerar convite'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={emptyHintStyle}>Carregando…</p>
      ) : membros.length === 0 && mode !== 'convite' ? (
        <div style={emptyStateStyle}>
          <p style={{ margin: 0, color: C.textDk, fontWeight: 800 }}>Nenhum membro convidado</p>
          <p style={{ margin: '6px 0 12px', color: C.textMid, fontSize: 12 }}>
            Convide colaboradores para acessar e trabalhar nesta fazenda.
          </p>
          <button type="button" onClick={startConvite} style={primaryActionStyle}>
            + Convidar primeiro membro
          </button>
        </div>
      ) : (
        <>
          {ativos.length > 0 && (
            <section>
              <p style={sectionTitleStyle}>MEMBROS ATIVOS ({ativos.length})</p>
              <div style={listStyle}>
                {ativos.map(m => (
                  <MemberRow
                    key={m.id}
                    membro={m}
                    copied={copiedId === m.id}
                    onCopiar={handleCopiarLink}
                    onEmail={handleAbrirEmail}
                    onRevogar={handleRevogar}
                    onChangePapel={handleChangePapel}
                  />
                ))}
              </div>
            </section>
          )}

          {pendentes.length > 0 && (
            <section style={{ marginTop: 8 }}>
              <p style={sectionTitleStyle}>CONVITES PENDENTES ({pendentes.length})</p>
              <div style={listStyle}>
                {pendentes.map(m => (
                  <MemberRow
                    key={m.id}
                    membro={m}
                    copied={copiedId === m.id}
                    onCopiar={handleCopiarLink}
                    onEmail={handleAbrirEmail}
                    onRevogar={handleRevogar}
                    onChangePapel={handleChangePapel}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function MemberRow({ membro, copied, onCopiar, onEmail, onRevogar, onChangePapel }) {
  const isPendente = membro.status === 'pendente'
  const nome = membro.nome || membro.profiles?.nome
  const papelMeta = getFazendaPapelMeta(membro.papel)

  return (
    <div style={cardStyle}>
      <div style={cardMainStyle}>
        <div style={cardInfoStyle}>
          <div style={cardHeaderStyle}>
            <strong style={{ color: C.textDk, fontSize: 13 }}>{nome || membro.email}</strong>
            <span
              style={{
                ...badgeStyle,
                color: isPendente ? C.amberDk : C.greenDp,
                background: isPendente ? C.amberLight : C.greenLight
              }}
            >
              {STATUS_LABEL[membro.status]}
            </span>
          </div>
          {nome && <p style={cardMetaStyle}>{membro.email}</p>}
          <p style={cardMetaStyle}>
            Convidado em {new Date(membro.criado_em).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div style={cardActionsStyle}>
          {membro.status === 'aceito' && (
            <select
              value={membro.papel}
              onChange={e => onChangePapel(membro, e.target.value)}
              style={papelSelectStyle}
              aria-label="Alterar papel"
            >
              {PAPEL_OPTIONS.map(option => (
                <option key={option.papel} value={option.papel}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {membro.status === 'pendente' && (
            <span
              style={{
                ...badgeStyle,
                color: C.textMid,
                background: C.bgSoft,
                border: `1px solid ${C.border}`
              }}
            >
              {papelMeta.label}
            </span>
          )}
        </div>
      </div>

      {isPendente && (
        <div style={linkRowStyle}>
          <button
            type="button"
            onClick={() => onCopiar(membro)}
            style={{ ...linkBtnStyle, color: copied ? C.greenDp : C.blue }}
          >
            {copied ? '✓ Link copiado!' : '⎘ Copiar link de convite'}
          </button>
          <button
            type="button"
            onClick={() => onEmail(membro)}
            style={{ ...linkBtnStyle, color: C.textMid }}
          >
            ✉ Abrir e-mail
          </button>
          <button
            type="button"
            onClick={() => onRevogar(membro)}
            style={{ ...dangerGhostButtonStyle, fontSize: 11, padding: '3px 8px' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {!isPendente && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => onRevogar(membro)}
            style={{ ...dangerGhostButtonStyle, fontSize: 11, padding: '3px 8px' }}
          >
            Remover acesso
          </button>
        </div>
      )}
    </div>
  )
}

const shellStyle = { ...panelStyle, display: 'grid', gap: 16 }
const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap'
}
const headerActionsStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const formStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 16,
  display: 'grid',
  gap: 12
}
const papelGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }
const papelCardStyle = {
  border: `1.5px solid`,
  borderRadius: 10,
  padding: '10px 12px',
  display: 'grid',
  gap: 4,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color .15s ease, background .15s ease'
}
const footerStyle = { display: 'flex', gap: 8, alignItems: 'center' }
const successNoticeStyle = {
  background: C.greenLight,
  border: `1px solid ${C.greenDp}`,
  borderRadius: 10,
  padding: '9px 11px',
  color: C.greenDp,
  fontSize: 12,
  fontWeight: 800
}
const sectionTitleStyle = {
  margin: '0 0 8px',
  color: C.textDim,
  fontSize: 10,
  fontFamily: 'monospace',
  letterSpacing: '1.2px',
  fontWeight: 900
}
const listStyle = { display: 'grid', gap: 8 }
const cardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '12px 14px',
  display: 'grid',
  gap: 10
}
const cardMainStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }
const cardInfoStyle = { display: 'grid', gap: 2, flex: 1, minWidth: 0 }
const cardHeaderStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
const cardMetaStyle = { margin: 0, color: C.textMid, fontSize: 11 }
const cardActionsStyle = { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }
const linkRowStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: `1px solid ${C.borderSoft}`, paddingTop: 8 }
const linkBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  padding: '2px 4px',
  fontFamily: 'inherit'
}
const badgeStyle = {
  borderRadius: 999,
  padding: '3px 9px',
  fontSize: 10,
  fontFamily: 'monospace',
  fontWeight: 900,
  letterSpacing: '0.6px',
  whiteSpace: 'nowrap'
}
const papelSelectStyle = {
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '4px 8px',
  fontSize: 12,
  color: C.textDk,
  background: C.bg,
  cursor: 'pointer'
}
const emptyStateStyle = {
  background: C.bg,
  border: `1px dashed ${C.border}`,
  borderRadius: 12,
  padding: '24px 16px',
  textAlign: 'center'
}
const emptyHintStyle = {
  margin: 0,
  color: C.textDim,
  fontFamily: 'monospace',
  fontSize: 11,
  textAlign: 'center',
  padding: 20
}
