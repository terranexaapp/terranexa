import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { buscarConviteInfo, aceitarConvite } from '../lib/convites'
import { getFazendaPapelMeta } from '../lib/fazendaPapeis'
import { theme } from '../styles/theme'
import { Logo } from '../components/Logo'

const C = theme.normal

export function AceitarConvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()

  const [info, setInfo] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoadError('Link de convite inválido ou expirado.')
      return
    }
    buscarConviteInfo(token)
      .then(data => {
        if (!data) setLoadError('Convite não encontrado.')
        else setInfo(data)
      })
      .catch(() => setLoadError('Não foi possível verificar o convite.'))
  }, [token])

  async function handleAceitar() {
    setAccepting(true)
    setAcceptError('')
    try {
      const result = await aceitarConvite(token)
      if (result?.error) {
        const msgs = {
          nao_autenticado: 'Você precisa estar logado para aceitar.',
          convite_invalido: 'Este convite já foi utilizado ou foi cancelado.',
          email_diferente: `Este convite foi enviado para ${result.convite_email}. Faça login com esse e-mail.`
        }
        setAcceptError(msgs[result.error] || 'Não foi possível aceitar o convite.')
        setAccepting(false)
        return
      }
      setDone(true)
      setTimeout(() => navigate(`/fazenda/${result.fazenda_id}`), 1800)
    } catch (err) {
      setAcceptError(err.message || 'Erro ao aceitar o convite.')
      setAccepting(false)
    }
  }

  function handleLogin() {
    const redirect = `/aceitar-convite?token=${token}`
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`)
  }

  const papelMeta = info ? getFazendaPapelMeta(info.papel) : null

  if (authLoading) {
    return (
      <div style={rootStyle}>
        <Logo size={40} />
        <p style={hintStyle}>Carregando…</p>
      </div>
    )
  }

  return (
    <div style={rootStyle}>
      <div style={cardStyle}>
        <div style={brandStyle}>
          <Logo size={36} />
          <span style={brandTextStyle}>
            Terra<span style={{ color: C.amber }}>Nexa</span>
          </span>
        </div>

        {loadError ? (
          <div style={errorBoxStyle}>{loadError}</div>
        ) : !info ? (
          <p style={hintStyle}>Verificando convite…</p>
        ) : info.status !== 'pendente' ? (
          <div>
            <p style={eyebrowStyle}>CONVITE</p>
            <h2 style={titleStyle}>
              {info.status === 'aceito' ? 'Convite já aceito' : 'Convite cancelado'}
            </h2>
            <p style={subtitleStyle}>
              {info.status === 'aceito'
                ? `Você já tem acesso à fazenda "${info.fazenda_nome}".`
                : 'Este convite foi cancelado pelo responsável.'}
            </p>
            {info.status === 'aceito' && (
              <button
                type="button"
                onClick={() => navigate(`/fazenda/${info.fazenda_id}`)}
                style={primaryBtnStyle}
              >
                Ir para a fazenda
              </button>
            )}
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={successIconStyle}>✓</div>
            <h2 style={titleStyle}>Acesso liberado!</h2>
            <p style={subtitleStyle}>Redirecionando para a fazenda…</p>
          </div>
        ) : (
          <div>
            <p style={eyebrowStyle}>CONVITE PARA</p>
            <h2 style={titleStyle}>{info.fazenda_nome}</h2>

            <div style={papelBoxStyle}>
              <strong style={{ color: C.greenDp, fontSize: 15 }}>{papelMeta?.label}</strong>
              <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 13 }}>{papelMeta?.resumo}</p>
            </div>

            {acceptError && <div style={errorBoxStyle}>{acceptError}</div>}

            {session ? (
              <button
                type="button"
                onClick={handleAceitar}
                disabled={accepting}
                style={{ ...primaryBtnStyle, opacity: accepting ? 0.6 : 1 }}
              >
                {accepting ? 'Aceitando…' : 'Aceitar convite'}
              </button>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <p style={{ ...subtitleStyle, marginBottom: 4 }}>
                  Faça login (ou crie uma conta) com o e-mail para o qual o convite foi enviado.
                </p>
                <button type="button" onClick={handleLogin} style={primaryBtnStyle}>
                  Fazer login para aceitar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const rootStyle = {
  minHeight: '100vh',
  background: `linear-gradient(145deg, #f7fbef 0%, #eef8e7 46%, #fff5dc 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16
}
const cardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
  padding: '32px 28px',
  maxWidth: 420,
  width: '100%',
  boxShadow: '0 4px 32px rgba(0,0,0,0.07)'
}
const brandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 28
}
const brandTextStyle = {
  fontSize: 22,
  fontWeight: 900,
  color: C.textDk,
  letterSpacing: '-0.5px'
}
const eyebrowStyle = {
  margin: '0 0 6px',
  color: C.textDim,
  fontSize: 10,
  fontFamily: 'monospace',
  letterSpacing: '2px',
  fontWeight: 900
}
const titleStyle = {
  margin: '0 0 8px',
  color: C.textDk,
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1.2
}
const subtitleStyle = { margin: '0 0 16px', color: C.textMid, fontSize: 14 }
const papelBoxStyle = {
  background: C.greenLight,
  border: `1px solid ${C.greenDp}`,
  borderRadius: 12,
  padding: '12px 14px',
  margin: '16px 0 20px'
}
const primaryBtnStyle = {
  display: 'block',
  width: '100%',
  padding: '13px 20px',
  background: C.greenDp,
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 15,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'opacity .15s'
}
const errorBoxStyle = {
  background: C.redLight,
  border: `1px solid ${C.red}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: C.redDk,
  fontSize: 13,
  margin: '8px 0'
}
const hintStyle = {
  color: C.textDim,
  fontFamily: 'monospace',
  fontSize: 12,
  textAlign: 'center',
  margin: 0
}
const successIconStyle = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: C.greenLight,
  color: C.greenDp,
  fontSize: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
  fontWeight: 900
}
