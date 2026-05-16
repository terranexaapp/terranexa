import { cloneElement, isValidElement, useId, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { theme } from '../styles/theme'
import { Logo } from '../components/Logo'

const C = theme.normal

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn({ email, password })

    if (error) {
      setError(error.message.includes('Invalid login') ? 'E-mail ou senha incorretos' : error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${C.bgLight}, ${C.bgSoft})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: C.bg,
          borderRadius: 20,
          padding: '32px 28px',
          border: `1px solid ${C.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Logo size={56} />
          <h1
            style={{
              margin: '12px 0 4px',
              fontSize: 26,
              fontWeight: 700,
              color: C.greenDp,
              fontFamily: 'Georgia, serif',
              letterSpacing: '-0.5px'
            }}
          >
            Terra<span style={{ color: C.amber }}>Nexa</span>
          </h1>
          <p style={{ margin: 0, fontSize: 10, color: C.textDim, fontFamily: 'monospace', letterSpacing: '3px' }}>
            GESTÃO DO CAMPO
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="E-MAIL">
            <input
              type="email"
              value={email}
              required
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              style={inputStyle}
            />
          </Field>

          <Field label="SENHA">
            <input
              type="password"
              value={password}
              required
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div
              style={{
                background: C.redLight,
                color: C.redDk,
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 12,
                border: `1px solid ${C.red}33`
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? C.textDim : C.greenDp,
              color: C.bg,
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '2px',
              fontFamily: 'monospace',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 12,
            color: C.textMid
          }}
        >
          Não tem conta?{' '}
          <Link to="/signup" style={{ color: C.greenDp, fontWeight: 700 }}>
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  const id = useId()
  const child = isValidElement(children) && !children.props.id ? cloneElement(children, { id }) : children
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: 9,
          fontFamily: 'monospace',
          letterSpacing: '2px',
          color: C.textDim,
          marginBottom: 6,
          fontWeight: 700
        }}
      >
        {label}
      </label>
      {child}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize: 14,
  color: C.textDk,
  outline: 'none',
  transition: 'border 0.2s'
}
