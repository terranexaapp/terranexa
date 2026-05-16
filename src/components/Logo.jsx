import { theme } from '../styles/theme'

export function Logo({ size = 32 }) {
  const C = theme.normal
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <circle cx={80} cy={80} r={70} fill={C.greenLight} />
      <rect x={50} y={36} width={60} height={10} rx={5} fill={C.greenDp} />
      <rect x={75} y={44} width={10} height={35} rx={4} fill={C.greenDp} />
      <line x1={44} y1={79} x2={116} y2={79} stroke={C.soil} strokeWidth={2} strokeDasharray="4 3" opacity="0.5" />
      <path d="M80 79 Q58 93 48 109" stroke={C.greenDk} strokeWidth={5} strokeLinecap="round" fill="none" />
      <path d="M80 79 Q102 93 112 109" stroke={C.greenDk} strokeWidth={5} strokeLinecap="round" fill="none" />
      <path d="M80 79 Q80 95 80 111" stroke={C.greenDk} strokeWidth={5} strokeLinecap="round" fill="none" />
      <circle cx={48} cy={109} r={4} fill={C.amber} />
      <circle cx={112} cy={109} r={4} fill={C.amber} />
      <circle cx={80} cy={111} r={4} fill={C.amber} />
    </svg>
  )
}
