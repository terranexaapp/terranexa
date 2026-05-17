// Monitoring occurrence view: mapa full-bleed + bottom-sheet + GPS robusto
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  criarMonitoramento,
  criarMonitoramentoPonto,
  salvarCaminhamento,
  ESCALAS_SEVERIDADE
} from '../../lib/monitoramentos'
import { listarPragasDoencas } from '../../lib/pragasDoencas'
import { uploadFotoMonitoramento, getPublicUrl } from '../../lib/storage'
import { SimpleFarmMap } from './maps'
import { normalizeFeature } from './utils'
import { requestOfflineStorage, saveMonitoringPointOffline } from './offline'

const C = theme.normal

// Categorias: chips compactos (sem cards gigantes)
const CATEGORIAS = [
  { id: 'praga',    label: 'Praga',     tipoDB: 'praga',    icone: '🐛', cor: C.red },
  { id: 'doenca',   label: 'Doença',    tipoDB: 'doenca',   icone: '🍂', cor: C.redDk },
  { id: 'daninha',  label: 'Daninha',   tipoDB: 'daninha',  icone: '🌿', cor: C.green },
  { id: 'estadio',  label: 'Estádio',   tipoDB: null,       icone: '🌱', cor: C.blue },
  { id: 'outras',   label: 'Outras',    tipoDB: null,       icone: '📌', cor: C.soil },
  { id: 'plantio',  label: 'Plantio',   tipoDB: null,       icone: '🌾', cor: C.greenDk },
  { id: 'colheita', label: 'Colheita',  tipoDB: null,       icone: '🌽', cor: C.amber }
]

const ICONE_TIPO = {
  praga: '🐛',
  doenca: '🍂',
  daninha: '🌿',
  deficiencia: '🍃',
  outro: '📌'
}

const ESTADIOS = [
  'VE – Emergência', 'VC – Cotilédone', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
  'R1 – Floração', 'R2 – Floração plena', 'R3 – Vagem', 'R4 – Vagem plena',
  'R5 – Granação', 'R5.1', 'R5.2', 'R5.3', 'R5.4', 'R5.5',
  'R6 – Grão cheio', 'R7 – Início maturação', 'R8 – Maturação plena'
]

function detectFormType(praga, categoria) {
  if (praga) {
    const nome = (praga.nome_comum || '').toLowerCase()
    if (nome.includes('lagarta')) return 'lagarta'
    if (nome.includes('percevejo')) return 'percevejo'
    if (praga.tipo === 'daninha') return 'daninha'
    return 'generica'
  }
  const cat = categoria?.id
  if (cat === 'estadio' || cat === 'plantio' || cat === 'colheita' || cat === 'outras') return cat
  if (cat === 'daninha') return 'daninha'
  return 'generica'
}

function calcularCV(valores) {
  const nums = valores.map(Number).filter(n => !isNaN(n) && n >= 0)
  if (nums.length < 2) return null
  const media = nums.reduce((a, b) => a + b, 0) / nums.length
  if (media === 0) return 0
  const variancia = nums.reduce((acc, v) => acc + (v - media) ** 2, 0) / nums.length
  return ((Math.sqrt(variancia) / media) * 100).toFixed(1)
}

function calcularSacosHa(gramas, metros) {
  const g = Number(gramas)
  const m = Number(metros)
  if (!g || !m) return null
  return (g / (m * 6)).toFixed(2)
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function resumoDraft(d) {
  if (d.categoria.id === 'plantio') {
    const cv = calcularCV(d.form.distancias || [])
    return cv != null ? `CV ${cv}%` : `${(d.form.distancias || []).length} medições`
  }
  if (d.categoria.id === 'colheita') {
    const s = calcularSacosHa(d.form.gramas, d.form.metros_quadrados)
    return s ? `${s} sc/ha` : 'colheita'
  }
  if (d.categoria.id === 'estadio') return d.form.estadio || 'estádio'
  if (d.formType === 'lagarta') {
    const total = (Number(d.form.pequenas_m) || 0) + (Number(d.form.medias_m) || 0) + (Number(d.form.grandes_m) || 0)
    return `${total}/m · ${d.form.dano || ''}`
  }
  if (d.formType === 'percevejo') return `${Number(d.form.adultos_m) || 0}A + ${Number(d.form.ninfas_m) || 0}N por m`
  if (d.formType === 'daninha') return `${d.form.desenvolvimento || ''} · ${d.form.pressao || ''}`.trim()
  if (d.form.severidade) return d.form.severidade
  return d.categoria.label
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const glass = {
  background: 'rgba(255,255,255,0.94)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: `1px solid rgba(255,255,255,0.6)`,
  boxShadow: '0 4px 18px rgba(0,0,0,0.18)'
}

const s = {
  // Container outer: full viewport
  outer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#0e1d14'
  },

  // Mapa absoluto cobrindo todo o fundo
  mapWrap: { position: 'absolute', inset: 0, zIndex: 0 },

  // Header flutuante
  header: {
    ...glass,
    position: 'absolute', top: 12, left: 12, right: 12, zIndex: 30,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 14
  },
  btnIcon: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: C.textDk, fontSize: 22, padding: '4px 10px', lineHeight: 1, borderRadius: 8
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 14, fontWeight: 800, color: C.textDk, margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  headerSub: { fontSize: 11, color: C.textMid, margin: 0 },
  btnFinalizar: { background: C.greenDk, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' },

  // GPS pill abaixo do header
  gpsPill: (cor) => ({
    ...glass,
    position: 'absolute', top: 70, left: 12, zIndex: 30,
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', borderRadius: 999,
    fontSize: 12, fontWeight: 600, color: C.textDk,
    borderLeft: `4px solid ${cor}`,
    maxWidth: 'calc(100% - 24px)'
  }),
  gpsDot: (cor, pulse) => ({
    width: 9, height: 9, borderRadius: '50%', background: cor, flexShrink: 0,
    animation: pulse ? 'tnxa-pulse 1.6s ease-out infinite' : 'none'
  }),
  gpsBadge: {
    background: C.greenDk, color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800,
    padding: '2px 8px', marginLeft: 4
  },
  gpsRetry: {
    background: C.amber, color: '#fff', border: 'none', borderRadius: 8,
    padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 6
  },

  // Bottom sheet
  sheet: (height) => ({
    position: 'absolute',
    left: 0, right: 0, bottom: 0, zIndex: 20,
    background: C.bg,
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -8px 28px rgba(0,0,0,0.25)',
    height,
    transition: 'height 220ms ease',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden'
  }),
  sheetHandle: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: '8px 0 4px', cursor: 'grab', flexShrink: 0
  },
  sheetHandleBar: { width: 44, height: 4, borderRadius: 4, background: C.border },
  sheetBody: { flex: 1, overflowY: 'auto', padding: '6px 14px 0' },
  sheetFooter: {
    padding: '10px 14px 14px',
    background: C.bg,
    borderTop: `1px solid ${C.border}`,
    display: 'flex', gap: 8, flexShrink: 0
  },

  sectionTitle: {
    fontSize: 10, fontWeight: 700, color: C.textDim,
    textTransform: 'uppercase', letterSpacing: 0.5, margin: '8px 2px 6px'
  },

  // Drafts
  draftCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '8px 10px', marginBottom: 6
  },
  draftDot: cor => ({ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0 }),
  draftTexts: { flex: 1, minWidth: 0 },
  draftTitulo: { fontSize: 13, fontWeight: 700, color: C.textDk, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  draftResumo: { fontSize: 11, color: C.textMid, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  draftRemove: { background: 'none', border: 'none', color: C.red, fontSize: 18, cursor: 'pointer', padding: '2px 6px', lineHeight: 1 },

  // Categoria chips
  chipsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
    gap: 8,
    marginBottom: 8
  },
  chip: (cor) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12,
    padding: '12px 6px', cursor: 'pointer', minHeight: 76,
    transition: 'transform 120ms, border-color 120ms',
    borderLeft: `4px solid ${cor}`
  }),
  chipIcon: { fontSize: 24, lineHeight: 1 },
  chipLabel: { fontSize: 12, fontWeight: 600, color: C.textDk, textAlign: 'center' },

  // Pest list (compact rows)
  pestRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '10px 12px', marginBottom: 6, cursor: 'pointer'
  },
  pestThumb: (cor) => ({
    width: 36, height: 36, borderRadius: 8, background: cor + '22',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0
  }),
  pestThumbImg: { width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  pestName: { flex: 1, minWidth: 0 },
  pestNomeComum: { fontSize: 13, fontWeight: 700, color: C.textDk, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pestNomeSci: { fontSize: 11, fontStyle: 'italic', color: C.textDim, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pestChevron: { color: C.textDim, fontSize: 18, flexShrink: 0 },

  // Forms
  formSection: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.textDk },
  textarea: { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.textDk, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' },
  segmented: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  segBtn: (active, cor) => ({ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${cor}`, background: active ? cor : 'transparent', color: active ? '#fff' : cor }),
  resultBox: { background: C.greenLight, borderRadius: 10, padding: '10px 14px', border: `1.5px solid ${C.green}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: 12, color: C.textMid, fontWeight: 600 },
  resultValue: { fontSize: 18, fontWeight: 700, color: C.greenDk },

  btnPrimary: { flex: 1, padding: '13px', borderRadius: 12, background: C.green, border: 'none', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
  btnPrimaryDisabled: { flex: 1, padding: '13px', borderRadius: 12, background: C.border, border: 'none', color: C.textVery, fontWeight: 800, fontSize: 15, cursor: 'not-allowed' },
  btnSecondary: { padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1.5px solid ${C.border}`, color: C.textMid, fontWeight: 600, fontSize: 13, cursor: 'pointer' },

  btnCamera: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: C.bgSoft, border: `1.5px solid ${C.border}`, color: C.textDk, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  fotoPreview: { width: '100%', maxHeight: 180, borderRadius: 10, objectFit: 'cover', border: `1px solid ${C.border}`, marginTop: 6 },

  distanciaScroll: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 },
  distanciaItem: { display: 'flex', alignItems: 'center', gap: 4, background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 },
  distanciaText: { fontSize: 13, color: C.greenDk, fontWeight: 600 },
  distanciaRemove: { background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 },
  btnAdd: { background: C.green, border: 'none', borderRadius: 20, color: '#fff', fontSize: 18, width: 32, height: 32, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addRow: { display: 'flex', gap: 8, alignItems: 'center' },
  addInput: { flex: 1, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' },

  pragaInfo: {
    background: C.greenLight, borderRadius: 10, padding: '8px 12px',
    border: `1px solid ${C.green}`, marginBottom: 12
  },
  empty: { textAlign: 'center', color: C.textDim, fontSize: 13, padding: '20px 0' }
}

// CSS keyframes só pra pulsar o GPS dot
const KEYFRAMES = `@keyframes tnxa-pulse{0%{box-shadow:0 0 0 0 currentColor}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}`

// GPS labels por estado
const GPS_UI = {
  idle:        { texto: 'Iniciando GPS...',        cor: C.textDim, pulse: false, retry: false },
  requesting: { texto: 'Solicitando localização...', cor: C.amber,  pulse: true,  retry: false },
  active:      { texto: 'GPS ativo',                cor: C.green,   pulse: true,  retry: false },
  waiting:     { texto: 'Aguardando sinal...',      cor: C.amber,   pulse: true,  retry: true  },
  denied:      { texto: 'Permissão negada',         cor: C.red,     pulse: false, retry: true  },
  timeout:     { texto: 'GPS não respondeu',        cor: C.amber,   pulse: false, retry: true  },
  unavailable: { texto: 'Sem GPS neste device',     cor: C.textDim, pulse: false, retry: false },
  error:       { texto: 'Erro no GPS',              cor: C.red,     pulse: false, retry: true  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function MonitoramentoOcorrenciaView({ fazenda, fazendaId, talhao, onBack }) {
  const [tela, setTela] = useState('categorias') // 'categorias' | 'lista' | 'formulario'
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [pragaSel, setPragaSel] = useState(null)

  // Sheet height — controlado pelo estado da tela
  // categorias = half, lista/formulario = full
  const sheetHeight = useMemo(() => {
    if (tela === 'categorias') return '52vh'
    return '88vh'
  }, [tela])

  // Catálogo
  const [catalogo, setCatalogo] = useState([])

  // GPS state machine
  const [gpsState, setGpsState] = useState('idle')
  const [position, setPosition] = useState(null)
  const watchRef = useRef(null)
  const trilhaRef = useRef([])
  const iniciadoEmRef = useRef(new Date().toISOString())
  const watchdogTimerRef = useRef(null)

  // Supabase monitoramento (lazy)
  const monitoramentoIdRef = useRef(null)
  const monitoramentoCreateRef = useRef(null)

  // Drafts
  const [drafts, setDrafts] = useState([])
  const [pontosRegistrados, setPontosRegistrados] = useState(0)

  // Form
  const [form, setForm] = useState({})
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [distanciaInput, setDistanciaInput] = useState('')

  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState(null)
  const cameraRef = useRef(null)

  // ── Talhão feature pra mapa ─────────────────────────────────────────────────
  const mapFeatures = useMemo(() => {
    if (!talhao?.geometria) return []
    const feat = normalizeFeature(talhao.geometria, talhao.codigo || 'T')
    return feat ? [feat] : []
  }, [talhao])

  const devicePosition = useMemo(() => {
    if (!position) return null
    return { latitude: position.lat, longitude: position.lng, accuracy: position.precisao }
  }, [position])

  // ── GPS ──────────────────────────────────────────────────────────────────────
  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current)
      watchdogTimerRef.current = null
    }
  }, [])

  const onPosition = useCallback(pos => {
    const p = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      precisao: pos.coords.accuracy
    }
    setPosition(p)
    trilhaRef.current.push({ ...p, ts: new Date().toISOString() })
    setGpsState('active')
    clearWatchdog()
  }, [clearWatchdog])

  const startGPS = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsState('unavailable')
      return
    }
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    clearWatchdog()
    setGpsState('requesting')

    // 1) Fast fix
    navigator.geolocation.getCurrentPosition(
      onPosition,
      err => {
        if (err.code === 1) setGpsState('denied')
        else if (err.code === 3) setGpsState('timeout')
        else setGpsState('error')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )

    // 2) Continuous watch
    watchRef.current = navigator.geolocation.watchPosition(
      onPosition,
      err => {
        if (err.code === 1) setGpsState('denied')
        else setGpsState(prev => (prev === 'active' ? 'waiting' : prev))
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 3000 }
    )

    // 3) Watchdog: se em 15s nada veio, sinaliza waiting (sem matar o watch)
    watchdogTimerRef.current = setTimeout(() => {
      setGpsState(prev => (prev === 'active' ? prev : 'waiting'))
    }, 15000)
  }, [onPosition, clearWatchdog])

  useEffect(() => {
    requestOfflineStorage().catch(() => {})
    startGPS()
    return () => {
      if (watchRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current)
      }
      clearWatchdog()
    }
  }, [startGPS, clearWatchdog])

  // ── Catálogo de pragas/doenças ─────────────────────────────────────────────
  useEffect(() => {
    if (!fazendaId) return
    listarPragasDoencas(fazendaId)
      .then(setCatalogo)
      .catch(() => setCatalogo([]))
  }, [fazendaId])

  // ── Sair: salva caminhamento ────────────────────────────────────────────────
  const finalizarESair = useCallback(async () => {
    try {
      if (monitoramentoIdRef.current && trilhaRef.current.length > 0) {
        await salvarCaminhamento(monitoramentoIdRef.current, trilhaRef.current, iniciadoEmRef.current)
      }
    } catch { /* ignora */ }
    onBack()
  }, [onBack])

  async function ensureMonitoramento() {
    if (monitoramentoIdRef.current) return monitoramentoIdRef.current
    if (!monitoramentoCreateRef.current) {
      monitoramentoCreateRef.current = criarMonitoramento({
        talhao_id: talhao?.id,
        observacoes: 'Monitoramento por app TerraNexa',
        status: 'realizado'
      })
        .then(r => { monitoramentoIdRef.current = r.id; return r.id })
        .finally(() => { monitoramentoCreateRef.current = null })
    }
    return monitoramentoCreateRef.current
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  function iniciarFormulario(categoria, praga = null) {
    setCategoriaSel(categoria)
    setPragaSel(praga)
    setForm({})
    setFotoPreview(null)
    setFotoFile(null)
    setDistanciaInput('')
    setErro(null)
    setTela('formulario')
  }

  function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  function adicionarOcorrencia() {
    const formType = detectFormType(pragaSel, categoriaSel)
    const draft = {
      id: uuid(),
      categoria: categoriaSel,
      praga: pragaSel,
      formType,
      form: { ...form },
      fotoFile,
      fotoPreview
    }
    setDrafts(d => [...d, draft])
    setTela('categorias')
  }

  function removerDraft(id) {
    setDrafts(d => d.filter(x => x.id !== id))
  }

  // ── Registrar ponto ─────────────────────────────────────────────────────────
  async function registrarPonto() {
    if (drafts.length === 0) return
    setRegistrando(true)
    setErro(null)

    try {
      // Captura GPS atual ou usa último conhecido
      const gps = await new Promise(resolve => {
        if (!navigator?.geolocation) return resolve(position)
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precisao: pos.coords.accuracy }),
          () => resolve(position),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
        )
      })
      if (!gps) {
        setErro('Sem GPS — tente novamente quando o sinal estabilizar.')
        setRegistrando(false)
        return
      }

      const monitoramentoId = await ensureMonitoramento()
      const grupoId = uuid()

      for (const d of drafts) {
        let foto_url = null
        if (d.fotoFile && fazendaId) {
          try {
            const uploaded = await uploadFotoMonitoramento({ fazendaId, file: d.fotoFile })
            foto_url = getPublicUrl(uploaded)
          } catch { /* segue sem foto */ }
        }

        const dados_especificos = { ...d.form }
        if (foto_url) dados_especificos.foto_url = foto_url

        await criarMonitoramentoPonto({
          monitoramento_id: monitoramentoId,
          tipo: 'ocorrencia',
          tipo_registro: d.categoria.id,
          latitude: gps.lat,
          longitude: gps.lng,
          precisao_m: gps.precisao,
          praga_doenca_id: d.praga?.id || null,
          severidade: d.form.severidade || d.form.dano || null,
          recomendacao: d.form.acao_sugerida || d.form.recomendacao || null,
          observacoes: d.form.observacoes || null,
          foto_url,
          dados_especificos,
          ponto_grupo_id: grupoId
        })
      }

      saveMonitoringPointOffline(
        { tipo: 'ponto', lat: gps.lat, lng: gps.lng, hora: new Date().toLocaleString('pt-BR'), ocorrencias: drafts.length },
        { fazendaId, fazendaNome: fazenda?.nome || '', talhaoId: talhao?.id || null, talhaoCodigo: talhao?.codigo || '' }
      )

      setDrafts([])
      setPontosRegistrados(n => n + 1)
    } catch (err) {
      setErro(err.message || 'Erro ao registrar ponto')
    } finally {
      setRegistrando(false)
    }
  }

  function catalogoPorTipo(tipoDB) {
    if (!tipoDB) return []
    return catalogo.filter(p => p.tipo === tipoDB)
  }

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // ─── Sheet content: categorias + drafts ────────────────────────────────────
  function renderCategorias() {
    return (
      <>
        {drafts.length > 0 ? (
          <>
            <p style={s.sectionTitle}>Ocorrências deste ponto ({drafts.length})</p>
            {drafts.map(d => (
              <div key={d.id} style={s.draftCard}>
                <div style={s.draftDot(d.categoria.cor)} />
                <div style={s.draftTexts}>
                  <p style={s.draftTitulo}>{d.praga?.nome_comum || d.categoria.label}</p>
                  <p style={s.draftResumo}>{resumoDraft(d)}</p>
                </div>
                <button style={s.draftRemove} onClick={() => removerDraft(d.id)} aria-label="Remover">✕</button>
              </div>
            ))}
            <p style={s.sectionTitle}>Adicionar outra</p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: C.textMid, margin: '8px 2px 12px' }}>
            Selecione uma categoria para registrar a primeira ocorrência.
          </p>
        )}
        <div style={s.chipsRow}>
          {CATEGORIAS.map(cat => (
            <button
              key={cat.id}
              style={s.chip(cat.cor)}
              onClick={() => {
                if (cat.tipoDB) { setCategoriaSel(cat); setTela('lista') }
                else iniciarFormulario(cat, null)
              }}
            >
              <span style={s.chipIcon}>{cat.icone}</span>
              <span style={s.chipLabel}>{cat.label}</span>
            </button>
          ))}
        </div>
      </>
    )
  }

  // ─── Sheet content: lista de pragas ────────────────────────────────────────
  function renderListaPragas() {
    const lista = catalogoPorTipo(categoriaSel?.tipoDB)
    return (
      <>
        <p style={s.sectionTitle}>{categoriaSel?.label} · escolha uma</p>
        {lista.length === 0 && (
          <p style={s.empty}>Nenhuma {categoriaSel?.label?.toLowerCase()} cadastrada.</p>
        )}
        {lista.map(praga => {
          const icone = ICONE_TIPO[praga.tipo] || categoriaSel?.icone || '🔍'
          return (
            <div key={praga.id} style={s.pestRow} onClick={() => iniciarFormulario(categoriaSel, praga)}>
              {praga.foto_url ? (
                <img src={praga.foto_url} alt={praga.nome_comum} style={s.pestThumbImg} loading="lazy" onError={e => { e.target.style.display = 'none' }} />
              ) : (
                <div style={s.pestThumb(categoriaSel?.cor || C.textMid)}>{icone}</div>
              )}
              <div style={s.pestName}>
                <p style={s.pestNomeComum}>{praga.nome_comum}</p>
                {praga.nome_cientifico && <p style={s.pestNomeSci}>{praga.nome_cientifico}</p>}
              </div>
              <span style={s.pestChevron}>›</span>
            </div>
          )
        })}
        <div style={{ ...s.pestRow, borderStyle: 'dashed' }} onClick={() => iniciarFormulario(categoriaSel, null)}>
          <div style={s.pestThumb(C.textDim)}>➕</div>
          <div style={s.pestName}>
            <p style={s.pestNomeComum}>Outra / não identificada</p>
            <p style={s.pestNomeSci}>Registrar sem especificar</p>
          </div>
          <span style={s.pestChevron}>›</span>
        </div>
      </>
    )
  }

  // ─── Forms específicos (mantidos) ──────────────────────────────────────────
  function renderFormLagarta() {
    return (
      <>
        <div style={s.formSection}>
          <label style={s.label}>Lagartas pequenas / metro</label>
          <input style={s.input} type="number" min="0" value={form.pequenas_m || ''} onChange={e => setField('pequenas_m', e.target.value)} placeholder="0" />
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Lagartas médias / metro</label>
          <input style={s.input} type="number" min="0" value={form.medias_m || ''} onChange={e => setField('medias_m', e.target.value)} placeholder="0" />
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Lagartas grandes / metro</label>
          <input style={s.input} type="number" min="0" value={form.grandes_m || ''} onChange={e => setField('grandes_m', e.target.value)} placeholder="0" />
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Dano</label>
          <div style={s.segmented}>
            {['leve','moderada','severa'].map(d => (
              <button key={d} style={s.segBtn(form.dano === d, d === 'leve' ? C.green : d === 'moderada' ? C.amber : C.red)} onClick={() => setField('dano', d)}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Ação sugerida</label>
          <input style={s.input} value={form.acao_sugerida || ''} onChange={e => setField('acao_sugerida', e.target.value)} placeholder="Ex: aplicar inseticida X" />
        </div>
      </>
    )
  }

  function renderFormPercevejo() {
    return (
      <>
        <div style={s.formSection}>
          <label style={s.label}>Adultos / metro</label>
          <input style={s.input} type="number" min="0" value={form.adultos_m || ''} onChange={e => setField('adultos_m', e.target.value)} placeholder="0" />
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Ninfas / metro</label>
          <input style={s.input} type="number" min="0" value={form.ninfas_m || ''} onChange={e => setField('ninfas_m', e.target.value)} placeholder="0" />
        </div>
      </>
    )
  }

  function renderFormDaninha() {
    return (
      <>
        <div style={s.formSection}>
          <label style={s.label}>Desenvolvimento</label>
          <div style={s.segmented}>
            {['Inicial','Vegetativo','Reprodutivo'].map(d => (
              <button key={d} style={s.segBtn(form.desenvolvimento === d, C.green)} onClick={() => setField('desenvolvimento', d)}>{d}</button>
            ))}
          </div>
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Pressão de infestação</label>
          <div style={s.segmented}>
            {['Alta','Média','Baixa'].map(p => (
              <button key={p} style={s.segBtn(form.pressao === p, p === 'Alta' ? C.red : p === 'Média' ? C.amber : C.green)} onClick={() => setField('pressao', p)}>{p}</button>
            ))}
          </div>
        </div>
      </>
    )
  }

  function renderFormGenerica() {
    return (
      <div style={s.formSection}>
        <label style={s.label}>Severidade</label>
        <div style={s.segmented}>
          {ESCALAS_SEVERIDADE.map(e => (
            <button key={e.id} style={s.segBtn(form.severidade === e.id, e.cor)} onClick={() => setField('severidade', e.id)}>{e.label}</button>
          ))}
        </div>
      </div>
    )
  }

  function renderFormEstadio() {
    return (
      <div style={s.formSection}>
        <label style={s.label}>Estádio fenológico</label>
        <select style={s.input} value={form.estadio || ''} onChange={e => setField('estadio', e.target.value)}>
          <option value="">Selecione...</option>
          {ESTADIOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
    )
  }

  function renderFormPlantio() {
    const distancias = form.distancias || []
    const cv = calcularCV(distancias)

    function addDistancia() {
      const v = parseFloat(distanciaInput)
      if (isNaN(v)) return
      setForm(f => ({ ...f, distancias: [...(f.distancias || []), v] }))
      setDistanciaInput('')
    }
    function removeDistancia(idx) {
      setForm(f => { const arr = [...(f.distancias || [])]; arr.splice(idx, 1); return { ...f, distancias: arr } })
    }

    return (
      <>
        <div style={s.formSection}>
          <label style={s.label}>Metros avaliados</label>
          <input style={s.input} type="number" min="0" value={form.metros_avaliados || ''} onChange={e => setField('metros_avaliados', e.target.value)} placeholder="Ex: 10" />
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Espaçamentos entre sementes (cm)</label>
          <div style={{ ...s.distanciaScroll, marginBottom: 8 }}>
            {distancias.map((d, i) => (
              <div key={i} style={s.distanciaItem}>
                <span style={s.distanciaText}>{d}</span>
                <button style={s.distanciaRemove} onClick={() => removeDistancia(i)}>✕</button>
              </div>
            ))}
          </div>
          <div style={s.addRow}>
            <input style={s.addInput} type="number" min="0" value={distanciaInput} onChange={e => setDistanciaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDistancia()} placeholder="cm" />
            <button style={s.btnAdd} onClick={addDistancia}>+</button>
          </div>
        </div>
        {distancias.length >= 2 && (
          <div style={{ ...s.resultBox, marginBottom: 12 }}>
            <span style={s.resultLabel}>CV (coef. variação)</span>
            <span style={{ ...s.resultValue, color: cv > 25 ? C.red : cv > 15 ? C.amber : C.greenDk }}>{cv}%</span>
          </div>
        )}
      </>
    )
  }

  function renderFormColheita() {
    const sacosHa = calcularSacosHa(form.gramas, form.metros_quadrados)
    return (
      <>
        <div style={s.formSection}>
          <label style={s.label}>Metros quadrados avaliados</label>
          <input style={s.input} type="number" min="0" value={form.metros_quadrados || ''} onChange={e => setField('metros_quadrados', e.target.value)} placeholder="Ex: 2" />
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Grãos coletados (gramas)</label>
          <input style={s.input} type="number" min="0" value={form.gramas || ''} onChange={e => setField('gramas', e.target.value)} placeholder="Ex: 150" />
        </div>
        {sacosHa && (
          <div style={{ ...s.resultBox, marginBottom: 12 }}>
            <span style={s.resultLabel}>Sacos perdidos / ha</span>
            <span style={s.resultValue}>{sacosHa}</span>
          </div>
        )}
      </>
    )
  }

  function renderFormulario() {
    const catId = categoriaSel?.id
    const formType = detectFormType(pragaSel, categoriaSel)
    const mostrarObservacoes = catId !== 'plantio' && catId !== 'colheita'
    const mostrarCamera = catId !== 'plantio' && catId !== 'colheita'

    return (
      <>
        {pragaSel && (
          <div style={s.pragaInfo}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.greenDk }}>{pragaSel.nome_comum}</p>
            {pragaSel.nome_cientifico && (<p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMid, fontStyle: 'italic' }}>{pragaSel.nome_cientifico}</p>)}
            {pragaSel.nivel_dano_economico && (<p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMid }}>NDE: {pragaSel.nivel_dano_economico}</p>)}
          </div>
        )}

        {formType === 'lagarta'   && renderFormLagarta()}
        {formType === 'percevejo' && renderFormPercevejo()}
        {formType === 'daninha'   && renderFormDaninha()}
        {catId === 'estadio'      && renderFormEstadio()}
        {catId === 'plantio'      && renderFormPlantio()}
        {catId === 'colheita'     && renderFormColheita()}
        {formType === 'generica' && catId !== 'outras' && catId !== 'estadio' && catId !== 'plantio' && catId !== 'colheita' && renderFormGenerica()}

        {mostrarObservacoes && (
          <div style={s.formSection}>
            <label style={s.label}>Observações</label>
            <textarea style={s.textarea} value={form.observacoes || ''} onChange={e => setField('observacoes', e.target.value)} placeholder="Descreva o que observou..." />
          </div>
        )}

        {mostrarCamera && (
          <div style={{ marginBottom: 12 }}>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{ display: 'none' }} />
            <button style={s.btnCamera} onClick={() => cameraRef.current?.click()}>
              <span>📷</span><span>{fotoPreview ? 'Trocar foto' : 'Tirar foto'}</span>
            </button>
            {fotoPreview && (<img src={fotoPreview} alt="preview" style={s.fotoPreview} />)}
          </div>
        )}
      </>
    )
  }

  // ── Sheet footer ────────────────────────────────────────────────────────────
  function renderSheetFooter() {
    if (tela === 'formulario') {
      return (
        <div style={s.sheetFooter}>
          <button style={s.btnSecondary} onClick={() => setTela(categoriaSel?.tipoDB ? 'lista' : 'categorias')}>
            Cancelar
          </button>
          <button style={s.btnPrimary} onClick={adicionarOcorrencia}>
            Adicionar ocorrência
          </button>
        </div>
      )
    }
    if (tela === 'lista') {
      return (
        <div style={s.sheetFooter}>
          <button style={s.btnSecondary} onClick={() => setTela('categorias')}>← Voltar</button>
          <button style={s.btnPrimary} onClick={() => iniciarFormulario(categoriaSel, null)}>
            Sem especificar
          </button>
        </div>
      )
    }
    // tela === 'categorias'
    const podeRegistrar = drafts.length > 0 && !registrando
    return (
      <div style={s.sheetFooter}>
        {erro && <p style={{ color: C.red, fontSize: 11, margin: 0, flex: 1, alignSelf: 'center' }}>{erro}</p>}
        <button
          style={podeRegistrar ? s.btnPrimary : s.btnPrimaryDisabled}
          disabled={!podeRegistrar}
          onClick={registrarPonto}
        >
          {registrando ? 'Registrando...' : drafts.length > 0 ? `Registrar ponto (${drafts.length})` : 'Adicione ocorrências'}
        </button>
      </div>
    )
  }

  // ── GPS pill ────────────────────────────────────────────────────────────────
  const gpsUi = GPS_UI[gpsState] || GPS_UI.idle

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.outer}>
      <style>{KEYFRAMES}</style>

      {/* Map background */}
      <div style={s.mapWrap}>
        <SimpleFarmMap
          features={mapFeatures}
          selectedCode={talhao?.codigo}
          fullBleed
          height="100%"
          devicePosition={devicePosition}
        />
      </div>

      {/* Header flutuante */}
      <div style={s.header}>
        {tela !== 'categorias' ? (
          <button
            style={s.btnIcon}
            onClick={() => setTela(tela === 'formulario' ? (categoriaSel?.tipoDB ? 'lista' : 'categorias') : 'categorias')}
            aria-label="Voltar"
          >←</button>
        ) : (
          <button style={s.btnIcon} onClick={finalizarESair} aria-label="Sair">✕</button>
        )}
        <div style={s.headerTitleWrap}>
          <p style={s.headerTitle}>
            {tela === 'categorias' ? 'Monitoramento'
              : tela === 'lista' ? categoriaSel?.label
              : pragaSel?.nome_comum || categoriaSel?.label}
          </p>
          {talhao?.codigo && <p style={s.headerSub}>Talhão {talhao.codigo}</p>}
        </div>
        {tela === 'categorias' && (
          <button style={s.btnFinalizar} onClick={finalizarESair}>Finalizar</button>
        )}
      </div>

      {/* GPS pill */}
      <div style={s.gpsPill(gpsUi.cor)}>
        <span style={s.gpsDot(gpsUi.cor, gpsUi.pulse)} />
        <span>
          {gpsUi.texto}
          {gpsState === 'active' && position?.precisao != null && ` · ±${Math.round(position.precisao)}m`}
        </span>
        {pontosRegistrados > 0 && (
          <span style={s.gpsBadge}>{pontosRegistrados} pt{pontosRegistrados !== 1 ? 's' : ''}</span>
        )}
        {gpsUi.retry && (
          <button style={s.gpsRetry} onClick={startGPS} aria-label="Tentar novamente">↻</button>
        )}
      </div>

      {/* Bottom sheet */}
      <div style={s.sheet(sheetHeight)}>
        <div style={s.sheetHandle}><div style={s.sheetHandleBar} /></div>
        <div style={s.sheetBody}>
          {tela === 'categorias' && renderCategorias()}
          {tela === 'lista'      && renderListaPragas()}
          {tela === 'formulario' && renderFormulario()}
        </div>
        {renderSheetFooter()}
      </div>
    </div>
  )
}
