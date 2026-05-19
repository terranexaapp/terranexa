import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { FazendasPage } from './pages/FazendasPage'
import { FazendaDetalhePage } from './pages/FazendaDetalhePage'
import { InsumosPage } from './pages/InsumosPage'
import { OSPage } from './pages/OSPage'
import { AceitarConvitePage } from './pages/AceitarConvitePage'
import { CentralTerranexaPage } from './pages/CentralTerranexaPage'
import { INTERNAL_ROLES, isInternalUser } from './lib/internalRoles'
import { theme } from './styles/theme'
import { Logo } from './components/Logo'
import { ErrorBoundary } from './components/ErrorBoundary'

const C = theme.normal

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
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
  if (session) return <Navigate to="/" replace />
  return children
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
