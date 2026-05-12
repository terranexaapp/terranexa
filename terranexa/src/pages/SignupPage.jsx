import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { theme } from '../styles/theme'
import { Logo } from '../components/Logo'

const C = theme.normal

export function SignupPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres')
      return
    }

    setLoading(true)
    const { data, error } = await signUp({ email, password, nome })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.user && !data.session) {
      setSuccess(true)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  if (success) {
    return (
      <CenterCard>
        <div style={{ textAlign: 'center' }}>
          <Logo size={56} />
          <h2 style={{
            margin: '16px 0 8px', fontSize: 22, fontWeight: 700,
            color: C.greenDp, fontFamily: 'Georgia, serif',
          }}>Cadastro realizado!</h2>
          <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.5 }}>
            Enviamos um e-mail de confirmação para <strong>{email}</strong>.
            Confirme seu cadastro e entre.
          </p>
          <Link to="/login" style={{
            display: 'inline-block', marginTop: 20, padding: '12px 24px',
            background: C.greenDp, color: C.bg, borderRadius: 10,
            fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px',
          }}>IR PARA LOGIN</Link>
        </div>
      </CenterCard>
    )
  }

  return (
    <CenterCard>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Logo size={48} />
        <h1 style={{
          margin: '10px 0 4px', fontSize: 22, fontWeight: 700,
          color: C.greenDp, fontFamily: 'Georgia, serif',
        }}>
          Criar conta
        </h1>
        <p style={{ margin: 0, fontSize: 11, color: C.textDim,
          fontFamily: 'monospace', letterSpacing: '2px' }}>
          BEM-VINDO AO TERRANEXA
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Field label="NOME COMPLETO">
          <input type="text" value={nome} required
            onChange={e => setNome(e.target.value)}
            placeholder="Como gostaria de ser chamado"
            style={inputStyle} />
        </Field>

        <Field label="E-MAIL">
          <input type="email" value={email} required
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com" autoComplete="email"
            style={inputStyle} />
        </Field>

        <Field label="SENHA (MIN. 6 CARACTERES)">
          <input type="password" value={password} required minLength={6}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="new-password"
            style={inputStyle} />
        </Field>

        {error && (
          <div style={{
            background: C.redLight, color: C.redDk, borderRadius: 10,
            padding: '10px 12px', marginBottom: 16, fontSize: 12,
            border: `1px solid ${C.red}33`,
          }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px',
          background: loading ? C.textDim : C.greenDp,
          color: C.bg, border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 700, letterSpacing: '2px',
          fontFamily: 'monospace', cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'CRIANDO...' : 'CRIAR CONTA'}
        </button>
      </form>

      <p style={{
        textAlign: 'center', marginTop: 20, fontSize: 12, color: C.textMid,
      }}>
        Já tem conta?{' '}
        <Link to="/login" style={{ color: C.greenDp, fontWeight: 700 }}>
          Entrar
        </Link>
      </p>
    </CenterCard>
  )
}

function CenterCard({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${C.bgLight}, ${C.bgSoft})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: C.bg,
        borderRadius: 20, padding: '32px 28px',
        border: `1px solid ${C.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
      }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 9, fontFamily: 'monospace',
        letterSpacing: '2px', color: C.textDim, marginBottom: 6, fontWeight: 700,
      }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: C.bgSoft, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 14, color: C.textDk,
  outline: 'none', transition: 'border 0.2s',
}
