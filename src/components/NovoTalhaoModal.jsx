/**
 * TerraNexa · Modal de criação de talhão
 * Três modos: desenhar no mapa, upload KML/KMZ, upload Shapefile
 */

import { useState, useRef } from 'react'
import { MapView } from './MapView'
import { theme } from '../styles/theme'
import {
  parseGeoFile, calcularAreaHectares, sugerirNomeTalhao,
} from '../lib/geo'
import { criarTalhao, criarTalhoesEmLote } from '../lib/fazendas'

const C = theme.normal

const CULTURAS = [
  { id: 'soja',    label: 'Soja',    icon: '🌱' },
  { id: 'milho',   label: 'Milho',   icon: '🌽' },
  { id: 'algodao', label: 'Algodão', icon: '🌼' },
  { id: 'feijao',  label: 'Feijão',  icon: '🫘' },
  { id: 'sorgo',   label: 'Sorgo',   icon: '🌾' },
  { id: 'cana',    label: 'Cana',    icon: '🎋' },
  { id: 'cafe',    label: 'Café',    icon: '☕' },
  { id: 'outro',   label: 'Outro',   icon: '🌿' },
]

const FASES = [
  { id: 'preparo',     label: 'Preparo de solo' },
  { id: 'plantio',     label: 'Plantio' },
  { id: 'brotacao',    label: 'Brotação' },
  { id: 'vegetativo',  label: 'Vegetativo' },
  { id: 'floracao',    label: 'Floração' },
  { id: 'frutificacao',label: 'Frutificação' },
  { id: 'maturacao',   label: 'Maturação' },
  { id: 'colheita',    label: 'Colheita' },
  { id: 'pos_colheita',label: 'Pós-colheita' },
  { id: 'pousio',      label: 'Pousio' },
]

export function NovoTalhaoModal({ fazendaId, sugerirCodigo, fazendaCenter, onClose, onCreated }) {
  const [mode, setMode] = useState(null) // 'draw' | 'kml' | 'shp'

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.bg, borderRadius: 18,
        width: '100%', maxWidth: 720,
        maxHeight: '92vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `linear-gradient(180deg, ${C.greenLight}, ${C.bg})`,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: C.textDim,
              fontFamily: 'monospace', letterSpacing: '2px' }}>NOVO TALHÃO</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, color: C.textDk,
              fontWeight: 700, fontFamily: 'Georgia, serif' }}>
              {mode ? voltarLabel(mode) : 'Como você quer cadastrar?'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {mode && (
              <button onClick={() => setMode(null)} style={{
                background: C.bgLight, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '6px 12px', color: C.textDk,
                fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                cursor: 'pointer',
              }}>← VOLTAR</button>
            )}
            <button onClick={onClose} style={{
              background: C.bgLight, border: `1px solid ${C.border}`,
              borderRadius: 8, width: 32, height: 32, fontSize: 16,
              cursor: 'pointer', color: C.textDk,
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!mode && <ModeSelector onPick={setMode} />}
          {mode === 'draw' && (
            <DrawMode
              fazendaId={fazendaId}
              sugerirCodigo={sugerirCodigo}
              fazendaCenter={fazendaCenter}
              onCreated={onCreated}
            />
          )}
          {(mode === 'kml' || mode === 'shp') && (
            <UploadMode
              type={mode}
              fazendaId={fazendaId}
              sugerirCodigo={sugerirCodigo}
              onCreated={onCreated}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function voltarLabel(mode) {
  if (mode === 'draw') return 'Desenhar no mapa'
  if (mode === 'kml')  return 'Upload de KML / KMZ'
  if (mode === 'shp')  return 'Upload de Shapefile'
  return ''
}

/* ── MODE SELECTOR ────────────────────────────────────────── */
function ModeSelector({ onPick }) {
  const options = [
    {
      id: 'draw',
      icon: '✏️',
      title: 'Desenhar no mapa',
      desc: 'Marque o contorno do talhão sobre a imagem de satélite. Ideal quando você não tem arquivo.',
      color: C.greenDp,
    },
    {
      id: 'kml',
      icon: '📍',
      title: 'Upload de KML / KMZ',
      desc: 'Arquivo do Google Earth, GPS Garmin ou aplicativos similares.',
      color: C.amber,
    },
    {
      id: 'shp',
      icon: '🗂️',
      title: 'Upload de Shapefile (.zip)',
      desc: 'Arquivo padrão de GIS profissional. Envie o ZIP contendo .shp, .dbf, .shx.',
      color: C.soil,
    },
  ]

  return (
    <div style={{ padding: 18 }}>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
        A área em hectares será calculada automaticamente a partir do polígono.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => (
          <button key={opt.id} onClick={() => onPick(opt.id)} style={{
            background: C.bg, border: `1.5px solid ${C.border}`,
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', gap: 14, alignItems: 'center',
            textAlign: 'left', cursor: 'pointer',
            transition: 'all 0.15s',
          }} onMouseEnter={e => {
            e.currentTarget.style.borderColor = opt.color
            e.currentTarget.style.background = C.bgSoft
          }} onMouseLeave={e => {
            e.currentTarget.style.borderColor = C.border
            e.currentTarget.style.background = C.bg
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `${opt.color}1A`, border: `1.5px solid ${opt.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, flexShrink: 0,
            }}>{opt.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textDk,
                fontFamily: 'Georgia, serif' }}>{opt.title}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMid, lineHeight: 1.4 }}>{opt.desc}</p>
            </div>
            <span style={{ color: C.textMid, fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── DRAW MODE ─────────────────────────────────────────────── */
function DrawMode({ fazendaId, sugerirCodigo, fazendaCenter, onCreated }) {
  const [geojson, setGeojson] = useState(null)
  const [area, setArea] = useState(0)
  const [codigo, setCodigo] = useState(sugerirCodigo || 'T1')
  const [nome, setNome] = useState('')
  const [cultura, setCultura] = useState('soja')
  const [fase, setFase] = useState('preparo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handlePolygon(feature) {
    setGeojson(feature)
    setArea(feature ? calcularAreaHectares(feature) : 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!geojson) {
      setError('Desenhe o polígono do talhão no mapa primeiro')
      return
    }
    if (area <= 0) {
      setError('Polígono inválido — área calculada é zero')
      return
    }

    setLoading(true)
    try {
      const talhao = await criarTalhao({
        fazenda_id: fazendaId,
        codigo, nome: nome || null, cultura, fase, area_ha: area,
        geometria: geojson,
      })
      onCreated([talhao])
    } catch (err) {
      setError(err.message || 'Erro ao salvar talhão')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
        Use a ferramenta de polígono no canto superior direito do mapa.
        Clique para marcar cada vértice e clique no primeiro ponto para fechar.
      </p>

      <MapView
        center={fazendaCenter || [-9.3891, -40.5028]}
        zoom={fazendaCenter ? 15 : 13}
        height={300}
        allowDrawing={true}
        onPolygonDrawn={handlePolygon}
      />

      {/* Área calculada */}
      <div style={{
        marginTop: 12, padding: '12px 14px',
        background: area > 0 ? C.greenLight : C.bgLight,
        borderRadius: 12,
        border: `1.5px solid ${area > 0 ? C.greenDp : C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: C.textDim,
            fontFamily: 'monospace', letterSpacing: '2px' }}>ÁREA CALCULADA</p>
          <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700,
            color: area > 0 ? C.greenDp : C.textDim,
            fontFamily: 'Georgia, serif', lineHeight: 1 }}>
            {area.toFixed(2)} <span style={{ fontSize: 14 }}>ha</span>
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>
          {geojson ? '✓ Polígono desenhado' : 'Desenhe no mapa →'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
        <FormFields
          codigo={codigo} setCodigo={setCodigo}
          nome={nome} setNome={setNome}
          cultura={cultura} setCultura={setCultura}
          fase={fase} setFase={setFase}
        />

        {error && (
          <div style={{ background: C.redLight, color: C.redDk,
            borderRadius: 10, padding: '10px 12px', marginTop: 10, marginBottom: 10,
            fontSize: 12, border: `1px solid ${C.red}33` }}>{error}</div>
        )}

        <button type="submit" disabled={loading || !geojson} style={{
          width: '100%', padding: '13px', marginTop: 6,
          background: (loading || !geojson) ? C.textDim : C.greenDp,
          color: C.bg, border: 'none', borderRadius: 10,
          fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px',
          cursor: (loading || !geojson) ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'SALVANDO...' : 'SALVAR TALHÃO'}
        </button>
      </form>
    </div>
  )
}

/* ── UPLOAD MODE ───────────────────────────────────────────── */
function UploadMode({ type, fazendaId, sugerirCodigo, onCreated }) {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parsedFC, setParsedFC] = useState(null)
  const [highlightIdx, setHighlightIdx] = useState(null)
  const [items, setItems] = useState([]) // array de {codigo, nome, cultura, fase, area, geometria}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(f) {
    setError('')
    setFile(f)
    setParsing(true)
    try {
      const fc = await parseGeoFile(f)
      const baseNum = parseInt((sugerirCodigo || 'T1').replace(/\D/g, '')) || 1

      const itemsNovo = fc.features.map((feature, idx) => ({
        codigo: `T${baseNum + idx}`,
        nome: sugerirNomeTalhao(feature, idx),
        cultura: 'soja',
        fase: 'preparo',
        area: calcularAreaHectares(feature),
        geometria: feature,
      }))

      setParsedFC(fc)
      setItems(itemsNovo)
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo')
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  function updateItem(idx, patch) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx))
    if (parsedFC) {
      const newFC = {
        ...parsedFC,
        features: parsedFC.features.filter((_, i) => i !== idx),
      }
      setParsedFC(newFC)
    }
  }

  async function handleSubmit() {
    setError('')
    if (items.length === 0) {
      setError('Nenhum talhão para salvar')
      return
    }
    // Valida códigos únicos
    const codes = items.map(i => i.codigo.trim()).filter(Boolean)
    if (new Set(codes).size !== codes.length) {
      setError('Códigos duplicados — cada talhão precisa de um código único')
      return
    }
    if (codes.length !== items.length) {
      setError('Todos os talhões precisam ter código')
      return
    }

    setLoading(true)
    try {
      const payload = items.map(i => ({
        codigo: i.codigo,
        nome: i.nome || null,
        cultura: i.cultura,
        fase: i.fase,
        area_ha: i.area,
        geometria: i.geometria,
      }))
      const salvos = await criarTalhoesEmLote(fazendaId, payload)
      onCreated(salvos)
    } catch (err) {
      setError(err.message || 'Erro ao salvar talhões')
      setLoading(false)
    }
  }

  const totalArea = items.reduce((s, i) => s + (Number(i.area) || 0), 0)
  const accept = type === 'kml' ? '.kml,.kmz' : '.zip'

  return (
    <div style={{ padding: 18 }}>
      {!file && (
        <>
          <div onClick={() => fileRef.current?.click()} style={{
            border: `2px dashed ${C.border}`, borderRadius: 16,
            padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
            background: C.bgSoft, transition: 'all 0.15s',
          }} onMouseEnter={e => {
            e.currentTarget.style.borderColor = C.greenDp
            e.currentTarget.style.background = C.greenLight
          }} onMouseLeave={e => {
            e.currentTarget.style.borderColor = C.border
            e.currentTarget.style.background = C.bgSoft
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>
              {type === 'kml' ? '📍' : '🗂️'}
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textDk }}>
              Toque para selecionar arquivo
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textMid }}>
              {type === 'kml'
                ? 'Aceita .kml ou .kmz (Google Earth)'
                : 'Aceita .zip contendo .shp, .dbf e .shx'}
            </p>
          </div>
          <input ref={fileRef} type="file" accept={accept} hidden
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </>
      )}

      {parsing && (
        <p style={{ color: C.textMid, textAlign: 'center', padding: 24,
          fontFamily: 'monospace', fontSize: 11, letterSpacing: '2px' }}>
          PROCESSANDO ARQUIVO...
        </p>
      )}

      {error && (
        <div style={{ background: C.redLight, color: C.redDk,
          borderRadius: 10, padding: '10px 12px', marginTop: 12,
          fontSize: 12, border: `1px solid ${C.red}33` }}>{error}</div>
      )}

      {parsedFC && items.length > 0 && (
        <>
          <div style={{ marginTop: 0 }}>
            <MapView
              height={240}
              existingFeatures={{
                type: 'FeatureCollection',
                features: items.map((it, idx) => ({
                  ...it.geometria,
                  properties: { ...it.geometria.properties, codigo: it.codigo },
                })),
              }}
              highlightFeatureId={highlightIdx}
              onFeatureClick={(idx) => setHighlightIdx(idx)}
            />
          </div>

          {/* Resumo */}
          <div style={{
            marginTop: 12, padding: '12px 14px',
            background: C.greenLight, borderRadius: 12,
            border: `1.5px solid ${C.greenDp}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: C.textDim,
                fontFamily: 'monospace', letterSpacing: '2px' }}>RESUMO</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: C.textDk }}>
                {items.length} talhão{items.length > 1 ? 'es' : ''} detectado{items.length > 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 9, color: C.textDim,
                fontFamily: 'monospace', letterSpacing: '2px' }}>ÁREA TOTAL</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700,
                color: C.greenDp, fontFamily: 'Georgia, serif' }}>
                {totalArea.toFixed(2)} ha
              </p>
            </div>
          </div>

          {/* Lista editável */}
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, color: C.textDim,
              fontFamily: 'monospace', letterSpacing: '2px' }}>
              REVISAR E EDITAR TALHÕES
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((it, idx) => (
                <TalhaoLinha key={idx} item={it} idx={idx}
                  highlighted={highlightIdx === idx}
                  onUpdate={(p) => updateItem(idx, p)}
                  onRemove={() => removeItem(idx)}
                  onHover={() => setHighlightIdx(idx)}
                />
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '13px', marginTop: 16,
            background: loading ? C.textDim : C.greenDp,
            color: C.bg, border: 'none', borderRadius: 10,
            fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'SALVANDO...' : `SALVAR ${items.length} TALHÃO${items.length > 1 ? 'ES' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}

/* ── Linha editável de talhão ─────────────────────────────── */
function TalhaoLinha({ item, idx, highlighted, onUpdate, onRemove, onHover }) {
  const [expanded, setExpanded] = useState(false)
  const culturaInfo = CULTURAS.find(c => c.id === item.cultura)

  return (
    <div onMouseEnter={onHover} style={{
      background: C.bg,
      border: `1.5px solid ${highlighted ? C.amber : C.border}`,
      borderRadius: 12, overflow: 'hidden',
      transition: 'border 0.15s',
    }}>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{culturaInfo?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input value={item.codigo}
            onChange={e => onUpdate({ codigo: e.target.value.toUpperCase() })}
            placeholder="CÓDIGO" style={{
              border: 'none', background: 'transparent',
              fontSize: 13, fontWeight: 700, color: C.textDk,
              fontFamily: 'Georgia, serif', width: 60, padding: 0,
              outline: 'none',
            }} />
          <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>
            {item.area.toFixed(2)} ha · {culturaInfo?.label}
          </p>
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{
          background: C.bgLight, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: '4px 8px', fontSize: 9,
          fontFamily: 'monospace', letterSpacing: '1px', cursor: 'pointer',
          color: C.textDk,
        }}>{expanded ? 'OK' : 'EDITAR'}</button>
        <button onClick={onRemove} style={{
          background: 'transparent', border: 'none', color: C.red,
          fontSize: 16, cursor: 'pointer', padding: 4,
        }}>×</button>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px', background: C.bgSoft }}>
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 4px', fontSize: 8, color: C.textDim,
              fontFamily: 'monospace', letterSpacing: '1px' }}>NOME (OPCIONAL)</p>
            <input value={item.nome} onChange={e => onUpdate({ nome: e.target.value })}
              placeholder="Ex: Talhão dos Cajueiros" style={{
                width: '100%', padding: '7px 10px', fontSize: 12,
                border: `1px solid ${C.border}`, borderRadius: 8,
                background: C.bg, color: C.textDk, outline: 'none',
                boxSizing: 'border-box',
              }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 8, color: C.textDim,
                fontFamily: 'monospace', letterSpacing: '1px' }}>CULTURA</p>
              <select value={item.cultura} onChange={e => onUpdate({ cultura: e.target.value })}
                style={{
                  width: '100%', padding: '7px 8px', fontSize: 12,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  background: C.bg, color: C.textDk, outline: 'none',
                }}>
                {CULTURAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 8, color: C.textDim,
                fontFamily: 'monospace', letterSpacing: '1px' }}>FASE</p>
              <select value={item.fase} onChange={e => onUpdate({ fase: e.target.value })}
                style={{
                  width: '100%', padding: '7px 8px', fontSize: 12,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  background: C.bg, color: C.textDk, outline: 'none',
                }}>
                {FASES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Form fields compartilhados ───────────────────────────── */
function FormFields({ codigo, setCodigo, nome, setNome, cultura, setCultura, fase, setFase }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <Field label="CÓDIGO *">
          <input required value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="T1" style={inputStyle} />
        </Field>
        <Field label="NOME (OPCIONAL)">
          <input value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Talhão dos Cajueiros" style={inputStyle} />
        </Field>
      </div>
      <Field label="CULTURA *">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {CULTURAS.map(c => (
            <button type="button" key={c.id} onClick={() => setCultura(c.id)} style={{
              padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
              background: cultura === c.id ? C.greenLight : C.bg,
              border: `1.5px solid ${cultura === c.id ? C.greenDp : C.border}`,
              color: cultura === c.id ? C.greenDp : C.textMid,
              fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              {c.label.toUpperCase()}
            </button>
          ))}
        </div>
      </Field>
      <Field label="FASE">
        <select value={fase} onChange={e => setFase(e.target.value)} style={inputStyle}>
          {FASES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </Field>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 9, fontFamily: 'monospace',
        letterSpacing: '2px', color: C.textDim, marginBottom: 5, fontWeight: 700 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  background: C.bgSoft, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 13, color: C.textDk,
  outline: 'none', boxSizing: 'border-box',
}
