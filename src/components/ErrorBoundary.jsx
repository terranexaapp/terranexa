import { Component } from 'react'
import { theme } from '../styles/theme'

const C = theme.normal

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (typeof window !== 'undefined' && window.console) {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg,${C.bgLight},${C.bgSoft})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}
      >
        <div
          style={{
            background: C.bg,
            borderRadius: 16,
            padding: '32px 24px',
            maxWidth: 460,
            width: '100%',
            border: `1px solid ${C.border}`,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
          <h1 style={{ margin: 0, fontSize: 20, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
            Algo deu errado
          </h1>
          <p style={{ margin: '8px 0 18px', fontSize: 13, color: C.textMid }}>
            Encontramos um erro inesperado. Recarregue a página para tentar novamente.
          </p>
          <pre
            style={{
              background: C.bgSoft,
              border: `1px solid ${C.borderSoft}`,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 11,
              color: C.redDk,
              textAlign: 'left',
              overflowX: 'auto',
              margin: '0 0 18px',
              fontFamily: 'monospace'
            }}
          >
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={this.handleReload}
            style={{
              background: C.greenDp,
              color: C.bg,
              border: 'none',
              borderRadius: 10,
              padding: '12px 22px',
              fontSize: 12,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '2px',
              cursor: 'pointer'
            }}
          >
            RECARREGAR
          </button>
        </div>
      </div>
    )
  }
}
