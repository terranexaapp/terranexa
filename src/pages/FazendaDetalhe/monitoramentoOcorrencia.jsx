// Monitoring occurrence view: GPS caminhamento + drafts por ponto + registro agrupado
import { useCallback, useEffect, useRef, useState } from 'react'
import { theme } from '../../styles/theme'
import {
  criarMonitoramento,
  criarMonitoramentoPonto,
  salvarCaminhamento,
  ESCALAS_SEVERIDADE
} from '../../lib/monitoramentos'
import { listarPragasDoencas } from '../../lib/pragasDoencas'
import { uploadFotoMonitoramento, getPublicUrl } from '../../lib/storage'
import { requestOfflineStorage, saveMonitoringPointOffline } from './offline'

const C = theme.normal

// ─── Categorias fixas ────────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: 'praga',    label: 'Praga',              tipoDB: 'praga',    gradFrom: '#8B2A1A', gradTo: '#E85A3A' },
  { id: 'doenca',   label: 'Doença',             tipoDB: 'doenca',   gradFrom: '#4A0A0A', gradTo: '#B03020' },
  { id: 'daninha',  label: 'Planta Daninha',     tipoDB: 'daninha',  gradFrom: '#1A4A0A', gradTo: '#5AAE38' },
  { id: 'estadio',  label: 'Estádio Fenológico', tipoDB: null,       gradFrom: '#0A2A4A', gradTo: '#4A8AB8' },
  { id: 'outras',   label: 'Outras Ocorrências', tipoDB: null,       gradFrom: '#3A2010', gradTo: '#A0714F' },
  { id: 'plantio',  label: 'Plantio',            tipoDB: null,       gradFrom: '#1A3A0A', gradTo: '#7EC850' },
  { id: 'colheita', label: 'Colheita',           tipoDB: null,       gradFrom: '#4A2A00', gradTo: '#E8A84C' },
]

const ESTADIOS = [
  'VE – Emergência', 'VC – Cotilédone', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
  'R1 – Floração', 'R2 – Floração plena', 'R3 – Vagem', 'R4 – Vagem plena',
  'R5 – Granação', 'R5.1', 'R5.2', 'R5.3', 'R5.4', 'R5.5',
  'R6 – Grão cheio', 'R7 – Início maturação', 'R8 – Maturação plena'
]

function detectFormType(praga) {
  if (!praga) return 'generica'
  const nome = (praga.nome_comum || '').toLowerCase()
  if (nome.includes('lagarta')) return 'lagarta'
  if (nome.includes('percevejo')) return 'percevejo'
  if (praga.tipo === 'daninha') return 'daninha'
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
  if (d.categoria.id === 'estadio') {
    return d.form.estadio || 'estádio'
  }
  if (d.formType === 'lagarta') {
    const total = (Number(d.form.pequenas_m) || 0) + (Number(d.form.medias_m) || 0) + (Number(d.form.grandes_m) || 0)
    return `${total}/m · ${d.form.dano || ''}`
  }
  if (d.formType === 'percevejo') {
    return `${Number(d.form.adultos_m) || 0}A + ${Number(d.form.ninfas_m) || 0}N por m`
  }
  if (d.formType === 'daninha') {
    return `${d.form.desenvolvimento || ''} · ${d.form.pressao || ''}`.trim()
  }
  if (d.form.severidade) return d.form.severidade
  return d.categoria.label
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden', position: 'relative' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.greenDk, flexShrink: 0 },
  btnBack: { background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 20, cursor: 'pointer', padding: '4px 10px', lineHeight: 1 },
  btnFinalizar: { background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '6px 12px' },
  headerTitle: { color: '#fff', fontWeight: 700, fontSize: 15, flex: 1, margin: 0 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0 },
  gpsBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: C.greenLight, borderBottom: `1px solid ${C.border}`, flexShrink: 0 },
  gpsDot: ok => ({ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: ok ? C.green : C.amber }),
  gpsText: { fontSize: 12, color: C.textMid, flex: 1 },
  pointsBadge: { background: C.green, color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 8px' },
  body: { flex: 1, overflowY: 'auto', padding: 14 },

  // Drafts list
  draftCard: { display: 'flex', alignItems: 'center', gap: 10, background: C.bgLight, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  draftDot: cor => ({ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0 }),
  draftTexts: { flex: 1, minWidth: 0 },
  draftTitulo: { fontSize: 13, fontWeight: 700, color: C.textDk, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  draftResumo: { fontSize: 11, color: C.textMid, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  draftRemove: { background: 'none', border: 'none', color: C.red, fontSize: 18, cursor: 'pointer', padding: '2px 6px', lineHeight: 1 },

  sectionTitle: { fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 8px' },

  // Footer fixo com botões registrar/finalizar
  footer: { padding: '12px 14px', background: C.bg, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, flexShrink: 0 },

  // Category cards
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  categoryCard: (gradFrom, gradTo) => ({ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '4/3', cursor: 'pointer', border: 'none', background: `linear-gradient(160deg, ${gradFrom} 0%, ${gradTo} 100%)`, display: 'flex', alignItems: 'flex-end' }),
  categoryCardLabel: { width: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '20px 10px 8px', textAlign: 'left' },

  pestCard: (gradFrom, gradTo) => ({ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1/1', cursor: 'pointer', border: 'none', background: `linear-gradient(160deg, ${gradFrom} 0%, ${gradTo} 100%)`, display: 'flex', alignItems: 'flex-end' }),
  pestCardLabel: { width: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)', color: '#fff', fontWeight: 600, fontSize: 12, padding: '18px 8px 6px', textAlign: 'left' },

  // Forms
  formSection: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.textDk },
  textarea: { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.textDk, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' },
  segmented: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  segBtn: (active, cor) => ({ padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${cor}`, background: active ? cor : 'transparent', color: active ? '#fff' : cor }),
  resultBox: { background: C.greenLight, borderRadius: 10, padding: '10px 14px', border: `1.5px solid ${C.green}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: 12, color: C.textMid, fontWeight: 600 },
  resultValue: { fontSize: 20, fontWeight: 700, color: C.greenDk },

  btnPrimary: { flex: 1, padding: '13px', borderRadius: 10, background: C.green, border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  btnPrimaryDisabled: { flex: 1, padding: '13px', borderRadius: 10, background: C.border, border: 'none', color: C.textVery, fontWeight: 700, fontSize: 15, cursor: 'not-allowed' },
  btnSecondary: { flex: 1, padding: '13px', borderRadius: 10, background: 'transparent', border: `1.5px solid ${C.border}`, color: C.textMid, fontWeight: 600, fontSize: 14, cursor: 'pointer' },

  btnCamera: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: C.bgLight, border: `1.5px solid ${C.border}`, color: C.textDk, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  fotoPreview: { width: '100%', maxHeight: 200, borderRadius: 10, objectFit: 'cover', border: `1.5px solid ${C.border}`, marginTop: 8 },

  distanciaScroll: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 },
  distanciaItem: { display: 'flex', alignItems: 'center', gap: 4, background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 },
  distanciaText: { fontSize: 13, color: C.greenDk, fontWeight: 600 },
  distanciaRemove: { background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 },
  btnAdd: { background: C.green, border: 'none', borderRadius: 20, color: '#fff', fontSize: 18, width: 32, height: 32, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addRow: { display: 'flex', gap: 8, alignItems: 'center' },
  addInput: { flex: 1, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' },

  empty: { textAlign: 'center', color: C.textDim, fontSize: 13, padding: '20px 0' }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function MonitoramentoOcorrenciaView({ fazenda, fazendaId, talhao, onBack }) {
  // Navegação interna: 'categorias' | 'lista' | 'formulario'
  const [tela, setTela] = useState('categorias')
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [pragaSel, setPragaSel] = useState(null)

  // Catálogo de pragas/doenças
  const [catalogo, setCatalogo] = useState([])

  // GPS
  const [gpsStatus, setGpsStatus] = useState('Aguardando GPS...')
  const [gpsOk, setGpsOk] = useState(false)
  const watchRef = useRef(null)
  const trilhaRef = useRef([])
  const ultimaPosRef = useRef(null)
  const iniciadoEmRef = useRef(new Date().toISOString())

  // Monitoramento Supabase (lazy)
  const monitoramentoIdRef = useRef(null)
  const monitoramentoCreateRef = useRef(null)

  // Drafts: ocorrências acumuladas para o ponto atual
  // [{ id, categoria, praga, formType, form, fotoFile, fotoPreview }]
  const [drafts, setDrafts] = useState([])

  // Total de pontos efetivamente registrados na sessão
  const [pontosRegistrados, setPontosRegistrados] = useState(0)

  // Formulário ativo
  const [form, setForm] = useState({})
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [distanciaInput, setDistanciaInput] = useState('')

  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState(null)

  const cameraRef = useRef(null)

  // ── Carregar catálogo ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!fazendaId) return
    listarPragasDoencas(fazendaId)
      .then(setCatalogo)
      .catch(() => setCatalogo([]))
  }, [fazendaId])

  // ── GPS watch contínuo (caminhamento) ────────────────────────────────────
  useEffect(() => {
    requestOfflineStorage().catch(() => {})

    if (!navigator.geolocation) {
      setGpsStatus('GPS indisponível neste navegador')
      return
    }

    setGpsStatus('Solicitando GPS...')
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const precisao = pos.coords.accuracy
        ultimaPosRef.current = { lat, lng, precisao }
        trilhaRef.current.push({ lat, lng, ts: new Date().toISOString() })
        setGpsOk(true)
        setGpsStatus(`GPS ativo · ±${Math.round(precisao || 0)}m`)
      },
      err => {
        setGpsOk(false)
        setGpsStatus(err.message || 'Sem sinal GPS')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 }
    )

    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  // ── Sair: salva caminhamento ──────────────────────────────────────────────
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

  // ── Abrir formulário ──────────────────────────────────────────────────────
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

  // ── "Salvar ocorrência" → adiciona ao draft, NÃO grava no DB ─────────────
  function adicionarOcorrencia() {
    const formType = pragaSel ? detectFormType(pragaSel) : categoriaSel?.id
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

  // ── "Registrar Ponto" → captura GPS, salva todos os drafts agrupados ─────
  async function registrarPonto() {
    if (drafts.length === 0) return
    setRegistrando(true)
    setErro(null)

    try {
      // 1. Captura GPS único para o ponto
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

      // 2. Garante monitoramento
      const monitoramentoId = await ensureMonitoramento()
      const grupoId = uuid()

      // 3. Salva cada draft
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

      // 4. Cache offline
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

  // ─── Header ───────────────────────────────────────────────────────────────
  function renderHeader() {
    return (
      <div style={s.header}>
        {tela !== 'categorias' ? (
          <button
            style={s.btnBack}
            onClick={() => {
              if (tela === 'formulario') setTela(categoriaSel?.tipoDB ? 'lista' : 'categorias')
              else setTela('categorias')
            }}
          >←</button>
        ) : (
          <button style={s.btnBack} onClick={finalizarESair}>✕</button>
        )}
        <div style={{ flex: 1 }}>
          <p style={s.headerTitle}>
            {tela === 'categorias' ? 'Monitoramento'
              : tela === 'lista' ? categoriaSel?.label
              : pragaSel?.nome_comum || categoriaSel?.label}
          </p>
          {talhao?.codigo && (<p style={s.headerSub}>Talhão {talhao.codigo}</p>)}
        </div>
        {tela === 'categorias' && (
          <button style={s.btnFinalizar} onClick={finalizarESair}>Finalizar</button>
        )}
      </div>
    )
  }

  function renderGPSBar() {
    return (
      <div style={s.gpsBar}>
        <div style={s.gpsDot(gpsOk)} />
        <span style={s.gpsText}>{gpsStatus}</span>
        {pontosRegistrados > 0 && (
          <span style={s.pointsBadge}>{pontosRegistrados} ponto{pontosRegistrados !== 1 ? 's' : ''}</span>
        )}
      </div>
    )
  }

  // ─── Tela: categorias + drafts atuais ─────────────────────────────────────
  function renderCategorias() {
    return (
      <div style={s.body}>
        {drafts.length > 0 && (
          <>
            <p style={s.sectionTitle}>Ocorrências deste ponto ({drafts.length})</p>
            {drafts.map(d => (
              <div key={d.id} style={s.draftCard}>
                <div style={s.draftDot(d.categoria.gradTo)} />
                <div style={s.draftTexts}>
                  <p style={s.draftTitulo}>
                    {d.praga?.nome_comum || d.categoria.label}
                  </p>
                  <p style={s.draftResumo}>{resumoDraft(d)}</p>
                </div>
                <button style={s.draftRemove} onClick={() => removerDraft(d.id)}>✕</button>
              </div>
            ))}
            <p style={s.sectionTitle}>Adicionar outra ocorrência</p>
          </>
        )}
        {drafts.length === 0 && (
          <p style={{ fontSize: 13, color: C.textMid, marginBottom: 12 }}>
            Selecione uma categoria para adicionar a primeira ocorrência deste ponto.
          </p>
        )}
        <div style={s.grid2}>
          {CATEGORIAS.map(cat => (
            <button
              key={cat.id}
              style={s.categoryCard(cat.gradFrom, cat.gradTo)}
              onClick={() => {
                if (cat.tipoDB) { setCategoriaSel(cat); setTela('lista') }
                else iniciarFormulario(cat, null)
              }}
            >
              <span style={s.categoryCardLabel}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderFooter() {
    if (tela !== 'categorias') return null
    const podeRegistrar = drafts.length > 0 && !registrando
    return (
      <div style={s.footer}>
        {erro && <p style={{ color: C.red, fontSize: 12, margin: 0, alignSelf: 'center' }}>{erro}</p>}
        <button
          style={podeRegistrar ? s.btnPrimary : s.btnPrimaryDisabled}
          disabled={!podeRegistrar}
          onClick={registrarPonto}
        >
          {registrando ? 'Registrando...' : `Registrar ponto${drafts.length > 0 ? ` (${drafts.length})` : ''}`}
        </button>
      </div>
    )
  }

  // ─── Tela: lista de pragas/doenças da categoria ───────────────────────────
  function renderListaPragas() {
    const lista = catalogoPorTipo(categoriaSel?.tipoDB)
    if (lista.length === 0) {
      return (
        <div style={{ ...s.body, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 12 }}>
          <p style={{ color: C.textDim, fontSize: 14, textAlign: 'center' }}>
            Nenhuma {categoriaSel?.label?.toLowerCase()} cadastrada para esta fazenda.
          </p>
          <button style={{ ...s.btnSecondary, flex: 'none' }} onClick={() => iniciarFormulario(categoriaSel, null)}>
            Registrar sem especificar
          </button>
        </div>
      )
    }
    const gradFrom = categoriaSel?.gradFrom || '#222'
    const gradTo   = categoriaSel?.gradTo   || '#555'
    return (
      <div style={s.body}>
        <div style={s.grid2}>
          {lista.map(praga => (
            <button key={praga.id} style={s.pestCard(gradFrom, gradTo)} onClick={() => iniciarFormulario(categoriaSel, praga)}>
              {praga.foto_url && (
                <img src={praga.foto_url} alt={praga.nome_comum} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <span style={s.pestCardLabel}>
                {praga.nome_comum}
                {praga.nome_cientifico && (
                  <><br /><span style={{ fontSize: 10, fontStyle: 'italic', opacity: 0.8 }}>{praga.nome_cientifico}</span></>
                )}
              </span>
            </button>
          ))}
          <button style={s.pestCard('#555', '#888')} onClick={() => iniciarFormulario(categoriaSel, null)}>
            <span style={s.pestCardLabel}>Outra / não identificada</span>
          </button>
        </div>
      </div>
    )
  }

  // ─── Formulários específicos ──────────────────────────────────────────────
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
          <div style={{ ...s.resultBox, marginBottom: 16 }}>
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
          <div style={{ ...s.resultBox, marginBottom: 16 }}>
            <span style={s.resultLabel}>Sacos perdidos / ha</span>
            <span style={s.resultValue}>{sacosHa}</span>
          </div>
        )}
      </>
    )
  }

  function renderFormulario() {
    const catId = categoriaSel?.id
    const formType = pragaSel ? detectFormType(pragaSel) : catId
    const mostrarObservacoes = catId !== 'plantio' && catId !== 'colheita'
    const mostrarCamera = catId !== 'plantio' && catId !== 'colheita'

    return (
      <>
        <div style={s.body}>
          {pragaSel && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: C.greenLight, borderRadius: 10, border: `1px solid ${C.green}` }}>
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
            <div style={{ marginBottom: 20 }}>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{ display: 'none' }} />
              <button style={s.btnCamera} onClick={() => cameraRef.current?.click()}>
                <span>📷</span><span>{fotoPreview ? 'Trocar foto' : 'Tirar foto'}</span>
              </button>
              {fotoPreview && (<img src={fotoPreview} alt="preview" style={s.fotoPreview} />)}
            </div>
          )}
        </div>
        <div style={s.footer}>
          <button style={s.btnPrimary} onClick={adicionarOcorrencia}>
            Salvar ocorrência
          </button>
        </div>
      </>
    )
  }

  // ─── Render principal ─────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {renderHeader()}
      {renderGPSBar()}
      {tela === 'categorias' && renderCategorias()}
      {tela === 'lista'      && renderListaPragas()}
      {tela === 'formulario' && renderFormulario()}
      {tela === 'categorias' && renderFooter()}
    </div>
  )
}
