import { theme } from '../styles/theme'

const C = theme.normal

export function ErrorPanel({ error, onRetry, title = 'Não foi possível carregar' }) {
  const message = typeof error === 'string' ? error : error?.message || 'Erro desconhecido'
  return (
    <div
      style={{
        background: C.bg,
        borderRadius: 14,
        padding: '32px 20px',
        border: `1px solid ${C.redLight}`,
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textDk, fontFamily: 'Georgia, serif' }}>{title}</p>
      <p style={{ margin: '6px 0 16px', fontSize: 12, color: C.textMid }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: C.greenDp,
            color: C.bg,
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '2px',
            cursor: 'pointer'
          }}
        >
          TENTAR DE NOVO
        </button>
      )}
    </div>
  )
}
