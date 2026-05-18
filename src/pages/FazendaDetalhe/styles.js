import { theme } from '../../styles/theme'
import { TILE_SIZE } from './constants'

const C = theme.normal

export const eyebrowStyle = {
  margin: 0,
  fontSize: 9,
  color: C.textDim,
  fontFamily: 'monospace',
  letterSpacing: '1.4px',
  fontWeight: 800
}
export const viewTitleStyle = {
  margin: '4px 0 0',
  fontSize: 24,
  color: C.textDk,
  fontWeight: 800,
  fontFamily: 'Georgia, serif'
}
export const viewSubtitleStyle = { margin: '8px 0 0', fontSize: 13, color: C.textMid, maxWidth: 620, lineHeight: 1.45 }
export const panelTitleStyle = {
  margin: 0,
  fontSize: 15,
  color: C.textDk,
  fontWeight: 800,
  fontFamily: 'Georgia, serif'
}
export const viewStackStyle = { display: 'grid', gap: 14 }
export const desktopTopbarStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 76,
  zIndex: 40,
  background: C.bg,
  borderBottom: `1px solid ${C.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 26px 0 20px',
  boxSizing: 'border-box'
}
export const desktopTopbarBrandStyle = { width: 280, display: 'flex', alignItems: 'center', gap: 14 }
export const desktopMenuButtonStyle = {
  background: C.greenDp,
  color: C.bg,
  border: 'none',
  borderRadius: 10,
  width: 42,
  height: 42,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  lineHeight: 1
}
export const desktopTopbarEyebrowStyle = {
  margin: 0,
  fontSize: 9,
  color: C.greenDp,
  fontFamily: 'monospace',
  letterSpacing: '3.2px',
  fontWeight: 900
}
export const desktopTopbarTitleStyle = {
  margin: '3px 0 0',
  color: C.textDk,
  fontSize: 22,
  lineHeight: 1.04,
  fontFamily: 'Georgia, serif',
  fontWeight: 900,
  whiteSpace: 'nowrap'
}
export const desktopTopbarActionsStyle = { display: 'flex', alignItems: 'center', gap: 15, color: C.textDk }
export const desktopUtilityButtonStyle = {
  width: 32,
  height: 32,
  border: 'none',
  background: 'transparent',
  color: C.textDk,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer'
}
export const desktopAvatarButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 999,
  border: `1px solid ${C.greenDp}22`,
  background: C.greenLight,
  color: C.greenDp,
  fontSize: 14,
  fontWeight: 900,
  cursor: 'pointer'
}
export const desktopChevronButtonStyle = {
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
  color: C.textDk,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer'
}
export const floatingHeaderStyle = {
  position: 'fixed',
  top: 14,
  left: 14,
  zIndex: 40,
  background: 'rgba(255,255,255,0.94)',
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 8,
  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
  backdropFilter: 'blur(10px)'
}
export const hamburgerButtonStyle = {
  background: C.greenDp,
  color: C.bg,
  border: 'none',
  borderRadius: 9,
  width: 36,
  height: 36,
  fontSize: 18,
  fontWeight: 900,
  cursor: 'pointer'
}
export const drawerBackdropStyle = { position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.24)' }
export const drawerStyle = {
  width: 280,
  maxWidth: '82vw',
  height: '100%',
  background: C.bg,
  borderRight: `1px solid ${C.border}`,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 9,
  boxShadow: '14px 0 40px rgba(0,0,0,0.22)',
  boxSizing: 'border-box'
}
export const drawerNavButtonStyle = {
  width: '100%',
  border: '1px solid',
  borderRadius: 11,
  padding: '12px 13px',
  fontSize: 13,
  fontWeight: 900,
  textAlign: 'left',
  cursor: 'pointer'
}
export const drawerCloseButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: 9,
  border: `1px solid ${C.border}`,
  background: C.bgLight,
  color: C.textDk,
  fontSize: 17,
  fontWeight: 900,
  cursor: 'pointer'
}
export const drawerFooterStyle = {
  marginTop: 'auto',
  borderTop: `1px solid ${C.borderSoft}`,
  paddingTop: 12,
  display: 'grid',
  gap: 9
}
export const drawerFarmInfoStyle = {
  background: C.bgLight,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 12,
  display: 'grid',
  gap: 3,
  color: C.textDk
}
export const drawerBrandStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  color: C.textDk
}
export const drawerReturnButtonStyle = {
  width: '100%',
  border: `1px solid ${C.border}`,
  borderRadius: 11,
  padding: '12px 13px',
  background: C.bgLight,
  color: C.textDk,
  fontSize: 12,
  fontWeight: 900,
  textAlign: 'left',
  cursor: 'pointer'
}
export const farmLayoutStyle = { display: 'block', alignItems: 'flex-start', gap: 14 }
export const farmSidebarStyle = { display: 'none' }
export const farmLayoutDesktopStyle = {
  display: 'grid',
  gridTemplateColumns: '244px minmax(0, 1fr)',
  gap: 0,
  alignItems: 'start',
  minHeight: 'calc(100vh - 76px)'
}
export const farmContentDesktopStyle = { minWidth: 0, padding: '0 20px 28px 24px' }
export const farmDesktopSidebarStyle = {
  position: 'sticky',
  top: 76,
  alignSelf: 'start',
  background: C.bg,
  borderRight: `1px solid ${C.border}`,
  padding: '24px 10px 22px 8px',
  height: 'calc(100vh - 76px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxSizing: 'border-box'
}
export const desktopSidebarHeaderStyle = {
  borderBottom: `1px solid ${C.borderSoft}`,
  padding: '2px 2px 11px',
  display: 'grid',
  gap: 3
}
export const desktopSidebarFarmNameStyle = {
  color: C.textDk,
  fontSize: 15,
  lineHeight: 1.15,
  fontFamily: 'Georgia, serif'
}
export const desktopSidebarFarmMetaStyle = { color: C.textMid, fontSize: 11, lineHeight: 1.25 }
export const desktopSidebarGroupsStyle = { display: 'grid', gap: 18 }
export const desktopNavGroupStyle = { display: 'grid', gap: 5 }
export const desktopNavGroupTitleStyle = {
  margin: '0 12px 5px',
  color: C.textDim,
  fontSize: 10,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  letterSpacing: '1px',
  fontWeight: 900
}
export const desktopNavButtonStyle = {
  width: '100%',
  minHeight: 44,
  border: '1px solid',
  borderRadius: 7,
  padding: '0 11px 0 18px',
  display: 'grid',
  gridTemplateColumns: '24px minmax(0, 1fr)',
  gap: 12,
  alignItems: 'center',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
}
export const desktopNavIconStyle = { width: 24, height: 24, display: 'grid', placeItems: 'center' }
export const desktopNavCodeStyle = {
  width: 24,
  height: 24,
  border: '1px solid',
  borderRadius: 7,
  display: 'grid',
  placeItems: 'center',
  fontSize: 9,
  fontFamily: 'monospace',
  fontWeight: 900
}
export const desktopNavTextStyle = { display: 'grid', gap: 1, minWidth: 0 }
export const desktopNavLabelStyle = {
  color: C.textDk,
  fontSize: 14,
  lineHeight: 1.1,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  fontWeight: 700
}
export const desktopNavHintStyle = {
  color: C.textMid,
  fontSize: 10,
  lineHeight: 1.18,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}
export const desktopSidebarFooterStyle = {
  marginTop: 'auto',
  borderTop: `1px solid ${C.borderSoft}`,
  paddingTop: 10,
  display: 'grid',
  gap: 7
}
export const desktopSidebarReturnStyle = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#25364f',
  padding: '12px 18px',
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
}
export const sidebarEyebrowStyle = {
  margin: '2px 4px 5px',
  fontSize: 9,
  color: C.textDim,
  fontFamily: 'monospace',
  letterSpacing: '1.4px',
  fontWeight: 900
}
export const sidebarNavButtonStyle = {
  width: '100%',
  border: '1px solid',
  borderRadius: 10,
  padding: '10px 11px',
  fontSize: 12,
  fontWeight: 800,
  textAlign: 'left',
  cursor: 'pointer'
}
export const heroPanelStyle = {
  background: C.bg,
  border: 'none',
  borderBottom: `1px solid ${C.border}`,
  borderRadius: 0,
  padding: '28px 20px 22px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center',
  flexWrap: 'wrap'
}
export const panelStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }
export const mapMainPageStyle = {
  position: 'relative',
  width: '100%',
  minHeight: '100vh',
  overflow: 'hidden',
  background: '#102316'
}
export const mapMainPageMobileStyle = {
  position: 'relative',
  width: '100%',
  height: '100dvh',
  minHeight: '100dvh',
  maxHeight: '100dvh',
  overflow: 'hidden',
  overscrollBehavior: 'none',
  background: '#102316'
}
export const mapTopInfoStyle = {
  position: 'absolute',
  top: 92,
  left: 18,
  zIndex: 5,
  background: 'rgba(5,18,12,0.62)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14,
  padding: '12px 14px',
  backdropFilter: 'blur(8px)',
  maxWidth: 360
}
export const mapTalhaoChipStyle = {
  position: 'absolute',
  top: 92,
  right: 18,
  zIndex: 5,
  background: 'rgba(255,255,255,0.92)',
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '11px 13px',
  minWidth: 190,
  boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
  display: 'grid',
  gap: 2
}
export const timelineDockStyle = {
  position: 'absolute',
  top: 92,
  right: 16,
  bottom: 16,
  zIndex: 6,
  width: 'min(360px, calc(100% - 32px))',
  background: 'rgba(18,73,37,0.68)',
  border: '1px solid rgba(168,217,143,0.58)',
  borderRadius: 16,
  padding: 13,
  backdropFilter: 'blur(14px)',
  boxShadow: '0 18px 48px rgba(0,0,0,0.32)',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column'
}
export const timelineMobileStyle = {
  position: 'absolute',
  left: 8,
  right: 8,
  bottom: 12,
  zIndex: 6,
  background: 'rgba(18,73,37,0.66)',
  border: '1px solid rgba(168,217,143,0.48)',
  borderRadius: 16,
  padding: 12,
  boxShadow: '0 14px 34px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(12px)',
  overflow: 'hidden'
}
export const timelineHeaderStyle = { display: 'grid', gap: 8, marginBottom: 10 }
export const timelineHeaderMobileStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 9
}
export const timelineMobileEyebrowStyle = {
  margin: 0,
  fontSize: 9,
  color: 'rgba(255,255,255,0.7)',
  fontFamily: 'monospace',
  letterSpacing: '1.1px',
  fontWeight: 900
}
export const timelineTitleStyle = { margin: '4px 0 0', color: C.bg, fontSize: 20, fontFamily: 'Georgia, serif' }
export const timelineMobileTitleStyle = {
  margin: '2px 0 0',
  color: C.bg,
  fontSize: 20,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.05
}
export const timelineAreaPillStyle = {
  justifySelf: 'flex-start',
  alignSelf: 'center',
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.28)',
  borderRadius: 999,
  padding: '5px 10px',
  color: C.bg,
  fontSize: 12,
  fontFamily: 'monospace',
  fontWeight: 900,
  whiteSpace: 'nowrap'
}
export const timelineSummaryCardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 12,
  color: C.textDk,
  display: 'grid',
  gap: 11
}
export const timelineCardTitleStyle = {
  margin: 0,
  color: C.textDk,
  fontSize: 15,
  fontFamily: 'Georgia, serif',
  fontWeight: 900
}
export const timelineSummaryRowsStyle = { display: 'grid', gap: 9 }
export const timelineSummaryRowStyle = {
  display: 'grid',
  gap: 2,
  paddingBottom: 8,
  borderBottom: `1px solid ${C.borderSoft}`
}
export const timelineSummaryLabelStyle = {
  color: C.textDim,
  fontSize: 10,
  fontFamily: 'monospace',
  fontWeight: 900,
  letterSpacing: '0.7px'
}
export const timelineSummaryValueStyle = { color: C.textDk, fontSize: 13, lineHeight: 1.3 }
export const timelineTextButtonStyle = {
  justifySelf: 'flex-start',
  background: 'transparent',
  border: 'none',
  color: C.greenDp,
  padding: 0,
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer'
}
export const timelineTableStyle = { display: 'grid', gap: 8, paddingBottom: 3 }
export const timelineTableDesktopStyle = {
  display: 'grid',
  gap: 8,
  paddingBottom: 3,
  flex: 1,
  gridAutoRows: 'minmax(96px, 1fr)'
}
export const timelineCellStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 10,
  minHeight: 92,
  textAlign: 'left',
  color: C.textDk,
  display: 'grid',
  gap: 3,
  cursor: 'pointer'
}
export const timelineTableHorizontalStyle = {
  display: 'flex',
  gap: 10,
  overflowX: 'auto',
  padding: '1px 2px 8px',
  marginRight: -12,
  scrollSnapType: 'x mandatory',
  WebkitOverflowScrolling: 'touch'
}
export const timelineCellHorizontalStyle = {
  ...timelineCellStyle,
  minWidth: 176,
  maxWidth: 176,
  minHeight: 94,
  padding: 11,
  gap: 3,
  scrollSnapAlign: 'start',
  fontSize: 13,
  lineHeight: 1.28
}
export const timelineInfoHorizontalCardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 11,
  minWidth: 188,
  maxWidth: 188,
  minHeight: 92,
  color: C.textDk,
  display: 'grid',
  alignContent: 'start',
  gap: 6,
  scrollSnapAlign: 'start',
  fontSize: 13,
  lineHeight: 1.28
}
export const timelineMetricHorizontalCardStyle = { ...timelineInfoHorizontalCardStyle, minWidth: 150, maxWidth: 150 }
export const timelineInputHorizontalCardStyle = {
  ...timelineInfoHorizontalCardStyle,
  minWidth: 190,
  maxWidth: 190,
  fontSize: 10,
  color: C.textDim,
  fontFamily: 'monospace',
  letterSpacing: '0.8px',
  fontWeight: 900
}
export const timelineCtaHorizontalStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 11,
  minWidth: 152,
  maxWidth: 152,
  minHeight: 92,
  color: C.greenDp,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  scrollSnapAlign: 'start'
}
export const timelineScrollEndStyle = { minWidth: 2, flex: '0 0 2px' }
export const timelineMonitoringStatusStyle = {
  background: C.bgSoft,
  border: '1px solid',
  borderRadius: 12,
  padding: 11,
  display: 'grid',
  gap: 4
}
export const timelineLegendGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
export const timelineLegendItemStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 9,
  display: 'grid',
  gridTemplateColumns: '12px 1fr',
  columnGap: 7,
  rowGap: 2,
  color: C.textDk,
  fontSize: 11,
  alignItems: 'center'
}
export const timelineLegendDotStyle = {
  width: 11,
  height: 11,
  borderRadius: 99,
  boxShadow: '0 0 0 2px rgba(255,255,255,0.75)'
}
export const timelineLegendRangeStyle = { gridColumn: '2', color: C.textMid, fontSize: 10, fontWeight: 800 }
export const timelineMonitoringHorizontalCardStyle = {
  ...timelineInfoHorizontalCardStyle,
  minWidth: 210,
  maxWidth: 210,
  border: '1.5px solid',
  minHeight: 100
}
export const timelineLegendHorizontalCardStyle = {
  ...timelineInfoHorizontalCardStyle,
  minWidth: 128,
  maxWidth: 128,
  minHeight: 100,
  gridTemplateColumns: '16px 1fr',
  columnGap: 8,
  rowGap: 3,
  alignItems: 'center'
}
export const timelineActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }
export const timelineActionButtonStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  padding: '8px 11px',
  color: C.textDk,
  fontWeight: 900,
  cursor: 'pointer'
}
export const timelineMobileActionButtonStyle = {
  ...timelineActionButtonStyle,
  borderRadius: 10,
  padding: '9px 13px',
  fontSize: 13
}
export const timelineModeTabsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', margin: '0 0 9px' }
export const timelineModeButtonStyle = {
  border: '1px solid rgba(255,255,255,0.72)',
  borderRadius: 999,
  padding: '7px 11px',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer'
}
export const timelineModeTabsMobileStyle = {
  display: 'flex',
  gap: 7,
  flexWrap: 'nowrap',
  overflowX: 'auto',
  margin: '0 0 9px',
  paddingBottom: 1
}
export const timelineMobileModeButtonStyle = {
  ...timelineModeButtonStyle,
  padding: '8px 12px',
  fontSize: 12,
  flex: '0 0 auto'
}
export const timelineRainLayoutStyle = { display: 'grid', gap: 8, alignItems: 'stretch' }
export const timelineDateGridStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 10,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 8,
  alignItems: 'end'
}
export const timelineDateLabelStyle = {
  display: 'grid',
  gap: 5,
  color: C.textDim,
  fontSize: 9,
  fontFamily: 'monospace',
  letterSpacing: '1px',
  fontWeight: 900
}
export const timelineDateInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '8px 9px',
  color: C.textDk,
  fontSize: 12,
  fontWeight: 800,
  minWidth: 0
}
export const timelinePrimaryButtonStyle = {
  background: C.greenDp,
  color: C.bg,
  border: 'none',
  borderRadius: 8,
  padding: '9px 10px',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer'
}
export const timelineRainGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 8 }
export const timelineRainMetricStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 10,
  color: C.textDk,
  display: 'grid',
  gap: 4
}
export const timelineRainMapStyle = {
  minHeight: 96,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.48)',
  background:
    'radial-gradient(circle at 28% 45%, rgba(70,158,205,0.88), transparent 24%), radial-gradient(circle at 72% 48%, rgba(232,168,76,0.82), transparent 28%), linear-gradient(135deg, rgba(61,138,34,0.82), rgba(18,73,37,0.92))',
  color: C.bg,
  display: 'grid',
  placeItems: 'center',
  fontSize: 22,
  fontWeight: 900,
  fontFamily: 'Georgia, serif',
  textShadow: '0 2px 10px rgba(0,0,0,0.38)'
}
export const talhaoHubStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 12,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'stretch'
}
export const talhaoMapColumnStyle = { flex: '999 1 560px', minWidth: 0 }
export const talhaoMapHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  marginBottom: 10
}
export const talhaoDecisionPanelStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 14,
  minHeight: 520,
  flex: '1 1 320px',
  maxWidth: 380,
  minWidth: 300,
  display: 'flex',
  flexDirection: 'column',
  gap: 12
}
export const emptyTalhaoPanelStyle = {
  minHeight: 420,
  display: 'grid',
  placeContent: 'center',
  textAlign: 'center',
  padding: 20
}
export const talhaoStatusBadgeStyle = {
  background: C.greenLight,
  color: C.greenDp,
  border: `1px solid ${C.greenDp}33`,
  borderRadius: 999,
  padding: '5px 9px',
  fontSize: 10,
  fontFamily: 'monospace',
  fontWeight: 900
}
export const talhaoKpiGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
export const talhaoMiniKpiStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 10,
  minHeight: 74
}
export const talhaoActionGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
export const talhaoInsightBoxStyle = {
  background: C.bg,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 12,
  padding: 12
}
export const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }
export const dashboardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 12
}
export const metricCardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 14,
  minHeight: 92
}
export const smartCardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 14,
  minHeight: 220,
  display: 'flex',
  flexDirection: 'column'
}
export const smartBadgeStyle = {
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 9,
  fontFamily: 'monospace',
  fontWeight: 900,
  letterSpacing: '0.8px',
  whiteSpace: 'nowrap'
}
export const smartInsightRowStyle = {
  display: 'grid',
  gridTemplateColumns: '9px 1fr',
  gap: 8,
  alignItems: 'flex-start',
  padding: '8px 0',
  borderBottom: `1px solid ${C.borderSoft}`
}
export const smartDotStyle = { width: 8, height: 8, borderRadius: 99, marginTop: 4 }
export const smartActionStyle = {
  marginTop: 'auto',
  alignSelf: 'flex-start',
  background: C.bg,
  color: C.greenDp,
  border: `1px solid ${C.greenDp}55`,
  borderRadius: 9,
  padding: '8px 11px',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer'
}
export const monitoringGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)',
  gap: 14,
  alignItems: 'stretch'
}
export const monitoringActionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 8,
  marginTop: 16
}
export const gpsStatusStyle = {
  marginTop: 14,
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 11,
  display: 'grid',
  gap: 3,
  color: C.textDk,
  fontSize: 12
}
export const gpsCanvasStyle = {
  position: 'relative',
  minHeight: 260,
  borderRadius: 12,
  overflow: 'hidden',
  background:
    'linear-gradient(135deg, rgba(9,42,26,0.98), rgba(47,102,50,0.9)), repeating-linear-gradient(30deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 44px)'
}
export const gpsPathLineStyle = {
  position: 'absolute',
  left: '12%',
  right: '12%',
  top: '48%',
  height: 2,
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.74), transparent)',
  transform: 'rotate(-8deg)'
}
export const gpsPointStyle = {
  position: 'absolute',
  width: 15,
  height: 15,
  borderRadius: 99,
  border: '2px solid white',
  transform: 'translate(-50%, -50%)',
  boxShadow: '0 5px 16px rgba(0,0,0,0.25)'
}
export const gpsTableStyle = { display: 'grid', gap: 8, marginTop: 10 }
export const gpsRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr 1.2fr 70px',
  gap: 10,
  alignItems: 'center',
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '9px 10px',
  color: C.textMid,
  fontSize: 12
}
export const pieChartStyle = {
  width: 82,
  height: 82,
  borderRadius: '50%',
  background: `conic-gradient(${C.greenDp} 0 46%, ${C.amberDk} 46% 74%, ${C.blue} 74% 90%, ${C.soil} 90% 100%)`,
  position: 'relative',
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)'
}
export const pieHoleStyle = {
  position: 'absolute',
  inset: 21,
  borderRadius: '50%',
  background: C.bg,
  border: `1px solid ${C.border}`
}
export const primaryActionStyle = {
  background: C.greenDp,
  color: C.bg,
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer'
}
export const secondaryActionStyle = {
  background: C.bgLight,
  color: C.textDk,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer'
}
export const primaryHeaderButtonStyle = { ...primaryActionStyle, padding: '9px 13px' }
export const smallButtonStyle = {
  background: C.greenDp,
  color: C.bg,
  border: 'none',
  borderRadius: 8,
  padding: '6px 11px',
  fontSize: 11,
  fontWeight: 800,
  cursor: 'pointer'
}
export const iconButtonStyle = {
  background: C.bgLight,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  width: 36,
  height: 36,
  fontSize: 16,
  cursor: 'pointer',
  color: C.textDk
}
export const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize: 13,
  color: C.textDk,
  outline: 'none',
  boxSizing: 'border-box'
}
export const formLabelStyle = {
  display: 'block',
  fontSize: 9,
  fontFamily: 'monospace',
  letterSpacing: '2px',
  color: C.textDim,
  marginBottom: 5,
  fontWeight: 700
}
export const dateFilterGroupStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'end',
  justifyContent: 'flex-end'
}
export const dateLabelStyle = {
  display: 'grid',
  gap: 5,
  color: C.textDim,
  fontSize: 9,
  fontFamily: 'monospace',
  letterSpacing: '1px',
  fontWeight: 800
}
export const dateInputStyle = {
  background: C.bgLight,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '9px 10px',
  color: C.textDk,
  fontSize: 12,
  fontWeight: 800,
  minWidth: 150
}
export const mapShellStyle = {
  background: '#07130f',
  borderRadius: 16,
  padding: 12,
  border: `1px solid ${C.border}`,
  minHeight: 430,
  overflow: 'hidden'
}
export const mapToolbarStyle = {
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 12
}
export const mapPillActiveStyle = {
  background: C.greenDp,
  color: C.bg,
  border: 'none',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 800
}
export const mapPillStyle = {
  background: 'rgba(8,18,15,0.86)',
  color: C.bg,
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 800
}
export const interpolationMapStyle = {
  position: 'relative',
  minHeight: 360,
  borderRadius: 12,
  overflow: 'hidden',
  background:
    'radial-gradient(circle at 30% 42%, rgba(232,90,58,0.82), transparent 20%), radial-gradient(circle at 67% 56%, rgba(232,90,58,0.74), transparent 18%), radial-gradient(circle at 54% 20%, rgba(232,168,76,0.82), transparent 18%), linear-gradient(135deg, rgba(61,138,34,0.8), rgba(18,73,37,0.9)), repeating-linear-gradient(35deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 56px)'
}
export const soilResultsShellStyle = {
  maxHeight: 380,
  overflowY: 'auto',
  borderRadius: 12,
  background: C.bgSoft,
  padding: 10,
  display: 'grid',
  gap: 8
}
export const soilNutrientRowStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '11px 12px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center'
}
export const scoutingMapStyle = {
  position: 'relative',
  minHeight: 430,
  borderRadius: 12,
  overflow: 'hidden',
  background:
    'linear-gradient(135deg, rgba(10,35,24,0.98), rgba(56,82,45,0.95)), repeating-linear-gradient(28deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 64px)'
}
export const plotShapeStyle = {
  position: 'absolute',
  border: '2px solid rgba(255,255,255,0.85)',
  borderRadius: '34% 22% 31% 18%',
  color: C.bg,
  textShadow: '0 1px 4px rgba(0,0,0,0.55)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer'
}
export const legendStyle = {
  position: 'absolute',
  left: 14,
  bottom: 14,
  background: 'rgba(5,14,11,0.86)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  color: C.bg,
  padding: 12,
  width: 190
}
export const gradientBarStyle = {
  height: 10,
  borderRadius: 99,
  margin: '8px 0 5px',
  background: 'linear-gradient(90deg, #2fb15f, #e8c84c, #ef4d39)'
}
export const managementPageStyle = { display: 'grid', gap: 14 }
export const managementHeroStyle = {
  background: C.bg,
  border: 'none',
  borderBottom: `1px solid ${C.border}`,
  borderRadius: 0,
  padding: '24px 20px 18px'
}
export const managementHeroCompactStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 12
}
export const managementWorkspaceDesktopStyle = {
  display: 'grid',
  gridTemplateColumns: '220px minmax(0, 1fr)',
  gap: 12,
  alignItems: 'start'
}
export const managementWorkspaceSingleStyle = { display: 'grid', gap: 12 }
export const managementWorkspaceMobileStyle = { display: 'grid', gap: 12 }
export const managementWorkspaceCompactStyle = { display: 'grid', gap: 10 }
export const managementNavRailStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 11,
  display: 'grid',
  alignContent: 'start',
  gap: 12,
  position: 'sticky',
  top: 86
}
export const managementNavRailMobileStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 11,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10
}
export const managementNavRailCompactStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 8,
  display: 'flex',
  gap: 7,
  overflowX: 'auto',
  position: 'sticky',
  top: 82,
  zIndex: 4,
  boxShadow: '0 8px 22px rgba(0,0,0,0.04)',
  WebkitOverflowScrolling: 'touch'
}
export const managementNavGroupStyle = { display: 'grid', gap: 6 }
export const managementNavGroupCompactStyle = { display: 'flex', gap: 7, flex: '0 0 auto' }
export const managementNavItemStyle = {
  width: '100%',
  minHeight: 44,
  border: '1px solid',
  borderRadius: 8,
  padding: '8px 9px',
  display: 'grid',
  gap: 2,
  textAlign: 'left',
  cursor: 'pointer'
}
export const managementNavItemCompactStyle = {
  minHeight: 34,
  border: '1px solid',
  borderRadius: 999,
  padding: '8px 12px',
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
}
export const managementNavLabelStyle = { color: C.textDk, fontSize: 12, lineHeight: 1.16 }
export const managementNavLabelCompactStyle = {
  color: C.textDk,
  fontSize: 12,
  lineHeight: 1,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
}
export const managementNavHintStyle = {
  color: C.textMid,
  fontSize: 10,
  lineHeight: 1.2,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
}
export const managementModuleContentStyle = { minWidth: 0 }
export const managementMenuGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 10
}
export const managementMenuCardStyle = {
  minHeight: 82,
  border: '1px solid',
  borderRadius: 10,
  padding: '12px 13px',
  display: 'grid',
  alignContent: 'start',
  gap: 5,
  textAlign: 'left',
  color: C.textDk,
  cursor: 'pointer'
}
export const managementContentPanelStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 16,
  display: 'grid',
  gap: 12
}
export const managementSummaryStripStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 14
}
export const managementSummaryCardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '15px 20px',
  display: 'grid',
  gridTemplateColumns: '44px minmax(0, 1fr)',
  gap: 15,
  alignItems: 'center',
  minHeight: 78,
  boxSizing: 'border-box'
}
export const managementSummaryIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: C.greenLight,
  color: C.greenDp,
  border: `1px solid ${C.greenDp}22`,
  display: 'grid',
  placeItems: 'center'
}
export const managementSummaryTextStyle = { display: 'grid', gap: 3, minWidth: 0 }
export const managementSummaryLabelStyle = {
  color: C.textMid,
  fontSize: 13,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
}
export const managementSummaryValueStyle = {
  color: C.textDk,
  fontSize: 24,
  lineHeight: 1,
  fontFamily: 'Georgia, serif',
  fontWeight: 900
}
export const managementPlaceholderGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10
}
export const managementPlaceholderCardStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 12,
  display: 'grid',
  gap: 4
}
export const farmConfigGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 10
}
export const farmConfigFieldStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 12,
  display: 'grid',
  gap: 4
}
export const managerGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10
}
export const managerCardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  minHeight: 92,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  textAlign: 'left',
  color: C.textDk
}
export const reportButtonStyle = {
  background: C.bgSoft,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 11,
  display: 'grid',
  gridTemplateColumns: '34px 1fr',
  gap: 9,
  textAlign: 'left',
  alignItems: 'center',
  color: C.textDk
}
export const reportPreviewStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 18,
  minHeight: 460
}
export const reportCoverArtStyle = {
  width: 180,
  height: 120,
  borderRadius: 12,
  background:
    'linear-gradient(135deg, rgba(61,138,34,0.95), rgba(232,168,76,0.72)), repeating-linear-gradient(30deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 18px)'
}
export const mapManagerShellStyle = {
  background: C.bg,
  border: 'none',
  borderRadius: 0,
  padding: '14px 0 0',
  display: 'grid',
  gap: 14,
  alignItems: 'stretch'
}
export const mapSideMenuStyle = {
  width: 170,
  flexShrink: 0,
  borderRight: `1px solid ${C.borderSoft}`,
  paddingRight: 10,
  display: 'grid',
  alignContent: 'start',
  gap: 8
}
export const managerBreadcrumbRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap'
}
export const managerBreadcrumbStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: C.textDk,
  fontSize: 15,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  minWidth: 0
}
export const managerBreadcrumbSepStyle = { color: C.textDim, fontSize: 18, lineHeight: 1 }
export const managerMapActionsStyle = { display: 'flex', alignItems: 'center', gap: 10 }
export const managerMapStageStyle = { position: 'relative', minWidth: 0 }
export const mapOverlayToolsStyle = { position: 'absolute', left: 12, top: 12, zIndex: 6, display: 'grid', gap: 8 }
export const mapToolButtonStyle = {
  width: 64,
  minHeight: 62,
  background: 'rgba(255,255,255,0.94)',
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  padding: '8px 6px',
  color: C.textDk,
  fontSize: 10.5,
  lineHeight: 1.15,
  fontWeight: 700,
  textAlign: 'center',
  cursor: 'pointer',
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'center',
  gap: 5,
  boxShadow: '0 8px 20px rgba(0,0,0,0.14)'
}
export const mapCounterStyle = {
  background: C.greenLight,
  color: C.greenDp,
  border: `1px solid ${C.greenDp}33`,
  borderRadius: 999,
  padding: '5px 9px',
  fontSize: 10,
  fontFamily: 'monospace',
  fontWeight: 900
}
export const mapRefreshButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.textDk,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center'
}
export const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.58)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 14
}
export const geoModalStyle = {
  background: C.bg,
  borderRadius: 18,
  width: '100%',
  maxWidth: 1060,
  maxHeight: '94vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}
export const geoModalHeaderStyle = {
  padding: '16px 18px',
  borderBottom: `1px solid ${C.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center'
}
export const geoModalBodyStyle = { flex: 1, overflowY: 'auto', display: 'flex', gap: 14, padding: 14 }
export const geoModeMenuStyle = { width: 190, flexShrink: 0, display: 'grid', alignContent: 'start', gap: 8 }
export const geoModeButtonStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '11px 12px',
  color: C.textDk,
  textAlign: 'left',
  fontWeight: 900,
  cursor: 'pointer'
}
export const geoModeButtonActiveStyle = {
  ...geoModeButtonStyle,
  background: C.greenDp,
  borderColor: C.greenDp,
  color: C.bg
}
export const geoRuleBoxStyle = {
  background: C.bgSoft,
  border: `1px dashed ${C.border}`,
  borderRadius: 10,
  padding: 11,
  color: C.textMid,
  fontSize: 12,
  lineHeight: 1.45
}
export const emptyGeoStateStyle = {
  minHeight: 360,
  border: `1px dashed ${C.border}`,
  borderRadius: 14,
  display: 'grid',
  placeContent: 'center',
  textAlign: 'center',
  padding: 20
}
export const drawToolsStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }
export const kmlDropStyle = {
  display: 'grid',
  gap: 5,
  placeContent: 'center',
  textAlign: 'center',
  minHeight: 96,
  border: `1.5px dashed ${C.greenDp}`,
  borderRadius: 14,
  background: C.greenLight,
  color: C.textDk,
  cursor: 'pointer',
  marginBottom: 10
}
export const geoFormStyle = {
  display: 'grid',
  gap: 10,
  marginTop: 12,
  borderTop: `1px solid ${C.borderSoft}`,
  paddingTop: 12
}
export const formErrorStyle = {
  background: C.redLight,
  color: C.redDk,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 12,
  border: `1px solid ${C.red}33`
}
export const simpleMapStyle = {
  position: 'relative',
  borderRadius: 14,
  overflow: 'hidden',
  border: `1px solid ${C.border}`,
  background: '#0e1d14',
  minHeight: 240,
  touchAction: 'none',
  overscrollBehavior: 'contain'
}
export const simpleMapFullStyle = {
  position: 'relative',
  borderRadius: 0,
  overflow: 'hidden',
  border: 'none',
  background: '#0e1d14',
  minHeight: '100dvh',
  touchAction: 'none',
  overscrollBehavior: 'none'
}
export const leafletMapCanvasStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }
export const satelliteTileLayerStyle = { position: 'absolute', inset: 0, overflow: 'hidden', background: '#0e1d14' }
export const satelliteTileStyle = {
  position: 'absolute',
  width: TILE_SIZE,
  height: TILE_SIZE,
  objectFit: 'cover',
  userSelect: 'none',
  pointerEvents: 'none',
  willChange: 'transform'
}
export const satelliteShadeStyle = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg, rgba(5,12,8,0.20), rgba(5,12,8,0.34))',
  pointerEvents: 'none'
}
export const rainInterpolationLayerStyle = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1,
  mixBlendMode: 'screen',
  opacity: 0.78
}
export const rainInterpolationSpotStyle = {
  position: 'absolute',
  width: 260,
  height: 260,
  borderRadius: 999,
  transform: 'translate(-50%, -50%)',
  filter: 'blur(8px)'
}
export const satelliteSvgStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }
export const mapDrawHintStyle = {
  position: 'absolute',
  left: 12,
  bottom: 12,
  background: 'rgba(255,255,255,0.94)',
  color: C.textDk,
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 800,
  boxShadow: '0 4px 16px rgba(0,0,0,0.16)'
}
export const mapEmptyHintStyle = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  color: 'rgba(255,255,255,0.86)',
  fontSize: 13,
  fontWeight: 800,
  textAlign: 'center',
  padding: 20
}
export const pluviometerShellStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 12,
  display: 'grid',
  gap: 10
}
export const pluviometerHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start'
}
export const pluviometerMapStageStyle = { position: 'relative', minHeight: 470, borderRadius: 12, overflow: 'hidden' }
export const pluviometerEditorStyle = {
  position: 'absolute',
  right: 14,
  top: 14,
  zIndex: 4,
  width: 'min(360px, calc(100% - 28px))',
  display: 'grid',
  gap: 9,
  background: 'rgba(255,255,255,0.94)',
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 12,
  boxShadow: '0 18px 44px rgba(0,0,0,0.24)',
  backdropFilter: 'blur(12px)'
}
export const pluviometerEditorActionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' }
export const pluviometerCoordGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
export const pluviometerHintStyle = { margin: 0, color: C.textMid, fontSize: 11, lineHeight: 1.35 }
export const pluviometerEditorFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  alignItems: 'center'
}
export const dangerGhostButtonStyle = {
  background: C.bgLight,
  color: C.redDk,
  border: `1px solid ${C.red}55`,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer'
}
export const rainMapFrameStyle = { position: 'relative', minHeight: 460, borderRadius: 12, overflow: 'hidden' }
export const rainEmptyOverlayStyle = {
  position: 'absolute',
  inset: 'auto 16px 16px 16px',
  zIndex: 5,
  background: 'rgba(255,255,255,0.94)',
  color: C.textDk,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 800,
  boxShadow: '0 12px 28px rgba(0,0,0,0.18)'
}
