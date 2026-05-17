import { cloneElement, isValidElement, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { theme } from '../styles/theme'

const C = theme.normal

// Imagem agro fullscreen (campo aéreo / pôr do sol)
const BG_IMAGE = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div style={s.root}>
      {/* Background image */}
      <div style={s.bgImage} />
      {/* Dark gradient overlay */}
      <div style={s.bgOverlay} />
      {/* Subtle green tint overlay */}
      <div style={s.bgTint} />

      {/* Top brand bar (desktop) */}
      <header style={s.topBar}>
        <div style={s.topBrand}>
          <LogoSvg size={28} />
          <span style={s.topBrandText}>
            Terra<span style={{ color: '#E8A84C' }}>Nexa</span>
          </span>
        </div>
        <span style={s.topTag}>GESTÃO DO CAMPO</span>
      </header>

      {/* Main content */}
      <main style={s.main}>
        <div style={s.tagline}>
          <p style={s.taglineEyebrow}>AGRICULTURA INTELIGENTE</p>
          <h1 style={s.taglineTitle}>
            O campo<br />nas suas mãos.
          </h1>
          <p style={s.taglineSub}>
            Monitoramento, ordens de serviço, ciclos produtivos e gestão de equipe —<br />
            tudo num só lugar, do escritório à lavoura.
          </p>
        </div>

        <div style={s.card}>
          <div style={s.cardLogo}>
            <LogoSvg size={56} />
            <h2 style={s.cardTitle}>
              Terra<span style={{ color: '#E8A84C' }}>Nexa</span>
            </h2>
            <p style={s.cardTag}>GESTÃO DO CAMPO</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                required
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                style={s.input}
              />
            </Field>

            <Field label="Senha">
              <div style={s.inputWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  required
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...s.input, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={s.eyeBtn}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </Field>

            {error && <div style={s.error}>{error}</div>}

            <button type="submit" disabled={loading} style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </button>

            <p style={s.helpText}>
              Acesso restrito. Para receber um convite,<br />
              entre em contato com o gestor da sua fazenda.
            </p>
          </form>
        </div>
      </main>

      <footer style={s.footer}>
        <span>© {new Date().getFullYear()} TerraNexa</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>Plataforma de gestão agrícola</span>
      </footer>
    </div>
  )
}

// ─── Logo SVG inline (mais bonito que o componente Logo padrão) ────────────
function LogoSvg({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="rgba(126, 200, 80, 0.15)" stroke="rgba(126, 200, 80, 0.4)" strokeWidth="1.5" />
      <path d="M32 14 L32 50 M22 22 L32 14 L42 22 M20 32 L32 22 L44 32 M18 42 L32 30 L46 42"
        stroke="#7EC850" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function Field({ label, children }) {
  const id = useId()
  const child = isValidElement(children) && !children.props.id ? cloneElement(children, { id }) : children
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={s.label}>{label}</label>
      {child}
    </div>
  )
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = {
  root: {
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    color: '#fff'
  },
  bgImage: {
    position: 'absolute', inset: 0, zIndex: 0,
    backgroundImage: `url("${BG_IMAGE}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'brightness(0.55)'
  },
  bgOverlay: {
    position: 'absolute', inset: 0, zIndex: 1,
    background: 'linear-gradient(135deg, rgba(10,30,10,0.85) 0%, rgba(20,50,20,0.6) 50%, rgba(0,0,0,0.85) 100%)'
  },
  bgTint: {
    position: 'absolute', inset: 0, zIndex: 1,
    background: 'radial-gradient(circle at 30% 40%, rgba(126, 200, 80, 0.18) 0%, transparent 50%)'
  },
  topBar: {
    position: 'relative', zIndex: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 32px', flexShrink: 0
  },
  topBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  topBrandText: { fontSize: 18, fontWeight: 700, fontFamily: 'Georgia, serif', color: '#fff', letterSpacing: '-0.3px' },
  topTag: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', letterSpacing: '3px' },

  main: {
    position: 'relative', zIndex: 2, flex: 1,
    display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center',
    maxWidth: 1280, width: '100%', margin: '0 auto', padding: '20px 32px', gap: 40
  },

  tagline: { padding: '0 20px', display: 'block' },
  taglineEyebrow: {
    fontSize: 11, color: '#7EC850', fontWeight: 700,
    fontFamily: 'monospace', letterSpacing: '4px', margin: '0 0 12px'
  },
  taglineTitle: {
    fontSize: 48, fontWeight: 700, lineHeight: 1.1, margin: '0 0 16px',
    fontFamily: 'Georgia, serif', letterSpacing: '-1.5px', color: '#fff',
    textShadow: '0 2px 20px rgba(0,0,0,0.5)'
  },
  taglineSub: {
    fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', maxWidth: 480, margin: 0,
    textShadow: '0 1px 8px rgba(0,0,0,0.5)'
  },

  card: {
    background: 'rgba(15, 30, 15, 0.55)',
    backdropFilter: 'blur(24px) saturate(120%)',
    WebkitBackdropFilter: 'blur(24px) saturate(120%)',
    borderRadius: 24,
    padding: '36px 36px 28px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    width: '100%',
    maxWidth: 420,
    margin: '0 auto'
  },
  cardLogo: { textAlign: 'center', marginBottom: 28 },
  cardTitle: {
    margin: '12px 0 4px', fontSize: 28, fontWeight: 700,
    color: '#fff', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px'
  },
  cardTag: {
    margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace', letterSpacing: '3px'
  },

  form: { display: 'flex', flexDirection: 'column' },
  label: {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.7)', marginBottom: 6, letterSpacing: '0.5px'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: 12,
    fontSize: 14,
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  inputWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
    fontSize: 16, cursor: 'pointer', padding: '6px 10px'
  },
  error: {
    background: 'rgba(232, 90, 58, 0.18)',
    color: '#FFBFB0',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 14,
    fontSize: 13,
    border: '1px solid rgba(232, 90, 58, 0.4)'
  },
  btnPrimary: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #5AAE38 0%, #3D8A22 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '2px',
    fontFamily: 'system-ui',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.2s',
    boxShadow: '0 6px 20px rgba(58, 138, 34, 0.45)',
    marginTop: 6
  },
  helpText: {
    textAlign: 'center', marginTop: 22, marginBottom: 0,
    fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6
  },

  footer: {
    position: 'relative', zIndex: 2,
    textAlign: 'center', padding: '16px 20px',
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap'
  }
}

// ─── Mobile responsivo (esconde tagline lateral em telas pequenas) ─────────
if (typeof document !== 'undefined' && !document.getElementById('login-page-responsive-style')) {
  const styleEl = document.createElement('style')
  styleEl.id = 'login-page-responsive-style'
  styleEl.textContent = `
    @media (max-width: 900px) {
      .tn-login-main { grid-template-columns: 1fr !important; }
      .tn-login-tagline { display: none !important; }
    }
    @media (max-width: 600px) {
      .tn-login-topbar { padding: 16px 20px !important; }
      .tn-login-card { padding: 28px 22px !important; border-radius: 18px !important; }
    }
  `
  document.head.appendChild(styleEl)
}
