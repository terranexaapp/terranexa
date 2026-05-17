import { theme } from '../../styles/theme'

const C = theme.normal

export const FASE_LABELS = {
  preparo: 'Preparo',
  plantio: 'Plantio',
  brotacao: 'Brotacao',
  vegetativo: 'Vegetativo',
  floracao: 'Floracao',
  frutificacao: 'Frutificacao',
  maturacao: 'Maturacao',
  colheita: 'Colheita',
  pos_colheita: 'Pos-colheita',
  pousio: 'Pousio'
}

export const NAV_ITEMS = [
  { id: 'mapa', label: 'Mapa' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'chuvas', label: 'Chuvas' },
  { id: 'solo', label: 'Solo' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'gerencial', label: 'Gerenciamento' },
  { id: 'relatorios', label: 'Relatórios' }
]

export const DESKTOP_NAV_GROUPS = [
  {
    title: 'Campo',
    items: [
      { key: 'dashboard', view: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'talhoes', view: 'gerencial', manager: 'talhoes', label: 'Talhoes', icon: 'map' },
      { key: 'chuvas', view: 'chuvas', label: 'Chuvas', icon: 'cloud-rain' },
      { key: 'solo', view: 'solo', label: 'Solo', icon: 'soil' },
      { key: 'scouting', view: 'scouting', label: 'Scouting', icon: 'search' }
    ]
  },
  {
    title: 'Operacao',
    items: [
      { key: 'pluviometros', view: 'gerencial', manager: 'pluviometros', label: 'Pluviometros', icon: 'cloud-rain' },
      { key: 'estoque', view: 'gerencial', manager: 'estoque', label: 'Estoque', icon: 'cube' },
      { key: 'equipe', view: 'gerencial', manager: 'equipe', label: 'Equipe', icon: 'users' },
      { key: 'insumos', view: 'gerencial', manager: 'insumos', label: 'Insumos', icon: 'beaker' },
      { key: 'maquinas', view: 'gerencial', manager: 'maquinas', label: 'Maquinas', icon: 'tractor' }
    ]
  },
  {
    title: 'Gestao',
    items: [
      { key: 'safras', view: 'gerencial', manager: 'safras', label: 'Safras', icon: 'leaf' },
      { key: 'produtividade', view: 'gerencial', manager: 'produtividade', label: 'Produtividade', icon: 'bar-chart' },
      { key: 'configuracao', view: 'gerencial', manager: 'configuracao', label: 'Configuracoes', icon: 'gear' },
      { key: 'relatorios', view: 'relatorios', label: 'Relatorios', icon: 'report' }
    ]
  }
]

export const reportTypes = [
  'Relatório agronômico completo',
  'Relatório financeiro por talhão e safra',
  'Relatório de chuva interpolada',
  'Relatório de fertilidade do solo',
  'Relatório de scouting e dano econômico',
  'Relatório de ordens de serviço',
  'Relatório de estoque e consumo de insumos',
  'Relatório executivo da fazenda'
]

export const MAP_DEFAULT_BOUNDS = {
  minLng: -40.545,
  maxLng: -40.465,
  minLat: -9.43,
  maxLat: -9.35
}
export const TILE_SIZE = 256
export const TILE_MIN_ZOOM = 4
export const TILE_MAX_ZOOM = 19
export const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile'
export const LEAFLET_SCRIPT_URL = '/vendor/leaflet/leaflet.js'
export const LEAFLET_STYLESHEET_URL = '/vendor/leaflet/leaflet.css'
export const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim()
if (import.meta.env.PROD && !MAPBOX_TOKEN) {
  // Sem token o app continua funcionando (cai pro tile satélite do ESRI),
  // mas o usuário perde a camada Mapbox de melhor qualidade.
  console.warn('[TerraNexa] VITE_MAPBOX_TOKEN nao configurado; usando ESRI como fallback')
}
export const MAPBOX_SATELLITE_TILE_URL = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`
export const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
export const ESRI_ATTRIBUTION = 'Tiles &copy; Esri'

export const MONITORING_STORAGE_KEY = 'terranexa:monitoramento-offline'

export const MONITORAMENTO_LEGEND = [
  {
    key: 'recent',
    title: 'Recente',
    range: '<= 5 dias',
    color: C.greenDp,
    fill: 'rgba(61,138,34,0.50)',
    stroke: 'rgba(185,235,160,0.86)'
  },
  {
    key: 'attention',
    title: 'Atencao',
    range: '6 a 10 dias',
    color: C.amberDk,
    fill: 'rgba(232,168,76,0.54)',
    stroke: 'rgba(255,225,150,0.90)'
  },
  {
    key: 'late',
    title: 'Atrasado',
    range: '> 10 dias',
    color: C.redDk,
    fill: 'rgba(232,90,58,0.56)',
    stroke: 'rgba(255,180,160,0.88)'
  },
  {
    key: 'never',
    title: 'Nunca',
    range: 'Sem visita',
    color: '#8A9070',
    fill: 'rgba(138,144,112,0.52)',
    stroke: 'rgba(230,230,215,0.74)'
  }
]
