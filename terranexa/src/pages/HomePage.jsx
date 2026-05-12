import { useAuth } from '../hooks/useAuth'
import { theme } from '../styles/theme'
import { Logo } from '../components/Logo'

const C = theme.normal

export function HomePage() {
  const { profile, signOut } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${C.bgLight}, ${C.bgSoft})`,
      padding: 24,
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: C.bg, borderRadius: 16, padding: '14px 18px',
        border: `1px solid ${C.border}`, marginBottom: 24,
        maxWidth: 720, margin: '0 auto 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={36} />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.greenDp,
              fontFamily: 'Georgia, serif' }}>
              Terra<span style={{ color: C.amber }}>Nexa</span>
            </p>
            <p style={{ margin: 0, fontSize: 9, color: C.textDim,
              fontFamily: 'monospace', letterSpacing: '2px' }}>GESTÃO DO CAMPO</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.textMid }}>
            Olá, <strong style={{ color: C.textDk }}>{profile?.nome || 'produtor'}</strong>
          </span>
          <button onClick={signOut} style={{
            background: C.bgLight, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '7px 12px', color: C.textDk,
            fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px',
            cursor: 'pointer',
          }}>SAIR</button>
        </div>
      </header>

      {/* Welcome */}
      <div style={{
        maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '40px 20px',
      }}>
        <h1 style={{
          fontSize: 28, color: C.textDk, fontWeight: 700,
          fontFamily: 'Georgia, serif', marginBottom: 12,
        }}>
          Bem-vindo, {profile?.nome?.split(' ')[0] || 'produtor'}! 🌱
        </h1>
        <p style={{ color: C.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Seu projeto está conectado ao Supabase e pronto para começar.
          O próximo passo é cadastrar sua primeira fazenda e talhões.
        </p>

        <div style={{
          background: C.bg, borderRadius: 14, padding: 20,
          border: `1px solid ${C.border}`, textAlign: 'left',
          maxWidth: 500, margin: '0 auto',
        }}>
          <p style={{
            margin: 0, fontSize: 9, color: C.greenDp,
            fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700,
          }}>STATUS DA FUNDAÇÃO</p>
          <ul style={{ marginTop: 12, listStyle: 'none', padding: 0 }}>
            {[
              ['✓', 'Banco de dados configurado', C.greenDp],
              ['✓', 'Autenticação funcionando', C.greenDp],
              ['✓', 'Perfil de usuário criado', C.greenDp],
              ['○', 'Cadastro de fazenda e talhões', C.textDim],
              ['○', 'Formulário de nova operação', C.textDim],
              ['○', 'Histórico com gráficos', C.textDim],
            ].map(([icon, txt, color], i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: i < 5 ? `1px solid ${C.borderSoft}` : 'none',
              }}>
                <span style={{ color, fontSize: 16, fontWeight: 700, width: 16 }}>{icon}</span>
                <span style={{ color: C.textDk, fontSize: 13 }}>{txt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
