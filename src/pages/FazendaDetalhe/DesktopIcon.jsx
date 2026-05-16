export function DesktopIcon({ name, size = 22 }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }
  let shape

  switch (name) {
    case 'menu':
      shape = (
        <>
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h14" />
        </>
      )
      break
    case 'bell':
      shape = (
        <>
          <path d="M15 18H9" />
          <path d="M18 16H6c1.5-1.6 2-3.5 2-6a4 4 0 0 1 8 0c0 2.5.5 4.4 2 6Z" />
          <path d="M13.6 20a2 2 0 0 1-3.2 0" />
        </>
      )
      break
    case 'help':
      shape = (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.8 9.3a2.5 2.5 0 0 1 4.8 1.2c0 1.8-2.1 2-2.1 3.6" />
          <path d="M12 17.3h.01" />
        </>
      )
      break
    case 'chevron-down':
      shape = <path d="m7 10 5 5 5-5" />
      break
    case 'dashboard':
      shape = (
        <>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
        </>
      )
      break
    case 'home':
      shape = (
        <>
          <path d="m4 11 8-7 8 7" />
          <path d="M6.5 10.5V20h11v-9.5" />
          <path d="M10 20v-5h4v5" />
        </>
      )
      break
    case 'map':
      shape = (
        <>
          <path d="M4 6.5 9 4l6 2.5 5-2.5v13.5L15 20l-6-2.5L4 20V6.5Z" />
          <path d="M9 4v13.5" />
          <path d="M15 6.5V20" />
        </>
      )
      break
    case 'cloud-rain':
      shape = (
        <>
          <path d="M7 16h10a3.5 3.5 0 0 0 .6-6.9A5.3 5.3 0 0 0 7 8.3 3.9 3.9 0 0 0 7 16Z" />
          <path d="M8 20v-1.2" />
          <path d="M12 21v-1.2" />
          <path d="M16 20v-1.2" />
        </>
      )
      break
    case 'soil':
      shape = (
        <>
          <path d="M4 15c2.4-1.5 5-1.5 8 0s5.6 1.5 8 0" />
          <path d="M4 19c2.4-1.5 5-1.5 8 0s5.6 1.5 8 0" />
          <path d="M12 12V5" />
          <path d="M12 8c2.5 0 4.5-1.5 5-3.7-2.7-.4-4.5.6-5 3.7Z" />
          <path d="M12 10c-2.3 0-4-1.3-4.5-3.2 2.2-.3 3.8.5 4.5 3.2Z" />
        </>
      )
      break
    case 'search':
      shape = (
        <>
          <circle cx="10.5" cy="10.5" r="5.8" />
          <path d="m15 15 5 5" />
        </>
      )
      break
    case 'cube':
      shape = (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M4 7.5 12 12l8-4.5" />
          <path d="M12 12v9" />
        </>
      )
      break
    case 'users':
      shape = (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.8 19c.8-3.2 2.5-4.8 5.2-4.8s4.4 1.6 5.2 4.8" />
          <path d="M15.8 10.4a2.7 2.7 0 1 0-1-5.2" />
          <path d="M15.3 14.4c2.5.3 4.1 1.8 4.9 4.6" />
        </>
      )
      break
    case 'beaker':
      shape = (
        <>
          <path d="M9 3h6" />
          <path d="M10 3v5.5L5.5 18.8A1.5 1.5 0 0 0 6.9 21h10.2a1.5 1.5 0 0 0 1.4-2.2L14 8.5V3" />
          <path d="M8.1 16h7.8" />
        </>
      )
      break
    case 'tractor':
      shape = (
        <>
          <path d="M4 16h2.4" />
          <path d="M9.6 16h4.2" />
          <path d="M16.8 16H20" />
          <path d="M7 12h6l1.2 4" />
          <path d="M7 12V7h4l2 5" />
          <path d="M5 7h3" />
          <circle cx="7.8" cy="17" r="2.7" />
          <circle cx="17.2" cy="17" r="3.2" />
        </>
      )
      break
    case 'leaf':
      shape = (
        <>
          <path d="M5 19c7.5-.4 13-6 14-14-8 .7-13.4 5.7-14 14Z" />
          <path d="M5 19c3.7-4.1 7.1-6.8 12-10" />
        </>
      )
      break
    case 'dollar':
      shape = (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v10" />
          <path d="M15 9.2c-.8-.7-1.8-1.1-3-1.1-1.5 0-2.7.8-2.7 2s1.1 1.7 2.9 2.1c1.9.4 3 .9 3 2.2s-1.2 2.2-3 2.2c-1.4 0-2.6-.4-3.6-1.3" />
        </>
      )
      break
    case 'bar-chart':
      shape = (
        <>
          <path d="M4 20h16" />
          <path d="M6.5 20v-5" />
          <path d="M11.5 20V9" />
          <path d="M16.5 20V5" />
        </>
      )
      break
    case 'gear':
      shape = (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M4.2 7.5 6 8.5" />
          <path d="M18 15.5l1.8 1" />
          <path d="M4.2 16.5 6 15.5" />
          <path d="M18 8.5l1.8-1" />
          <path d="M7.5 4.2 8.5 6" />
          <path d="M15.5 18l1 1.8" />
          <path d="M16.5 4.2 15.5 6" />
          <path d="M8.5 18l-1 1.8" />
        </>
      )
      break
    case 'report':
      shape = (
        <>
          <path d="M6 3h9l3 3v15H6V3Z" />
          <path d="M14 3v4h4" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </>
      )
      break
    case 'pencil':
      shape = (
        <>
          <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" />
          <path d="m14 8 3 3" />
        </>
      )
      break
    case 'upload':
      shape = (
        <>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 16v3h14v-3" />
        </>
      )
      break
    case 'plus-circle':
      shape = (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </>
      )
      break
    case 'refresh':
      shape = (
        <>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18 10a6.5 6.5 0 0 0-10.8-3" />
          <path d="M6 14a6.5 6.5 0 0 0 10.8 3" />
        </>
      )
      break
    default:
      shape = <circle cx="12" cy="12" r="8" />
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: 'block' }} {...common}>
      {shape}
    </svg>
  )
}
