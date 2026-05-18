// Monitoring occurrence view — design v2 (Variant A · bottom sheet sobre mapa)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  criarMonitoramento,
  criarMonitoramentoPonto,
  salvarCaminhamento
} from '../../lib/monitoramentos'
import { listarPragasDoencas } from '../../lib/pragasDoencas'
import { uploadFotoMonitoramento, getPublicUrl } from '../../lib/storage'
import { requestOfflineStorage, saveMonitoringPointOffline } from './offline'
import { SimpleFarmMap } from './maps'
import { normalizeFeature } from './utils'
import '../../styles/monitoramento.css'

// ─── Categorias (paleta v2 Terranexa) ────────────────────────────────────────
const CATEGORIAS = [
  {
    id: 'praga',
    label: 'Praga',
    meta: 'Insetos · lagartas · percevejos',
    tipoDB: 'praga',
    accent: '#b54a3f',
    foto: 'https://images.unsplash.com/photo-1593069567131-53a0614dde1d?w=600&q=70'
  },
  {
    id: 'doenca',
    label: 'Doença',
    meta: 'Folha · caule · raiz',
    tipoDB: 'doenca',
    accent: '#8a5a3c',
    foto: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&q=70'
  },
  {
    id: 'daninha',
    label: 'Planta Daninha',
    meta: 'Ervas · invasoras',
    tipoDB: 'daninha',
    accent: '#5a8a3a',
    foto: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&q=70'
  },
  {
    id: 'estadio',
    label: 'Estádio Fenológico',
    meta: 'Confirmar estágio atual',
    tipoDB: null,
    accent: '#4a7c4e',
    foto: 'https://images.unsplash.com/photo-1416664806563-bb6be3be8a0c?w=600&q=70'
  },
  {
    id: 'outras',
    label: 'Outras Ocorrências',
    meta: 'Foto + texto livre',
    tipoDB: null,
    accent: '#8a5a3c',
    foto: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=70'
  },
  {
    id: 'plantio',
    label: 'Plantio',
    meta: 'Coef. de variação',
    tipoDB: null,
    accent: '#a3c14a',
    foto: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=70'
  },
  {
    id: 'colheita',
    label: 'Colheita',
    meta: 'Perda em sc/ha',
    tipoDB: null,
    accent: '#d99a2b',
    foto: 'https://images.unsplash.com/photo-1535912559178-30627e4cbdec?w=600&q=70'
  }
]

const ESTADIOS = [
  'VE – Emergência', 'VC – Cotilédone', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
  'R1 – Floração', 'R2 – Floração plena', 'R3 – Vagem', 'R4 – Vagem plena',
  'R5 – Granação', 'R5.1', 'R5.2', 'R5.3', 'R5.4', 'R5.5',
  'R6 – Grão cheio', 'R7 – Início maturação', 'R8 – Maturação plena'
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  if (media === 0) return { cv: 0, media: 0, dp: 0 }
  const variancia = nums.reduce((acc, v) => acc + (v - media) ** 2, 0) / nums.length
  const dp = Math.sqrt(variancia)
  return { cv: ((dp / media) * 100).toFixed(1), media: media.toFixed(1), dp: dp.toFixed(2) }
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

function fmtTempo(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}h${(m % 60).toString().padStart(2, '0')}`
  }
  return `${m}min${m < 10 ? ' ' + s.toString().padStart(2, '0') + 's' : ''}`
}

function distanciaTotal(trilha) {
  if (!trilha || trilha.length < 2) return 0
  let total = 0
  for (let i = 1; i < trilha.length; i++) {
    const a = trilha[i - 1]
    const b = trilha[i]
    const dLat = (b.lat - a.lat) * 110540
    const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180)
    total += Math.sqrt(dLat * dLat + dLng * dLng)
  }
  return total
}

function resumoDraft(d) {
  if (d.categoria.id === 'plantio') {
    const r = calcularCV(d.form.distancias || [])
    return r ? `CV ${r.cv}%` : `${(d.form.distancias || []).length} medições`
  }
  if (d.categoria.id === 'colheita') {
    const s = calcularSacosHa(d.form.gramas, d.form.metros_quadrados)
    return s ? `${s} sc/ha` : 'colheita'
  }
  if (d.categoria.id === 'estadio') {
    return d.form.estadio || 'estádio'
  }
  if (d.formType === 'lagarta') {
    const total = (Number(d.form.pequenas_m) || 0) + (Number(d.form.medias_m) || 0) + (Number(d.form.grandes_m) || 0)
    return `${total}/m · ${d.form.dano || ''}`.replace(/·\s*$/, '')
  }
  if (d.formType === 'percevejo') {
    return `${Number(d.form.adultos_m) || 0}A + ${Number(d.form.ninfas_m) || 0}N por m`
  }
  if (d.formType === 'daninha') {
    return `${d.form.desenvolvimento || ''} · ${d.form.pressao || ''}`.replace(/^\s*·\s*|\s*·\s*$/g, '').trim()
  }
  if (d.form.severidade) return `Severidade ${d.form.severidade}`
  return d.categoria.label
}

// ─── Ícones SVG (mesmos do design v2) ────────────────────────────────────────
const Icon = {
  Back: p => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Chevron: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Footprint: p => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M7 4c1.4 0 2.5 1.4 2.5 3.1 0 1.7-1.1 3.1-2.5 3.1S4.5 8.8 4.5 7.1C4.5 5.4 5.6 4 7 4zm0 9c1.5 0 3 .7 3 2.5 0 1.5-1.3 4.5-3 4.5s-3-3-3-4.5C4 13.7 5.5 13 7 13zm10-9c1.4 0 2.5 1.4 2.5 3.1 0 1.7-1.1 3.1-2.5 3.1s-2.5-1.4-2.5-3.1C14.5 5.4 15.6 4 17 4zm0 9c1.5 0 3 .7 3 2.5 0 1.5-1.3 4.5-3 4.5s-3-3-3-4.5c0-1.8 1.5-2.5 3-2.5z" />
    </svg>
  ),
  Camera: p => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Save: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Pin: p => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Plus: p => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Calc: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" />
      <line x1="12" y1="10" x2="14" y2="10" /><line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" /><line x1="12" y1="14" x2="14" y2="14" />
      <line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="18" x2="14" y2="18" />
    </svg>
  ),
  Search: p => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Close: p => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function MonitoramentoOcorrenciaView({ fazenda, fazendaId, talhao, onBack }) {
  // Navegação interna
  const [tela, setTela] = useState('categorias') // 'categorias' | 'lista' | 'formulario'
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [pragaSel, setPragaSel] = useState(null)
  const [buscaPraga, setBuscaPraga] = useState('')

  const [catalogo, setCatalogo] = useState([])

  // GPS
  const [gpsStatus, setGpsStatus] = useState('Aguardando GPS…')
  const [gpsOk, setGpsOk] = useState(false)
  const [gpsPos, setGpsPos] = useState(null) // { lat, lng, precisao }
  const [gpsError, setGpsError] = useState(null)
  const watchRef = useRef(null)
  const trilhaRef = useRef([])
  const ultimaPosRef = useRef(null)
  const iniciadoEmRef = useRef(new Date().toISOString())
  const inicioMsRef = useRef(Date.now())

  // métricas reativas (Trilha / Pontos / Tempo)
  const [metricaPontos, setMetricaPontos] = useState(0)
  const [metricaTrilhaM, setMetricaTrilhaM] = useState(0)
  const [tempoMs, setTempoMs] = useState(0)

  // Monitoramento Supabase (lazy)
  const monitoramentoIdRef = useRef(null)
  const monitoramentoCreateRef = useRef(null)

  // Drafts atuais
  const [drafts, setDrafts] = useState([])

  // Formulário ativo
  const [form, setForm] = useState({})
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [distanciaInput, setDistanciaInput] = useState('')

  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState(null)

  const cameraRef = useRef(null)

  // ── Catálogo ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fazendaId) return
    listarPragasDoencas(fazendaId)
      .then(setCatalogo)
      .catch(() => setCatalogo([]))
  }, [fazendaId])

  // ── GPS watch contínuo ──────────────────────────────────────────────────
  useEffect(() => {
    requestOfflineStorage().catch(() => {})

    if (!navigator.geolocation) {
      setGpsStatus('GPS indisponível')
      setGpsError('GPS indisponível neste navegador')
      return
    }

    setGpsStatus('Solicitando GPS…')
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const precisao = pos.coords.accuracy
        const novo = { lat, lng, precisao }
        ultimaPosRef.current = novo
        trilhaRef.current.push({ lat, lng, ts: new Date().toISOString() })
        setGpsOk(true)
        setGpsPos(novo)
        setGpsStatus(`±${Math.round(precisao || 0)}m`)
        setGpsError(null)
        setMetricaTrilhaM(Math.round(distanciaTotal(trilhaRef.current)))
      },
      err => {
        setGpsOk(false)
        setGpsError(err.message || 'Sem sinal GPS')
        setGpsStatus('Sem GPS')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 }
    )

    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  // ── Cronômetro ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTempoMs(Date.now() - inicioMsRef.current), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Mapa: feature do talhão ─────────────────────────────────────────────
  const mapFeatures = useMemo(() => {
    if (!talhao?.geometria) return []
    const feat = normalizeFeature(talhao.geometria, talhao.codigo)
    return feat ? [feat] : []
  }, [talhao])

  const devicePosition = useMemo(() => {
    if (!gpsOk || !gpsPos) return null
    return {
      latitude: gpsPos.lat,
      longitude: gpsPos.lng,
      accuracy: gpsPos.precisao
    }
  }, [gpsOk, gpsPos])

  // ── Sair: salva caminhamento ────────────────────────────────────────────
  const finalizarESair = useCallback(async () => {
    try {
      if (monitoramentoIdRef.current && trilhaRef.current.length > 0) {
        await salvarCaminhamento(monitoramentoIdRef.current, trilhaRef.current, iniciadoEmRef.current)
      }
    } catch { /* ignora erro de rede */ }
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

  async function registrarPonto() {
    if (drafts.length === 0) return
    setRegistrando(true)
    setErro(null)

    try {
      const gps = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve(ultimaPosRef.current)
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precisao: pos.coords.accuracy }),
          () => resolve(ultimaPosRef.current),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
        )
      })
      if (!gps) {
        setErro('Sem GPS para registrar o ponto. Aguarde sinal.')
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
      setMetricaPontos(n => n + 1)
    } catch (err) {
      setErro(err.message || 'Erro ao registrar ponto')
    } finally {
      setRegistrando(false)
    }
  }

  const pontoAtual = `P-${String(metricaPontos + 1).padStart(3, '0')}`
  const coordText = gpsPos
    ? `${gpsPos.lat.toFixed(4)}, ${gpsPos.lng.toFixed(4)}`
    : '—'

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function counterDelta(key, delta) {
    setForm(f => {
      const cur = Number(f[key] || 0)
      const next = Math.max(0, cur + delta)
      return { ...f, [key]: next }
    })
  }

  // ── Header ──────────────────────────────────────────────────────────────
  function renderHeader() {
    const isCateg = tela === 'categorias'
    const subtitulo = talhao?.codigo
      ? `Talhão ${talhao.codigo}${isCateg ? ' · em andamento' : ''}`
      : 'Em andamento'
    const titulo = isCateg
      ? 'Monitorar'
      : tela === 'lista'
        ? categoriaSel?.label
        : pragaSel?.nome_comum || categoriaSel?.label

    return (
      <div className="m-topbar">
        {isCateg ? (
          <button className="back" onClick={finalizarESair} aria-label="Sair">
            <Icon.Close />
          </button>
        ) : (
          <button
            className="back"
            onClick={() => {
              if (tela === 'formulario') setTela(categoriaSel?.tipoDB ? 'lista' : 'categorias')
              else setTela('categorias')
            }}
            aria-label="Voltar"
          >
            <Icon.Back />
          </button>
        )}
        <div className="title">
          <div className="title-h">{titulo}</div>
          <div className="title-s">{subtitulo}</div>
        </div>
        <span className={`gps-mini ${gpsOk ? '' : 'warn'}`}>{gpsStatus}</span>
        {isCateg && (
          <button className="m-finalizar" onClick={finalizarESair}>Finalizar</button>
        )}
      </div>
    )
  }

  // ── Tela: categorias com bottom sheet sobre mapa ────────────────────────
  function renderCategorias() {
    return (
      <div className="m-body with-map">
        {/* Mapa Leaflet de fundo */}
        <div className="m-map-host">
          {mapFeatures.length > 0 ? (
            <SimpleFarmMap
              features={mapFeatures}
              height="100%"
              fullBleed
              selectedCode={talhao?.codigo}
              selectedMode="monitoramento"
              pluviometros={[]}
              devicePosition={devicePosition}
            />
          ) : null}
        </div>

        {/* Walk strip */}
        <div className="m-walk-top">
          <div className="ic"><Icon.Footprint /></div>
          <div className="cols">
            <div>
              <div className="l">Trilha</div>
              <div className="v">{metricaTrilhaM}m</div>
            </div>
            <div>
              <div className="l">Pontos</div>
              <div className="v">{metricaPontos}</div>
            </div>
            <div>
              <div className="l">Tempo</div>
              <div className="v">{fmtTempo(tempoMs)}</div>
            </div>
          </div>
        </div>

        {gpsError && (
          <div className="m-gps-warn">
            <div className="ic">!</div>
            <div>{gpsError}</div>
          </div>
        )}

        {/* Bottom sheet */}
        <div className="m-sheet">
          <div className="m-sheet-grab" />
          <div className="m-sheet-header">
            <div className="m-sheet-title">Registrar ocorrência</div>
            <div className="m-sheet-sub">
              Ponto {pontoAtual} · {drafts.length > 0 ? `${drafts.length} ocorrência${drafts.length > 1 ? 's' : ''} no ponto` : 'selecione a categoria'}
            </div>
          </div>

          <div className="m-sheet-body">
            {drafts.length > 0 && (
              <>
                <div className="m-section-label">Ocorrências deste ponto</div>
                {drafts.map(d => (
                  <div key={d.id} className="m-draft-item">
                    <div className="m-draft-dot" style={{ background: d.categoria.accent }} />
                    <div className="m-draft-texts">
                      <div className="m-draft-title">{d.praga?.nome_comum || d.categoria.label}</div>
                      <div className="m-draft-sub">{resumoDraft(d)}</div>
                    </div>
                    <button className="m-draft-rm" onClick={() => removerDraft(d.id)} aria-label="Remover">
                      <Icon.Close />
                    </button>
                  </div>
                ))}
                <div className="m-section-label">Adicionar outra ocorrência</div>
              </>
            )}

            <div className="m-cats-list">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat.id}
                  className="m-cat-card-wide"
                  onClick={() => {
                    if (cat.tipoDB) { setCategoriaSel(cat); setBuscaPraga(''); setTela('lista') }
                    else iniciarFormulario(cat, null)
                  }}
                >
                  <div
                    className="bg"
                    style={cat.foto ? { backgroundImage: `url(${cat.foto})` } : { background: cat.accent }}
                  />
                  <div className="ov" />
                  <div className="body">
                    <div className="name">{cat.label}</div>
                    <div className="meta">{cat.meta}</div>
                  </div>
                  <div className="chev"><Icon.Chevron /></div>
                </button>
              ))}
            </div>
          </div>

          <div className="m-sheet-footer">
            {erro && <div className="m-err" style={{ flex: 1, margin: 0 }}>{erro}</div>}
            <div className="m-footer-meta">
              <Icon.Pin style={{ verticalAlign: '-2px', marginRight: 4 }} />
              <b>{pontoAtual}</b> · {coordText}
            </div>
            <button
              className="m-btn primary"
              disabled={drafts.length === 0 || registrando}
              onClick={registrarPonto}
            >
              <Icon.Save />
              {registrando
                ? 'Registrando…'
                : `Registrar ponto${drafts.length > 0 ? ` (${drafts.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Tela: lista de pragas/doenças/daninhas ──────────────────────────────
  function renderListaPragas() {
    const lista = catalogo
      .filter(p => p.tipo === categoriaSel?.tipoDB)
      .filter(p => {
        if (!buscaPraga.trim()) return true
        const q = buscaPraga.toLowerCase()
        return (p.nome_comum || '').toLowerCase().includes(q) ||
               (p.nome_cientifico || '').toLowerCase().includes(q)
      })

    return (
      <div className="m-body">
        <div className="m-search">
          <span className="ic"><Icon.Search /></span>
          <input
            placeholder={`Buscar ${categoriaSel?.label?.toLowerCase() || ''}…`}
            value={buscaPraga}
            onChange={e => setBuscaPraga(e.target.value)}
          />
        </div>

        {lista.length === 0 ? (
          <div className="m-pest-empty">
            Nenhuma {categoriaSel?.label?.toLowerCase()} cadastrada para esta fazenda.
            <div style={{ marginTop: 16 }}>
              <button className="m-btn outline" onClick={() => iniciarFormulario(categoriaSel, null)}>
                Registrar sem especificar
              </button>
            </div>
          </div>
        ) : (
          <div className="m-pest-grid">
            {lista.map(praga => (
              <button
                key={praga.id}
                className="m-pest-card"
                onClick={() => iniciarFormulario(categoriaSel, praga)}
              >
                <div
                  className="bg"
                  style={praga.foto_url ? { backgroundImage: `url(${praga.foto_url})` } : { background: categoriaSel?.accent || '#5a8a3a' }}
                />
                <div className="ov" />
                <div className="body">
                  <div className="name">{praga.nome_comum}</div>
                  {praga.nome_cientifico && <div className="sci">{praga.nome_cientifico}</div>}
                </div>
              </button>
            ))}
            <button className="m-pest-card" onClick={() => iniciarFormulario(categoriaSel, null)}>
              <div className="bg" style={{ background: '#5a6657' }} />
              <div className="ov" />
              <div className="body">
                <div className="name">Outra / não identificada</div>
                <div className="sci">Registro livre</div>
              </div>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Formulário: hero + secciones ────────────────────────────────────────
  function heroData() {
    if (pragaSel) {
      return {
        name: pragaSel.nome_comum,
        sci: pragaSel.nome_cientifico,
        bg: pragaSel.foto_url
      }
    }
    return {
      name: categoriaSel?.label,
      sci: categoriaSel?.meta,
      bg: categoriaSel?.foto
    }
  }

  function FormLagarta() {
    return (
      <>
        <div className="m-form-section">
          <div className="m-form-label">Contagem por metro</div>
          <div className="m-counter-grid">
            {[
              { k: 'pequenas_m', lbl: 'Pequenas' },
              { k: 'medias_m',   lbl: 'Médias' },
              { k: 'grandes_m',  lbl: 'Grandes' }
            ].map(c => (
              <div key={c.k} className="m-counter">
                <div className="lbl">{c.lbl}</div>
                <div className="row">
                  <button className="btn" onClick={() => counterDelta(c.k, -1)}>−</button>
                  <div className="v">{Number(form[c.k] || 0)}</div>
                  <button className="btn" onClick={() => counterDelta(c.k, +1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="m-form-section">
          <div className="m-form-label">Dano encontrado</div>
          <div className="m-seg three">
            {[
              { id: 'leve', lbl: 'Leve', cls: 'leve' },
              { id: 'moderada', lbl: 'Moderada', cls: 'mod' },
              { id: 'severa', lbl: 'Severa', cls: 'sev' }
            ].map(b => (
              <button
                key={b.id}
                className={`m-seg-btn ${b.cls} ${form.dano === b.id ? 'active' : ''}`}
                onClick={() => setField('dano', b.id)}
              >
                <span className="dot" /> {b.lbl}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  function FormPercevejo() {
    const adultos = Number(form.adultos_m || 0)
    const ninfas = Number(form.ninfas_m || 0)
    const total = adultos + ninfas
    return (
      <>
        <div className="m-form-section">
          <div className="m-form-label">Pano-de-batida · por metro</div>
          <div className="m-counter-grid two">
            {[
              { k: 'adultos_m', lbl: 'Adultos' },
              { k: 'ninfas_m',  lbl: 'Ninfas' }
            ].map(c => (
              <div key={c.k} className="m-counter">
                <div className="lbl">{c.lbl}</div>
                <div className="row">
                  <button className="btn" onClick={() => counterDelta(c.k, -1)}>−</button>
                  <div className="v">{Number(form[c.k] || 0)}</div>
                  <button className="btn" onClick={() => counterDelta(c.k, +1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="m-form-section">
          <div className="m-calc">
            <div>
              <div className="lbl">Total / m</div>
              <div className="v">{total}<span className="u">/m</span></div>
            </div>
          </div>
        </div>
      </>
    )
  }

  function FormDaninha() {
    return (
      <>
        <div className="m-form-section">
          <div className="m-form-label">Estágio de desenvolvimento</div>
          <div className="m-seg three">
            {['Inicial', 'Vegetativo', 'Reprodutivo'].map(d => (
              <button
                key={d}
                className={`m-seg-btn ${form.desenvolvimento === d ? 'active' : ''}`}
                onClick={() => setField('desenvolvimento', d)}
              >
                <span className="dot" /> {d}
              </button>
            ))}
          </div>
        </div>

        <div className="m-form-section">
          <div className="m-form-label">Pressão da infestação</div>
          <div className="m-seg three">
            {[
              { id: 'Baixa', cls: 'leve' },
              { id: 'Média', cls: 'mod' },
              { id: 'Alta', cls: 'sev' }
            ].map(p => (
              <button
                key={p.id}
                className={`m-seg-btn ${p.cls} ${form.pressao === p.id ? 'active' : ''}`}
                onClick={() => setField('pressao', p.id)}
              >
                <span className="dot" /> {p.id}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  function FormGenerica() {
    return (
      <div className="m-form-section">
        <div className="m-form-label">Severidade</div>
        <div className="m-seg three">
          {[
            { id: 'leve', lbl: 'Leve', cls: 'leve' },
            { id: 'moderada', lbl: 'Moderada', cls: 'mod' },
            { id: 'severa', lbl: 'Severa', cls: 'sev' }
          ].map(b => (
            <button
              key={b.id}
              className={`m-seg-btn ${b.cls} ${form.severidade === b.id ? 'active' : ''}`}
              onClick={() => setField('severidade', b.id)}
            >
              <span className="dot" /> {b.lbl}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function FormEstadio() {
    return (
      <div className="m-form-section">
        <div className="m-form-label">Estádio fenológico</div>
        <select
          className="m-select"
          value={form.estadio || ''}
          onChange={e => setField('estadio', e.target.value)}
        >
          <option value="">Selecione…</option>
          {ESTADIOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
    )
  }

  function FormPlantio() {
    const distancias = form.distancias || []
    const r = calcularCV(distancias)

    function addDistancia() {
      const v = parseFloat(distanciaInput.replace(',', '.'))
      if (isNaN(v)) return
      setForm(f => ({ ...f, distancias: [...(f.distancias || []), v] }))
      setDistanciaInput('')
    }
    function removeDistancia(idx) {
      setForm(f => { const arr = [...(f.distancias || [])]; arr.splice(idx, 1); return { ...f, distancias: arr } })
    }

    const qualidade = r
      ? r.cv > 25 ? { lbl: 'Ruim', color: '#b54a3f' }
      : r.cv > 15 ? { lbl: 'Regular', color: '#d99a2b' }
      : { lbl: 'Excelente', color: '#a3c14a' }
      : null

    return (
      <>
        <div className="m-form-section">
          <div className="m-form-label">Metros avaliados</div>
          <input
            className="m-input"
            type="number"
            min="0"
            value={form.metros_avaliados || ''}
            onChange={e => setField('metros_avaliados', e.target.value)}
            placeholder="Ex: 5"
          />
        </div>

        <div className="m-form-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="m-form-label" style={{ margin: 0 }}>Distâncias entre sementes</div>
            <span style={{ fontFamily: 'var(--m-font-mono)', fontSize: 10, color: 'var(--m-ink-3)' }}>
              {distancias.length} · cm
            </span>
          </div>
          <div className="m-dist-rail">
            {distancias.map((d, i) => (
              <div key={i} className="m-dist-item">
                <button className="rm" onClick={() => removeDistancia(i)} aria-label="Remover">×</button>
                <div className="idx">#{String(i + 1).padStart(2, '0')}</div>
                <div className="v">{Number(d).toFixed(1)}</div>
                <div className="u">cm</div>
              </div>
            ))}
            <input
              className="m-dist-input"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="cm"
              value={distanciaInput}
              onChange={e => setDistanciaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDistancia()}
            />
            <button className="m-dist-add" onClick={addDistancia} aria-label="Adicionar">
              <Icon.Plus />
            </button>
          </div>
        </div>

        {r && (
          <div className="m-form-section">
            <div className="m-calc">
              <div>
                <div className="lbl">Coef. de variação</div>
                <div className="v">{r.cv}<span className="u">%</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lbl">Qualidade</div>
                <div className="badge" style={{ color: qualidade.color }}>{qualidade.lbl}</div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  function FormColheita() {
    const sacosHa = calcularSacosHa(form.gramas, form.metros_quadrados)
    return (
      <>
        <div className="m-form-section">
          <div className="m-form-label">Área avaliada (m²)</div>
          <input
            className="m-input"
            type="number"
            min="0"
            value={form.metros_quadrados || ''}
            onChange={e => setField('metros_quadrados', e.target.value)}
            placeholder="Ex: 2"
          />
        </div>

        <div className="m-form-section">
          <div className="m-form-label">Grãos coletados (gramas)</div>
          <input
            className="m-input"
            type="number"
            min="0"
            value={form.gramas || ''}
            onChange={e => setField('gramas', e.target.value)}
            placeholder="Ex: 36,4"
          />
        </div>

        <div className="m-form-section">
          <div className="m-form-label">Origem da perda</div>
          <div className="m-seg two">
            {['Plataforma', 'Trilha', 'Pré-colheita', 'Não ident.'].map(o => (
              <button
                key={o}
                className={`m-seg-btn ${form.origem === o ? 'active' : ''}`}
                onClick={() => setField('origem', o)}
              >
                <span className="dot" /> {o}
              </button>
            ))}
          </div>
        </div>

        {sacosHa && (
          <div className="m-form-section">
            <div className="m-calc">
              <div>
                <div className="lbl">Perda estimada</div>
                <div className="v">{sacosHa}<span className="u">sc/ha</span></div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  function FormOutras() {
    return (
      <>
        <div className="m-form-section">
          <div className="m-form-label">Tipo (opcional)</div>
          <div className="m-chip-row">
            {['Deficiência', 'Compactação', 'Erosão', 'Falha stand', 'Geada', 'Fauna', 'Outro'].map(t => (
              <button
                key={t}
                className={`m-chip ${form.tipo_outras === t ? 'active' : ''}`}
                onClick={() => setField('tipo_outras', t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="m-form-section">
          <div className="m-form-label">Severidade percebida</div>
          <div className="m-seg three">
            {[
              { id: 'leve', lbl: 'Leve', cls: 'leve' },
              { id: 'moderada', lbl: 'Moderada', cls: 'mod' },
              { id: 'severa', lbl: 'Severa', cls: 'sev' }
            ].map(b => (
              <button
                key={b.id}
                className={`m-seg-btn ${b.cls} ${form.severidade === b.id ? 'active' : ''}`}
                onClick={() => setField('severidade', b.id)}
              >
                <span className="dot" /> {b.lbl}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  function renderFormulario() {
    const catId = categoriaSel?.id
    const formType = detectFormType(pragaSel, categoriaSel)
    const mostrarObs = catId !== 'plantio'
    const mostrarCamera = catId !== 'plantio' && catId !== 'colheita'
    const hero = heroData()
    const saveLabel = catId === 'plantio' || catId === 'colheita' ? 'Salvar avaliação' : 'Salvar ocorrência'

    return (
      <div className="m-body">
        <div className="m-hero">
          <div
            className="bg"
            style={hero.bg ? { backgroundImage: `url(${hero.bg})` } : { background: categoriaSel?.accent || '#5a8a3a' }}
          />
          <div className="ov" />
          <div className="body">
            <div className="name">{hero.name}</div>
            {hero.sci && <div className="sci">{hero.sci}</div>}
          </div>
        </div>

        <div className="m-form">
          {formType === 'lagarta'   && <FormLagarta />}
          {formType === 'percevejo' && <FormPercevejo />}
          {formType === 'daninha'   && <FormDaninha />}
          {catId === 'estadio'      && <FormEstadio />}
          {catId === 'plantio'      && <FormPlantio />}
          {catId === 'colheita'     && <FormColheita />}
          {catId === 'outras'       && <FormOutras />}
          {formType === 'generica' && catId !== 'outras' && catId !== 'estadio' && catId !== 'plantio' && catId !== 'colheita' && <FormGenerica />}

          {mostrarObs && (
            <div className="m-form-section">
              <div className="m-form-label">Observações</div>
              <textarea
                className="m-textarea"
                value={form.observacoes || ''}
                onChange={e => setField('observacoes', e.target.value)}
                placeholder="Descreva o que observou…"
              />
            </div>
          )}

          {mostrarCamera && (
            <div className="m-form-section">
              <div className="m-form-label">Foto</div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFotoChange}
                style={{ display: 'none' }}
              />
              <button className="m-photo" onClick={() => cameraRef.current?.click()}>
                <div className="ic"><Icon.Camera /></div>
                <div>
                  <strong>{fotoPreview ? 'Trocar foto' : 'Tocar para capturar'}</strong>
                  <span>Câmera nativa · sem upload</span>
                </div>
              </button>
              {fotoPreview && <img src={fotoPreview} alt="" className="m-photo-preview" />}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="m-btn outline block" onClick={() => {
              if (categoriaSel?.tipoDB) setTela('lista')
              else setTela('categorias')
            }}>
              Cancelar
            </button>
            <button className="m-btn primary block" onClick={adicionarOcorrencia}>
              <Icon.Save /> {saveLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="monit-app">
      <div className="monit-frame">
        {renderHeader()}
        {tela === 'categorias' && renderCategorias()}
        {tela === 'lista'      && renderListaPragas()}
        {tela === 'formulario' && renderFormulario()}
      </div>
    </div>
  )
}
