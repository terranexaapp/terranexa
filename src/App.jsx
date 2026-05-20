import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { FazendasPage } from './pages/FazendasPage'
import { FazendaDetalhePage } from './pages/FazendaDetalhePage'
import { InsumosPage } from './pages/InsumosPage'
import { OSPage } from './pages/OSPage'
import { AceitarConvitePage } from './pages/AceitarConvitePage'
import { CentralTerranexaPage } from './pages/CentralTerranexaPage'
import { INTERNAL_ROLES, isInternalUser } from './lib/internalRoles'
import { buscarConviteInfo, buscarConvitePendentePorEmail, buscarDestinoAposLogin, conviteSenhaPath } from './lib/convites'
import { theme } from './styles/theme'
import { Logo } from './components/Logo'
import { ErrorBoundary } from './components/ErrorBoundary'

const C = theme.normal

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <PendingInviteGate session={session}>{children}</PendingInviteGate>
}

function InternalRoute({ children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!isInternalUser(profile)) return <InternalAccessDenied profile={profile} />
  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <PostAuthRedirect session={session} />
  return children
}

function safeRedirectPath(value) {
  if (!value || typeof value !== 'string') return ''
  if (!value.startsWith('/') || value.startsWith('//')) return ''
  return value
}

async function resolvePendingInvitePath(session) {
  const metadataToken = session?.user?.user_metadata?.convite_token
  if (metadataToken) {
    try {
      const info = await buscarConviteInfo(metadataToken)
      if (info?.status === 'pendente') return conviteSenhaPath(metadataToken)
    } catch {
      return conviteSenhaPath(metadataToken)
    }
  }

  try {
    const pendingInvite = await buscarConvitePendentePorEmail(session?.user?.email)
    if (pendingInvite?.token) return conviteSenhaPath(pendingInvite.token)
  } catch {
    return ''
  }

  return ''
}

function PendingInviteGate({ session, children }) {
  const location = useLocation()
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let active = true

    setTarget(null)
    resolvePendingInvitePath(session).then(nextTarget => {
      if (!active) return
      setTarget(nextTarget || '')
    })

    return () => {
      active = false
    }
  }, [location.pathname, session])

  if (target === null) return <LoadingScreen />
  if (target && location.pathname !== '/aceitar-convite') return <Navigate to={target} replace />
  return children
}

function PostAuthRedirect({ session }) {
  const location = useLocation()
  const [target, setTarget] = useState('')

  useEffect(() => {
    let active = true

    async function resolveTarget() {
      const params = new URLSearchParams(location.search)
      const explicitRedirect = safeRedirectPath(params.get('redirect'))
      if (explicitRedirect) return explicitRedirect

      try {
        const pendingInvitePath = await resolvePendingInvitePath(session)
        if (pendingInvitePath) return pendingInvitePath
        return buscarDestinoAposLogin(session?.user?.email)
      } catch {
        return '/'
      }
    }

    setTarget('')
    resolveTarget().then(nextTarget => {
      if (active) setTarget(nextTarget || '/')
    })

    return () => {
      active = false
    }
  }, [location.search, session])

  if (!target) return <LoadingScreen />
  return <Navigate to={target} replace />
}

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg,${C.bgLight},${C.bgSoft})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
      }}
    >
      <div style={{ animation: 'spin 1.4s linear infinite' }}>
        <Logo size={48} />
      </div>
      <p style={{ fontSize: 10, color: C.textDim, fontFamily: 'monospace', letterSpacing: '3px' }}>CARREGANDO...</p>
    </div>
  )
}

function InternalAccessDenied({ profile }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(145deg, ${C.bgLight}, ${C.bgSoft})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '28px 26px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.07)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Logo size={40} />
          <div>
            <p style={{ margin: 0, color: C.textDim, fontSize: 10, fontFamily: 'monospace', letterSpacing: '2px' }}>
              CENTRAL TERRANEXA
            </p>
            <h1 style={{ margin: '4px 0 0', color: C.textDk, fontSize: 22 }}>Acesso interno não liberado</h1>
          </div>
        </div>
        <p style={{ margin: '0 0 14px', color: C.textMid, fontSize: 14, lineHeight: 1.55 }}>
          Seu login está ativo, mas o perfil atual está como <strong>{profile?.papel || 'sem perfil'}</strong>. Para
          acessar a Central, o campo <strong>profiles.papel</strong> precisa ser um destes valores:{' '}
          <strong>{INTERNAL_ROLES.join(', ')}</strong>.
        </p>
        <div
          style={{
            background: C.bgLight,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 12,
            color: C.textDk,
            fontSize: 12,
            fontFamily: 'monospace',
            overflowX: 'auto'
          }}
        >
          update public.profiles set papel = 'terranexa_admin' where email = '{profile?.email || 'seu-email'}';
        </div>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: 18,
            background: C.greenDp,
            color: C.bg,
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 800,
            textDecoration: 'none'
          }}
        >
          Voltar para o app
        </a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/aceitar-convite" element={<AceitarConvitePage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <FazendasPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/fazenda/:id"
              element={
                <PrivateRoute>
                  <FazendaDetalhePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/insumos"
              element={
                <PrivateRoute>
                  <InsumosPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/os"
              element={
                <PrivateRoute>
                  <OSPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/central-terranexa"
              element={
                <InternalRoute>
                  <CentralTerranexaPage />
                </InternalRoute>
              }
            />
            <Route
              path="/centralterranexa"
              element={
                <InternalRoute>
                  <CentralTerranexaPage />
                </InternalRoute>
              }
            />
            <Route
              path="/central"
              element={
                <InternalRoute>
                  <CentralTerranexaPage />
                </InternalRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
