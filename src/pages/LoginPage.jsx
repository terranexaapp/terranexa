import { cloneElement, isValidElement, useId, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Lavoura brasileira — soja, milho, algodão
const BG_IMAGE = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn({ email, password })
    if (error) {
      setError(error.message.includes('Invalid login') ? 'E-mail ou senha incorretos' : error.message)
      setLoading(false)
    } else {
      const redirect = searchParams.get('redirect')
      navigate(redirect || '/')
    }
  }

  return (
    <div style={s.root}>
      <div style={s.bgImage} />
      <div style={s.bgOverlay} />
      <div style={s.bgTint} />

      <header className="tn-topbar" style={s.topBar}>
        <div style={s.topBrand}>
          <LogoSvg size={28} />
          <span style={s.topBrandText}>
            Terra<span style={{ color: '#E8A84C' }}>Nexa</span>
          </span>
        </div>
        <span style={s.topTag}>GESTÃO DO CAMPO</span>
      </header>

      <main className="tn-main" style={s.main}>
        {/* Tagline lateral — desktop */}
        <div className="tn-tagline" style={s.tagline}>
          <p style={s.taglineEyebrow}>AGRICULTURA INTELIGENTE</p>
          <h1 style={s.taglineTitle}>
            O campo<br />nas suas mãos.
          </h1>
          <p style={s.taglineSub}>
            Seu escritório pode ser no campo.<br />
            Monitore, planeje e comande sua fazenda<br />
            de onde você estiver.
          </p>
        </div>

        {/* Card de login */}
        <div className="tn-card" style={s.card}>
          <div style={s.cardLogo}>
            <LogoSvg size={64} />
            <h2 style={s.cardTitle}>
              Terra<span style={{ color: '#E8A84C' }}>Nexa</span>
            </h2>
            <p style={s.cardTag}>GESTÃO DO CAMPO</p>
          </div>

          {/* Tagline compacta — visível só no mobile */}
          <p className="tn-mobile-tagline" style={s.mobileTagline}>
            Seu escritório pode ser no campo.
          </p>

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
                  style={{ ...s.input, paddingRight: 50 }}
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

            <button
              type="submit"
              disabled={loading}
              style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </button>

            <p style={s.helpText}>
              Dúvidas ou problemas de acesso?<br />
              <a href="mailto:contato@terranexa.com.br" style={s.helpLink}>
                contato@terranexa.com.br
              </a>
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

// ─── Logo original (replica exata do favicon.svg) ────────────────────────────
function LogoSvg({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="70" fill="#E8F4DC" />
      <rect x="50" y="36" width="60" height="10" rx="5" fill="#3D8A22" />
      <rect x="75" y="44" width="10" height="35" rx="4" fill="#3D8A22" />
      <path d="M80 79 Q58 93 48 109" stroke="#5AAE38" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M80 79 Q102 93 112 109" stroke="#5AAE38" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M80 79 Q80 95 80 111" stroke="#5AAE38" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="48" cy="109" r="4" fill="#E8A84C" />
      <circle cx="112" cy="109" r="4" fill="#E8A84C" />
      <circle cx="80" cy="111" r="4" fill="#E8A84C" />
    </svg>
  )
}

function Field({ label, children }) {
  const id = useId()
  const child = isValidElement(children) && !children.props.id ? cloneElement(children, { id }) : children
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={s.label}>{label}</label>
      {child}
    </div>
  )
}

// ─── Estilos base (desktop) ───────────────────────────────────────────────────
const s = {
  root: {
    position: 'relative',
    minHeight: '100dvh',
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
    backgroundPosition: 'center 45%',
    filter: 'brightness(0.48) saturate(1.15)'
  },
  bgOverlay: {
    position: 'absolute', inset: 0, zIndex: 1,
    background: 'linear-gradient(135deg, rgba(6,20,6,0.90) 0%, rgba(12,36,12,0.62) 50%, rgba(0,0,0,0.88) 100%)'
  },
  bgTint: {
    position: 'absolute', inset: 0, zIndex: 1,
    background: 'radial-gradient(circle at 28% 42%, rgba(126,200,80,0.16) 0%, transparent 52%)'
  },

  topBar: {
    position: 'relative', zIndex: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 36px', flexShrink: 0
  },
  topBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  topBrandText: {
    fontSize: 18, fontWeight: 700, fontFamily: 'Georgia, serif',
    color: '#fff', letterSpacing: '-0.3px'
  },
  topTag: {
    fontSize: 10, color: 'rgba(255,255,255,0.55)',
    fontFamily: 'monospace', letterSpacing: '3px'
  },

  main: {
    position: 'relative', zIndex: 2, flex: 1,
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
    maxWidth: 1280, width: '100%',
    margin: '0 auto', padding: '24px 36px 16px', gap: 48
  },

  tagline: { padding: '0 24px' },
  taglineEyebrow: {
    fontSize: 11, color: '#7EC850', fontWeight: 700,
    fontFamily: 'monospace', letterSpacing: '4px', margin: '0 0 14px'
  },
  taglineTitle: {
    fontSize: 52, fontWeight: 700, lineHeight: 1.08,
    margin: '0 0 20px', fontFamily: 'Georgia, serif',
    letterSpacing: '-1.5px', color: '#fff',
    textShadow: '0 2px 28px rgba(0,0,0,0.65)'
  },
  taglineSub: {
    fontSize: 16, lineHeight: 1.75, color: 'rgba(255,255,255,0.78)',
    maxWidth: 480, margin: 0,
    textShadow: '0 1px 10px rgba(0,0,0,0.55)'
  },

  card: {
    background: 'rgba(10,24,10,0.62)',
    backdropFilter: 'blur(28px) saturate(130%)',
    WebkitBackdropFilter: 'blur(28px) saturate(130%)',
    borderRadius: 24,
    padding: '40px 40px 32px',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 24px 72px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.07)',
    width: '100%',
    maxWidth: 430,
    margin: '0 auto'
  },
  cardLogo: { textAlign: 'center', marginBottom: 6 },
  cardTitle: {
    margin: '12px 0 4px', fontSize: 28, fontWeight: 700,
    color: '#fff', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px'
  },
  cardTag: {
    margin: '0 0 26px', fontSize: 10, color: 'rgba(255,255,255,0.42)',
    fontFamily: 'monospace', letterSpacing: '3px'
  },
  mobileTagline: {
    // controlado pelo CSS injetado abaixo
    textAlign: 'center', margin: '0 0 22px',
    fontSize: 14, color: 'rgba(255,255,255,0.68)',
    fontStyle: 'italic', lineHeight: 1.5
  },

  form: { display: 'flex', flexDirection: 'column' },
  label: {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.62)', marginBottom: 7, letterSpacing: '0.5px'
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12,
    fontSize: 15,
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit'
  },
  inputWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.52)',
    fontSize: 17, cursor: 'pointer', padding: '8px 12px', lineHeight: 1
  },
  error: {
    background: 'rgba(232,90,58,0.15)',
    color: '#FFBFB0',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 14,
    fontSize: 13,
    border: '1px solid rgba(232,90,58,0.35)'
  },
  btnPrimary: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #5AAE38 0%, #3D8A22 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '2.5px',
    fontFamily: 'system-ui',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.2s',
    boxShadow: '0 6px 24px rgba(58,138,34,0.42)',
    marginTop: 8
  },
  helpText: {
    textAlign: 'center', marginTop: 24, marginBottom: 0,
    fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 1.8
  },
  helpLink: {
    color: '#7EC850',
    textDecoration: 'none',
    fontWeight: 600,
    letterSpacing: '0.3px'
  },

  footer: {
    position: 'relative', zIndex: 2,
    textAlign: 'center', padding: '16px 20px',
    fontSize: 11, color: 'rgba(255,255,255,0.32)',
    display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap'
  }
}

// ─── Estilos responsivos ──────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('tn-login-styles')) {
  const el = document.createElement('style')
  el.id = 'tn-login-styles'
  el.textContent = `
    /* Tablet: coluna única, card centralizado */
    @media (max-width: 860px) {
      .tn-main {
        grid-template-columns: 1fr !important;
        justify-items: center !important;
        padding: 20px 24px 16px !important;
        gap: 0 !important;
      }
      .tn-tagline { display: none !important; }
      .tn-mobile-tagline { display: block !important; }
      .tn-card {
        padding: 36px 36px 28px !important;
        max-width: 460px !important;
        width: 100% !important;
      }
    }

    /* Mobile: espaçoso mas compacto */
    @media (max-width: 540px) {
      .tn-topbar { padding: 14px 20px !important; }
      .tn-main { padding: 14px 16px 12px !important; }
      .tn-card {
        padding: 32px 24px 24px !important;
        border-radius: 20px !important;
        max-width: 100% !important;
      }
    }

    /* Telefones muito pequenos */
    @media (max-width: 380px) {
      .tn-card { padding: 28px 18px 22px !important; }
    }

    /* Esconde tagline mobile por padrão (desktop) */
    .tn-mobile-tagline { display: none; }

    /* Focus nos inputs */
    input:focus {
      border-color: rgba(126,200,80,0.55) !important;
      background: rgba(255,255,255,0.10) !important;
      box-shadow: 0 0 0 3px rgba(126,200,80,0.12) !important;
    }
  `
  document.head.appendChild(el)
}
