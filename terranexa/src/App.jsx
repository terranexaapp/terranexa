import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { HomePage } from './pages/HomePage'
import { theme } from './styles/theme'
import { Logo } from './components/Logo'

const C = theme.normal

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
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
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${C.bgLight}, ${C.bgSoft})`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ animation: 'spin 1.4s linear infinite' }}>
        <Logo size={48} />
      </div>
      <p style={{ fontSize: 10, color: C.textDim,
        fontFamily: 'monospace', letterSpacing: '3px' }}>CARREGANDO...</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
