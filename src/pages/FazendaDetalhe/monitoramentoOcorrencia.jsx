// Monitoring occurrence view: GPS tracking + category cards + pest-specific forms
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

// Detecta o tipo de formulário pelo nome/tipo da praga
function detectFormType(praga) {
  if (!praga) return 'generica'
  const nome = (praga.nome_comum || '').toLowerCase()
  if (nome.includes('lagarta')) return 'lagarta'
  if (nome.includes('percevejo')) return 'percevejo'
  if (praga.tipo === 'daninha') return 'daninha'
  return 'generica'
}

// Calcula CV (coeficiente de variação): (desvio_padrão / média) * 100
function calcularCV(valores) {
  const nums = valores.map(Number).filter(n => !isNaN(n) && n >= 0)
  if (nums.length < 2) return null
  const media = nums.reduce((a, b) => a + b, 0) / nums.length
  if (media === 0) return 0
  const variancia = nums.reduce((acc, v) => acc + (v - media) ** 2, 0) / nums.length
  return ((Math.sqrt(variancia) / media) * 100).toFixed(1)
}

// sacos perdidos/ha: gramas / (metros_quadrados × 6)
function calcularSacosHa(gramas, metros) {
  const g = Number(gramas)
  const m = Number(metros)
  if (!g || !m) return null
  return (g / (m * 6)).toFixed(2)
}

// ─── Estilos base ─────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: C.bg, overflow: 'hidden', position: 'relative'
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', background: C.greenDk, flexShrink: 0
  },
  btnBack: {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 20, cursor: 'pointer', padding: '4px 10px',
    lineHeight: 1
  },
  headerTitle: { color: '#fff', fontWeight: 700, fontSize: 15, flex: 1, margin: 0 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0 },
  gpsBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 14px', background: C.greenLight, borderBottom: `1px solid ${C.border}`,
    flexShrink: 0
  },
  gpsDot: (ok) => ({
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    background: ok ? C.green : C.amber
  }),
  gpsText: { fontSize: 12, color: C.textMid, flex: 1 },
  pointsBadge: {
    background: C.green, color: '#fff', borderRadius: 20,
    fontSize: 11, fontWeight: 700, padding: '2px 8px'
  },
  body: { flex: 1, overflowY: 'auto', padding: 14 },

  // Category cards
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  categoryCard: (gradFrom, gradTo) => ({
    position: 'relative', borderRadius: 14, overflow: 'hidden',
    aspectRatio: '4/3', cursor: 'pointer', border: 'none',
    background: `linear-gradient(160deg, ${gradFrom} 0%, ${gradTo} 100%)`,
    display: 'flex', alignItems: 'flex-end'
  }),
  categoryCardLabel: {
    width: '100%',
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
    color: '#fff', fontWeight: 700, fontSize: 13,
    padding: '20px 10px 8px', textAlign: 'left'
  },

  // Pest cards
  pestCard: (gradFrom, gradTo) => ({
    position: 'relative', borderRadius: 12, overflow: 'hidden',
    aspectRatio: '1/1', cursor: 'pointer', border: 'none',
    background: `linear-gradient(160deg, ${gradFrom} 0%, ${gradTo} 100%)`,
    display: 'flex', alignItems: 'flex-end'
  }),
  pestCardLabel: {
    width: '100%',
    background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
    color: '#fff', fontWeight: 600, fontSize: 12,
    padding: '18px 8px 6px', textAlign: 'left'
  },

  // Forms
  formSection: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 4, display: 'block' },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: C.bg, color: C.textDk
  },
  textarea: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: C.bg, color: C.textDk,
    minHeight: 80, resize: 'vertical', fontFamily: 'inherit'
  },
  segmented: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  segBtn: (active, cor) => ({
    padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: `1.5px solid ${cor}`,
    background: active ? cor : 'transparent',
    color: active ? '#fff' : cor
  }),
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  resultBox: {
    background: C.greenLight, borderRadius: 10, padding: '10px 14px',
    border: `1.5px solid ${C.green}`, display: 'flex', justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultLabel: { fontSize: 12, color: C.textMid, fontWeight: 600 },
  resultValue: { fontSize: 20, fontWeight: 700, color: C.greenDk },

  btnPrimary: {
    width: '100%', padding: '13px', borderRadius: 10,
    background: C.green, border: 'none', color: '#fff',
    fontWeight: 700, fontSize: 15, cursor: 'pointer'
  },
  btnSecondary: {
    padding: '10px 18px', borderRadius: 8,
    background: 'transparent', border: `1.5px solid ${C.border}`,
    color: C.textMid, fontWeight: 600, fontSize: 13, cursor: 'pointer'
  },
  btnCamera: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', borderRadius: 10,
    background: C.bgLight, border: `1.5px solid ${C.border}`,
    color: C.textDk, fontSize: 13, fontWeight: 600, cursor: 'pointer'
  },
  fotoPreview: {
    width: '100%', maxHeight: 200, borderRadius: 10, objectFit: 'cover',
    border: `1.5px solid ${C.border}`, marginTop: 8
  },
  distanciaScroll: {
    display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6
  },
  distanciaItem: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: C.greenLight, border: `1px solid ${C.green}`,
    borderRadius: 20, padding: '4px 10px', flexShrink: 0
  },
  distanciaText: { fontSize: 13, color: C.greenDk, fontWeight: 600 },
  distanciaRemove: {
    background: 'none', border: 'none', color: C.textDim,
    cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1
  },
  btnAdd: {
    background: C.green, border: 'none', borderRadius: 20,
    color: '#fff', fontSize: 18, width: 32, height: 32,
    cursor: 'pointer', flexShrink: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center'
  },
  addRow: { display: 'flex', gap: 8, alignItems: 'center' },
  addInput: {
    flex: 1, padding: '8px 12px', borderRadius: 8,
    border: `1.5px solid ${C.border}`, fontSize: 14,
    outline: 'none', boxSizing: 'border-box'
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 16
  },
  overlayBox: {
    background: C.bg, borderRadius: 16, padding: '20px 18px',
    width: '100%', maxWidth: 360, maxHeight: '85vh', overflowY: 'auto'
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function MonitoramentoOcorrenciaView({ fazenda, fazendaId, talhao, onBack }) {
  // Navegação interna: 'categorias' | 'lista' | 'formulario'
  const [tela, setTela] = useState('categorias')
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [pragaSel, setPragaSel] = useState(null)

  // Catálogo de pragas/doenças da fazenda
  const [catalogo, setCatalogo] = useState([])

  // GPS e caminhamento
  const [gpsStatus, setGpsStatus] = useState('Aguardando GPS...')
  const [gpsOk, setGpsOk] = useState(false)
  const watchRef = useRef(null)
  const trilhaRef = useRef([])      // [{lat, lng, ts}]
  const iniciadoEmRef = useRef(new Date().toISOString())

  // Monitoramento criado no Supabase (lazy — só na primeira ocorrência salva)
  const monitoramentoIdRef = useRef(null)
  const monitoramentoCreateRef = useRef(null)

  // Pontos registrados nesta sessão
  const [pontosRegistrados, setPontosRegistrados] = useState(0)

  // Formulário atual
  const [form, setForm] = useState({})
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // GPS snapshot no momento de capturar (antes de abrir form)
  const gpsSnapRef = useRef(null)

  // Para o Plantio: input temporário antes de adicionar à lista
  const [distanciaInput, setDistanciaInput] = useState('')

  const cameraRef = useRef(null)

  // ── Carregar catálogo de pragas ────────────────────────────────────────────
  useEffect(() => {
    if (!fazendaId) return
    listarPragasDoencas(fazendaId)
      .then(setCatalogo)
      .catch(() => setCatalogo([]))
  }, [fazendaId])

  // ── GPS watch — acumula trilha desde o início ──────────────────────────────
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
        trilhaRef.current.push({ lat, lng, ts: new Date().toISOString() })
        setGpsOk(true)
        setGpsStatus(`GPS ativo · ±${Math.round(pos.coords.accuracy || 0)}m`)
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

  // ── Salva caminhamento ao sair (se houve monitoramento criado) ────────────
  const finalizarESair = useCallback(async () => {
    try {
      if (monitoramentoIdRef.current && trilhaRef.current.length > 0) {
        await salvarCaminhamento(
          monitoramentoIdRef.current,
          trilhaRef.current,
          iniciadoEmRef.current
        )
      }
    } catch {
      // não bloqueia saída em caso de erro de rede
    }
    onBack()
  }, [onBack])

  // ── Criar/obter monitoramento no Supabase (lazy) ───────────────────────────
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

  // ── GPS snapshot ao abrir formulário ──────────────────────────────────────
  function capturarGPSEAbrirForm(categoria, praga = null) {
    setCategoriaSel(categoria)
    setPragaSel(praga)
    setForm({})
    setFotoPreview(null)
    setFotoFile(null)
    setSaveError(null)
    setDistanciaInput('')

    if (!navigator.geolocation) {
      gpsSnapRef.current = null
      setTela('formulario')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        gpsSnapRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: pos.coords.accuracy
        }
        setTela('formulario')
      },
      () => {
        // Usa último ponto da trilha se getCurrentPosition falhar
        const ult = trilhaRef.current[trilhaRef.current.length - 1]
        gpsSnapRef.current = ult ? { lat: ult.lat, lng: ult.lng, precisao: null } : null
        setTela('formulario')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }

  // ── Camera handler ────────────────────────────────────────────────────────
  function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    const url = URL.createObjectURL(file)
    setFotoPreview(url)
  }

  // ── Salvar ocorrência ─────────────────────────────────────────────────────
  async function salvarOcorrencia() {
    if (!talhao?.id) return
    setSaving(true)
    setSaveError(null)
    try {
      let foto_url = null
      if (fotoFile && fazendaId) {
        try {
          const uploaded = await uploadFotoMonitoramento({ fazendaId, file: fotoFile })
          foto_url = getPublicUrl(uploaded)
        } catch {
          // foto falhou — continua sem ela
        }
      }

      const gps = gpsSnapRef.current
      const monitoramentoId = await ensureMonitoramento()

      const tipo_registro = categoriaSel?.id || 'ocorrencia'
      const dados_especificos = { ...form }
      if (foto_url) dados_especificos.foto_url = foto_url

      // Campos raiz do ponto
      const pontoPayload = {
        monitoramento_id: monitoramentoId,
        tipo: 'ocorrencia',
        tipo_registro,
        latitude: gps?.lat ?? 0,
        longitude: gps?.lng ?? 0,
        precisao_m: gps?.precisao ?? null,
        praga_doenca_id: pragaSel?.id || null,
        severidade: form.severidade || form.dano || null,
        recomendacao: form.acao_sugerida || form.recomendacao || null,
        observacoes: form.observacoes || null,
        foto_url,
        dados_especificos
      }

      await criarMonitoramentoPonto(pontoPayload)

      // Salva offline também
      saveMonitoringPointOffline(
        { tipo: tipo_registro, lat: gps?.lat, lng: gps?.lng, hora: new Date().toLocaleString('pt-BR') },
        { fazendaId, fazendaNome: fazenda?.nome || '', talhaoId: talhao.id, talhaoCodigo: talhao?.codigo || '' }
      )

      setPontosRegistrados(n => n + 1)
      setTela('categorias')
    } catch (err) {
      setSaveError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // ── Filtrar catálogo por tipo ─────────────────────────────────────────────
  function catalogoPorTipo(tipoDB) {
    if (!tipoDB) return []
    return catalogo.filter(p => p.tipo === tipoDB)
  }

  // ─── Render: cabeçalho ────────────────────────────────────────────────────
  function renderHeader() {
    const backLabel = tela === 'lista' ? '← Categorias'
      : tela === 'formulario' ? `← ${categoriaSel?.label || 'Voltar'}`
      : null

    return (
      <div style={s.header}>
        {backLabel ? (
          <button
            style={s.btnBack}
            onClick={() => {
              if (tela === 'formulario') setTela(categoriaSel?.tipoDB ? 'lista' : 'categorias')
              else setTela('categorias')
            }}
          >
            ←
          </button>
        ) : (
          <button style={s.btnBack} onClick={finalizarESair}>✕</button>
        )}
        <div style={{ flex: 1 }}>
          <p style={s.headerTitle}>
            {tela === 'categorias' ? 'Monitoramento'
              : tela === 'lista' ? categoriaSel?.label
              : pragaSel?.nome_comum || categoriaSel?.label}
          </p>
          {talhao?.codigo && (
            <p style={s.headerSub}>Talhão {talhao.codigo}</p>
          )}
        </div>
        {tela === 'categorias' && pontosRegistrados > 0 && (
          <button
            style={{ ...s.btnBack, background: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '6px 12px' }}
            onClick={finalizarESair}
          >
            Finalizar
          </button>
        )}
      </div>
    )
  }

  // ─── Render: barra de GPS ─────────────────────────────────────────────────
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

  // ─── Tela 1: grade de categorias ──────────────────────────────────────────
  function renderCategorias() {
    return (
      <div style={s.body}>
        {pontosRegistrados > 0 && (
          <p style={{ fontSize: 13, color: C.textMid, marginBottom: 12 }}>
            Selecione para registrar outra ocorrência ou finalize o monitoramento.
          </p>
        )}
        <div style={s.grid2}>
          {CATEGORIAS.map(cat => (
            <button
              key={cat.id}
              style={s.categoryCard(cat.gradFrom, cat.gradTo)}
              onClick={() => {
                if (cat.tipoDB) {
                  // Tem catálogo → vai para lista de pragas
                  setCategoriaSel(cat)
                  setTela('lista')
                } else {
                  // Sem catálogo (estadio/plantio/colheita/outras) → vai direto pro form
                  capturarGPSEAbrirForm(cat, null)
                }
              }}
            >
              <span style={s.categoryCardLabel}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Tela 2: lista de pragas/doenças da categoria ─────────────────────────
  function renderListaPragas() {
    const lista = catalogoPorTipo(categoriaSel?.tipoDB)

    if (lista.length === 0) {
      return (
        <div style={{ ...s.body, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 12 }}>
          <p style={{ color: C.textDim, fontSize: 14, textAlign: 'center' }}>
            Nenhuma {categoriaSel?.label?.toLowerCase()} cadastrada para esta fazenda.
          </p>
          <button style={s.btnSecondary} onClick={() => capturarGPSEAbrirForm(categoriaSel, null)}>
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
            <button
              key={praga.id}
              style={s.pestCard(gradFrom, gradTo)}
              onClick={() => capturarGPSEAbrirForm(categoriaSel, praga)}
            >
              {praga.foto_url && (
                <img
                  src={praga.foto_url}
                  alt={praga.nome_comum}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <span style={s.pestCardLabel}>
                {praga.nome_comum}
                {praga.nome_cientifico ? (
                  <><br /><span style={{ fontSize: 10, fontStyle: 'italic', opacity: 0.8 }}>{praga.nome_cientifico}</span></>
                ) : null}
              </span>
            </button>
          ))}
          <button
            style={s.pestCard('#555', '#888')}
            onClick={() => capturarGPSEAbrirForm(categoriaSel, null)}
          >
            <span style={s.pestCardLabel}>Outra / não identificada</span>
          </button>
        </div>
      </div>
    )
  }

  // ─── Tela 3: formulários específicos ─────────────────────────────────────

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

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
            {['leve', 'moderada', 'severa'].map(d => (
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
            {['Inicial', 'Vegetativo', 'Reprodutivo'].map(d => (
              <button key={d} style={s.segBtn(form.desenvolvimento === d, C.green)} onClick={() => setField('desenvolvimento', d)}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div style={s.formSection}>
          <label style={s.label}>Pressão de infestação</label>
          <div style={s.segmented}>
            {['Alta', 'Média', 'Baixa'].map(p => (
              <button key={p} style={s.segBtn(form.pressao === p, p === 'Alta' ? C.red : p === 'Média' ? C.amber : C.green)} onClick={() => setField('pressao', p)}>
                {p}
              </button>
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
            <button key={e.id} style={s.segBtn(form.severidade === e.id, e.cor)} onClick={() => setField('severidade', e.id)}>
              {e.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderFormEstadio() {
    return (
      <div style={s.formSection}>
        <label style={s.label}>Estádio fenológico</label>
        <select style={{ ...s.input }} value={form.estadio || ''} onChange={e => setField('estadio', e.target.value)}>
          <option value="">Selecione...</option>
          {ESTADIOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
    )
  }

  function renderFormOutras() {
    return null // só observações + câmera (renderizados abaixo como campos comuns)
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
      setForm(f => {
        const arr = [...(f.distancias || [])]
        arr.splice(idx, 1)
        return { ...f, distancias: arr }
      })
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
            <input
              style={s.addInput}
              type="number"
              min="0"
              value={distanciaInput}
              onChange={e => setDistanciaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDistancia()}
              placeholder="cm"
            />
            <button style={s.btnAdd} onClick={addDistancia}>+</button>
          </div>
        </div>
        {distancias.length >= 2 && (
          <div style={{ ...s.resultBox, marginBottom: 16 }}>
            <span style={s.resultLabel}>CV (coef. variação)</span>
            <span style={{ ...s.resultValue, color: cv > 25 ? C.red : cv > 15 ? C.amber : C.greenDk }}>
              {cv}%
            </span>
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
    const mostrarCamera      = catId !== 'plantio' && catId !== 'colheita'

    return (
      <div style={s.body}>
        {pragaSel && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: C.greenLight, borderRadius: 10, border: `1px solid ${C.green}` }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.greenDk }}>{pragaSel.nome_comum}</p>
            {pragaSel.nome_cientifico && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMid, fontStyle: 'italic' }}>{pragaSel.nome_cientifico}</p>
            )}
            {pragaSel.nivel_dano_economico && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMid }}>NDE: {pragaSel.nivel_dano_economico}</p>
            )}
          </div>
        )}

        {formType === 'lagarta'  && renderFormLagarta()}
        {formType === 'percevejo' && renderFormPercevejo()}
        {formType === 'daninha'  && renderFormDaninha()}
        {catId === 'estadio'     && renderFormEstadio()}
        {catId === 'outras'      && renderFormOutras()}
        {catId === 'plantio'     && renderFormPlantio()}
        {catId === 'colheita'    && renderFormColheita()}
        {formType === 'generica' && catId !== 'outras' && catId !== 'estadio' && catId !== 'plantio' && catId !== 'colheita' && renderFormGenerica()}

        {mostrarObservacoes && (
          <div style={s.formSection}>
            <label style={s.label}>Observações</label>
            <textarea style={s.textarea} value={form.observacoes || ''} onChange={e => setField('observacoes', e.target.value)} placeholder="Descreva o que observou..." />
          </div>
        )}

        {mostrarCamera && (
          <div style={{ marginBottom: 20 }}>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoChange}
              style={{ display: 'none' }}
            />
            <button style={s.btnCamera} onClick={() => cameraRef.current?.click()}>
              <span>📷</span>
              <span>{fotoPreview ? 'Trocar foto' : 'Tirar foto'}</span>
            </button>
            {fotoPreview && (
              <img src={fotoPreview} alt="preview" style={s.fotoPreview} />
            )}
          </div>
        )}

        {saveError && (
          <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{saveError}</p>
        )}

        <button
          style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
          disabled={saving}
          onClick={salvarOcorrencia}
        >
          {saving ? 'Salvando...' : 'Salvar ocorrência'}
        </button>
      </div>
    )
  }

  // ─── Render principal ──────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {renderHeader()}
      {renderGPSBar()}
      {tela === 'categorias'  && renderCategorias()}
      {tela === 'lista'       && renderListaPragas()}
      {tela === 'formulario'  && renderFormulario()}
    </div>
  )
}
