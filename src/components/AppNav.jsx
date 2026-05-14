import { useLocation, useNavigate } from 'react-router-dom'
import { theme } from '../styles/theme'

const C = theme.normal

const NAV_ITEMS = [
  { to: '/', label: 'Fazendas', short: 'FA', match: path => path === '/' || path.startsWith('/fazenda') },
  { to: '/insumos', label: 'Insumos', short: 'IN', match: path => path.startsWith('/insumos') },
  { to: '/os', label: 'OS', short: 'OS', match: path => path.startsWith('/os') }
]

export function AppNav({ compact = false }) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <nav className={compact ? 'app-nav app-nav-compact' : 'app-nav'} aria-label="Navegacao principal">
        {NAV_ITEMS.map(item => {
          const active = item.match(location.pathname)
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={active ? 'app-nav-item active' : 'app-nav-item'}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="app-nav-mark">{item.short}</span>
              <span className="app-nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
      <style>{`
        .app-nav {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border: 1px solid ${C.border};
          border-radius: 12px;
          background: ${C.bgLight};
        }
        .app-nav-compact {
          border-radius: 10px;
          padding: 3px;
        }
        .app-nav-item {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 34px;
          border: 1px solid transparent;
          border-radius: 9px;
          padding: 7px 10px;
          background: transparent;
          color: ${C.textMid};
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .app-nav-item.active {
          background: ${C.greenDp};
          color: ${C.bg};
          box-shadow: 0 6px 16px rgba(61, 138, 34, 0.18);
        }
        .app-nav-mark {
          display: inline-grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: ${C.bg};
          border: 1px solid ${C.border};
          color: ${C.greenDp};
          font-family: monospace;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0;
        }
        .app-nav-item.active .app-nav-mark {
          border-color: rgba(255, 255, 255, 0.4);
          color: ${C.greenDp};
        }
        @media (max-width: 760px) {
          .app-nav {
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: 12px;
            z-index: 70;
            justify-content: space-between;
            padding: 7px;
            border-radius: 16px;
            box-shadow: 0 16px 40px rgba(14, 33, 20, 0.22);
          }
          .app-nav-item {
            flex: 1;
            justify-content: center;
            min-height: 48px;
            padding: 7px 6px;
            border-radius: 12px;
          }
          .app-nav-label {
            display: block;
            font-size: 10px;
          }
        }
        @media (min-width: 761px) {
          .app-nav-compact .app-nav-label {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
