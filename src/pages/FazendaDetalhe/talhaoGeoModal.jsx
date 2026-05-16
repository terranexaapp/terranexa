import { useState } from 'react'
import { theme } from '../../styles/theme'
import { criarTalhao } from '../../lib/fazendas'
import { uploadArquivoFazenda } from '../../lib/storage'
import { FASE_LABELS } from './constants'
import { SimpleFarmMap } from './maps'
import { Field } from './sharedComponents'
import {
  normalizeFeature,
  pointsToFeature,
  calcularAreaGeo,
  parseKmlText,
  featureCode,
  featureName,
  formatCultura
} from './utils'
import {
  eyebrowStyle,
  panelTitleStyle,
  viewTitleStyle,
  modalOverlayStyle,
  geoModalStyle,
  geoModalHeaderStyle,
  geoModalBodyStyle,
  geoModeMenuStyle,
  geoModeButtonStyle,
  geoModeButtonActiveStyle,
  geoRuleBoxStyle,
  emptyGeoStateStyle,
  drawToolsStyle,
  kmlDropStyle,
  geoFormStyle,
  formErrorStyle,
  iconButtonStyle,
  inputStyle,
  primaryActionStyle,
  secondaryActionStyle
} from './styles'

const C = theme.normal

export function TalhaoGeoModal({ fazendaId, initialMode, sugerirCodigo, talhoes, onClose, onCreated }) {
  const [mode, setMode] = useState(initialMode)
  const [codigo, setCodigo] = useState(sugerirCodigo || 'T1')
  const [nome, setNome] = useState('')
  const [cultura, setCultura] = useState('soja')
  const [fase, setFase] = useState('preparo')
  const [drawPoints, setDrawPoints] = useState([])
  const [geojson, setGeojson] = useState(null)
  const [importFeatures, setImportFeatures] = useState([])
  const [sourceFile, setSourceFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const existingFeatures = talhoes.map(talhao => normalizeFeature(talhao.geometria, talhao.codigo)).filter(Boolean)
  const drawFeature = pointsToFeature(drawPoints, codigo)
  const featuresToSave = importFeatures.length > 0 ? importFeatures : [geojson || drawFeature].filter(Boolean)
  const area = featuresToSave.reduce((sum, feature) => sum + calcularAreaGeo(feature), 0)

  function chooseMode(nextMode) {
    setMode(nextMode)
    setError('')
    setGeojson(null)
    setImportFeatures([])
    setSourceFile(null)
    setDrawPoints([])
  }

  async function handleKml(file) {
    setError('')
    try {
      const text = await file.text()
      const fc = parseKmlText(text)
      const features = fc.features
      const feature = features[0]
      setSourceFile(file)
      setImportFeatures(features)
      setGeojson(feature)
      setCodigo(featureCode(feature, 0))
      setNome(features.length === 1 ? featureName(feature, 0) : `${features.length} talhões importados`)
      setMode('kml')
    } catch (err) {
      setError(err.message || 'Erro ao processar KML')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (featuresToSave.length === 0) {
      setError('Desenhe o talhão ou importe um KML antes de salvar.')
      return
    }
    if (featuresToSave.some(feature => calcularAreaGeo(feature) <= 0)) {
      setError('A geometria precisa ter área válida para criar o talhão.')
      return
    }
    setSaving(true)
    try {
      const origem = sourceFile
        ? await uploadArquivoFazenda({ fazendaId, file: sourceFile, bucket: 'mapas', folder: 'talhoes' })
        : null
      for (let index = 0; index < featuresToSave.length; index++) {
        const feature = featuresToSave[index]
        const multi = featuresToSave.length > 1
        const itemCodigo = multi ? featureCode(feature, index) : codigo
        await criarTalhao({
          fazenda_id: fazendaId,
          codigo: itemCodigo,
          nome: multi ? featureName(feature, index) : nome || null,
          cultura,
          fase,
          area_ha: calcularAreaGeo(feature),
          geometria: { ...feature, properties: { ...(feature.properties || {}), codigo: itemCodigo } },
          arquivo_origem_bucket: origem?.bucket,
          arquivo_origem_path: origem?.path,
          arquivo_origem_nome: origem?.nome
        })
      }
      await onCreated()
    } catch (err) {
      setError(err.message || 'Erro ao salvar talhão')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={modalOverlayStyle}>
      <div onClick={e => e.stopPropagation()} style={geoModalStyle}>
        <div style={geoModalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>CADASTRO DE TALHÃO</p>
            <h2 style={viewTitleStyle}>Geometria obrigatória</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar modal" style={iconButtonStyle}>
            ×
          </button>
        </div>

        <div style={geoModalBodyStyle}>
          <aside style={geoModeMenuStyle}>
            <button
              onClick={() => chooseMode('draw')}
              style={mode === 'draw' ? geoModeButtonActiveStyle : geoModeButtonStyle}
            >
              Desenhar no mapa
            </button>
            <button
              onClick={() => chooseMode('kml')}
              style={mode === 'kml' ? geoModeButtonActiveStyle : geoModeButtonStyle}
            >
              Importar KML
            </button>
            <div style={geoRuleBoxStyle}>
              Para criar um talhão, o contorno precisa vir de um desenho no mapa ou de um arquivo KML.
            </div>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!mode && (
              <div style={emptyGeoStateStyle}>
                <h3 style={panelTitleStyle}>Escolha uma forma de cadastrar</h3>
                <p style={{ margin: '8px 0 0', color: C.textMid, fontSize: 13 }}>
                  Use o menu lateral para desenhar o contorno ou importar um KML.
                </p>
              </div>
            )}

            {mode === 'draw' && (
              <>
                <SimpleFarmMap
                  features={[...existingFeatures, drawFeature].filter(Boolean)}
                  drawPoints={drawPoints}
                  onMapClick={point => setDrawPoints(points => [...points, point])}
                  height={360}
                  drawing
                />
                <div style={drawToolsStyle}>
                  <button
                    onClick={() => setDrawPoints(points => points.slice(0, -1))}
                    style={secondaryActionStyle}
                    disabled={drawPoints.length === 0}
                  >
                    Desfazer ponto
                  </button>
                  <button onClick={() => setDrawPoints([])} style={secondaryActionStyle}>
                    Limpar desenho
                  </button>
                  <span style={{ color: C.textMid, fontSize: 12 }}>{drawPoints.length} pontos marcados</span>
                </div>
              </>
            )}

            {mode === 'kml' && (
              <>
                <label style={kmlDropStyle}>
                  <input
                    type="file"
                    accept=".kml"
                    hidden
                    onChange={e => e.target.files?.[0] && handleKml(e.target.files[0])}
                  />
                  <strong>Selecionar arquivo KML</strong>
                  <span>O sistema vai ler um ou vários polígonos e calcular as áreas automaticamente.</span>
                </label>
                <SimpleFarmMap features={[...existingFeatures, ...featuresToSave].filter(Boolean)} height={300} />
              </>
            )}

            <form onSubmit={handleSave} style={geoFormStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: 10 }}>
                <Field label="CÓDIGO">
                  <input
                    required
                    disabled={featuresToSave.length > 1}
                    value={featuresToSave.length > 1 ? `${featuresToSave.length} códigos do KML` : codigo}
                    onChange={e => setCodigo(e.target.value.toUpperCase())}
                    style={{ ...inputStyle, color: featuresToSave.length > 1 ? C.textDim : C.textDk }}
                  />
                </Field>
                <Field label="NOME">
                  <input
                    disabled={featuresToSave.length > 1}
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Nome opcional"
                    style={{ ...inputStyle, color: featuresToSave.length > 1 ? C.textDim : C.textDk }}
                  />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px', gap: 10 }}>
                <Field label="CULTURA">
                  <select value={cultura} onChange={e => setCultura(e.target.value)} style={inputStyle}>
                    {['soja', 'milho', 'algodao', 'feijao', 'sorgo', 'cana', 'cafe', 'outro'].map(item => (
                      <option key={item} value={item}>
                        {formatCultura(item)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="FASE">
                  <select value={fase} onChange={e => setFase(e.target.value)} style={inputStyle}>
                    {Object.entries(FASE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ÁREA">
                  <div style={{ ...inputStyle, color: area > 0 ? C.greenDp : C.textDim, fontWeight: 900 }}>
                    {area.toFixed(2)} ha
                  </div>
                </Field>
              </div>
              {error && <div style={formErrorStyle}>{error}</div>}
              <button
                type="submit"
                disabled={saving || featuresToSave.length === 0 || area <= 0}
                style={{
                  ...primaryActionStyle,
                  width: '100%',
                  opacity: saving || featuresToSave.length === 0 || area <= 0 ? 0.55 : 1
                }}
              >
                {saving
                  ? 'Salvando...'
                  : `Criar ${featuresToSave.length > 1 ? `${featuresToSave.length} talhões` : 'talhão'} com geometria`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
