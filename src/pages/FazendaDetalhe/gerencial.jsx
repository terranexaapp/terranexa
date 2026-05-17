import { useEffect, useState } from 'react'
import { theme } from '../../styles/theme'
import { useMediaQuery } from './hooks'
import { DesktopIcon } from './DesktopIcon'
import { SimpleFarmMap } from './maps'
import { ManagementModulePanel, ConfiguracaoFazendaPanel, InsumosShortcut } from './panels'
import { SafrasManager } from './safrasManager'
import { EquipeManager } from './equipeManager'
import { EstoqueManager } from './estoqueManager'
import { MaquinaManager } from './maquinaManager'
import { ProdutividadeManager } from './produtividadeManager'
import { normalizeFeature, findTalhaoForCoord } from './utils'
import {
  eyebrowStyle,
  panelTitleStyle,
  viewTitleStyle,
  viewSubtitleStyle,
  primaryActionStyle,
  secondaryActionStyle,
  sidebarEyebrowStyle,
  managementPageStyle,
  managementHeroStyle,
  managementHeroCompactStyle,
  managementWorkspaceSingleStyle,
  managementWorkspaceCompactStyle,
  managementWorkspaceMobileStyle,
  managementNavRailMobileStyle,
  managementNavRailCompactStyle,
  managementNavGroupStyle,
  managementNavGroupCompactStyle,
  managementNavItemStyle,
  managementNavItemCompactStyle,
  managementNavLabelStyle,
  managementNavLabelCompactStyle,
  managementNavHintStyle,
  managementModuleContentStyle,
  managementSummaryStripStyle,
  managementSummaryCardStyle,
  managementSummaryIconStyle,
  managementSummaryTextStyle,
  managementSummaryLabelStyle,
  managementSummaryValueStyle,
  desktopNavGroupTitleStyle,
  mapManagerShellStyle,
  managerBreadcrumbRowStyle,
  managerBreadcrumbStyle,
  managerBreadcrumbSepStyle,
  managerMapActionsStyle,
  mapCounterStyle,
  mapRefreshButtonStyle,
  managerMapStageStyle,
  mapOverlayToolsStyle,
  mapToolButtonStyle,
  pluviometerShellStyle,
  pluviometerHeaderStyle,
  pluviometerMapStageStyle,
  pluviometerEditorStyle,
  pluviometerEditorActionsStyle,
  pluviometerCoordGridStyle,
  pluviometerHintStyle,
  pluviometerEditorFooterStyle,
  dangerGhostButtonStyle,
  dateLabelStyle,
  dateInputStyle,
  formErrorStyle
} from './styles'

const C = theme.normal

function MapaCadastroTalhoes({ talhoes, total, onOpenCadastro, onSelectTalhao }) {
  const features = talhoes
    .map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) }))
    .filter(item => item.feature)

  return (
    <div style={mapManagerShellStyle}>
      <div style={managerBreadcrumbRowStyle}>
        <div style={managerBreadcrumbStyle}>
          <DesktopIcon name="home" size={20} />
          <span style={managerBreadcrumbSepStyle}>{'>'}</span>
          <span>Talhoes georreferenciados</span>
          <span style={managerBreadcrumbSepStyle}>{'>'}</span>
          <strong>Mapa da fazenda</strong>
        </div>
        <div style={managerMapActionsStyle}>
          <span style={mapCounterStyle}>{talhoes.length} talhoes</span>
          <button type="button" style={mapRefreshButtonStyle} aria-label="Atualizar mapa">
            <DesktopIcon name="refresh" size={19} />
          </button>
        </div>
      </div>

      <div style={managementSummaryStripStyle}>
        <div style={managementSummaryCardStyle}>
          <span style={managementSummaryIconStyle}>
            <DesktopIcon name="map" size={25} />
          </span>
          <div style={managementSummaryTextStyle}>
            <span style={managementSummaryLabelStyle}>Area total</span>
            <strong style={managementSummaryValueStyle}>{Number(total || 0).toFixed(2)} ha</strong>
          </div>
        </div>
        <div style={managementSummaryCardStyle}>
          <span style={managementSummaryIconStyle}>
            <DesktopIcon name="dashboard" size={24} />
          </span>
          <div style={managementSummaryTextStyle}>
            <span style={managementSummaryLabelStyle}>Talhoes</span>
            <strong style={managementSummaryValueStyle}>{talhoes.length}</strong>
          </div>
        </div>
        <div style={managementSummaryCardStyle}>
          <span style={managementSummaryIconStyle}>
            <DesktopIcon name="soil" size={25} />
          </span>
          <div style={managementSummaryTextStyle}>
            <span style={managementSummaryLabelStyle}>Com geometria</span>
            <strong style={managementSummaryValueStyle}>{features.length}</strong>
          </div>
        </div>
      </div>

      <div style={managerMapStageStyle}>
        <div style={mapOverlayToolsStyle}>
          <button onClick={() => onOpenCadastro('draw')} style={mapToolButtonStyle}>
            <DesktopIcon name="pencil" size={24} />
            <span>Desenhar</span>
          </button>
          <button onClick={() => onOpenCadastro('kml')} style={mapToolButtonStyle}>
            <DesktopIcon name="upload" size={24} />
            <span>
              Importar
              <br />
              KML
            </span>
          </button>
          <button onClick={() => onOpenCadastro()} style={mapToolButtonStyle}>
            <DesktopIcon name="plus-circle" size={24} />
            <span>Cadastro</span>
          </button>
        </div>
        <SimpleFarmMap
          features={features.map(item => ({
            ...item.feature,
            properties: { ...item.feature.properties, codigo: item.talhao.codigo }
          }))}
          height={430}
          onFeatureClick={index => onSelectTalhao(features[index].talhao)}
        />
      </div>
    </div>
  )
}

function PluviometroManager({ fazendaId, talhoes, pluviometros, pluviometrosErro, onCreate, onUpdate, onDelete }) {
  const features = talhoes
    .map(talhao => ({ talhao, feature: normalizeFeature(talhao.geometria, talhao.codigo) }))
    .filter(item => item.feature)
  const [mode, setMode] = useState('idle')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState({ nome: 'Pluviometro 1', latitude: '', longitude: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const selected = pluviometros.find(item => item.id === selectedId) || null
  const placing = mode === 'create' || mode === 'edit-point'

  useEffect(() => {
    if (!selectedId && pluviometros[0]) setSelectedId(pluviometros[0].id)
  }, [pluviometros, selectedId])

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setError('')
    setDraft({ nome: `Pluviometro ${pluviometros.length + 1}`, latitude: '', longitude: '' })
  }

  function startRename() {
    if (!selected) return
    setMode('rename')
    setError('')
    setDraft({ nome: selected.nome, latitude: selected.latitude || '', longitude: selected.longitude || '' })
  }

  function startEditPoint() {
    if (!selected) return
    setMode('edit-point')
    setError('')
    setDraft({ nome: selected.nome, latitude: selected.latitude || '', longitude: selected.longitude || '' })
  }

  function handleMapPoint({ lng, lat }) {
    setDraft(current => ({ ...current, latitude: lat.toFixed(7), longitude: lng.toFixed(7) }))
  }

  function selectMarker(marker) {
    setSelectedId(marker.id)
    setMode('idle')
    setError('')
    setDraft({ nome: marker.nome, latitude: marker.latitude || '', longitude: marker.longitude || '' })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!draft.nome.trim()) {
      setError('Informe o nome do pluviometro.')
      return
    }
    if ((mode === 'create' || mode === 'edit-point') && (!draft.latitude || !draft.longitude)) {
      setError('Clique no mapa para posicionar o pluviometro.')
      return
    }
    setSaving(true)
    try {
      const talhao =
        draft.longitude && draft.latitude
          ? findTalhaoForCoord(talhoes, Number(draft.longitude), Number(draft.latitude))
          : null
      if (mode === 'create') {
        await onCreate({
          fazenda_id: fazendaId,
          nome: draft.nome.trim(),
          latitude: draft.latitude,
          longitude: draft.longitude,
          talhao_id: talhao?.id || null
        })
      } else if (selected) {
        await onUpdate(selected.id, {
          nome: draft.nome.trim(),
          latitude: draft.latitude,
          longitude: draft.longitude,
          talhao_id: talhao?.id || selected.talhao_id || null
        })
      }
      setMode('idle')
    } catch (err) {
      setError(err.message || 'Nao foi possivel salvar o pluviometro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected || !confirm('Desativar este pluviometro?')) return
    setSaving(true)
    setError('')
    try {
      await onDelete(selected.id)
      setSelectedId(null)
      setMode('idle')
    } catch (err) {
      setError(err.message || 'Nao foi possivel desativar o pluviometro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={pluviometerShellStyle}>
      <div style={pluviometerHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>PLUVIOMETROS</p>
          <h3 style={panelTitleStyle}>Mapa de pluviometros</h3>
          <p style={{ margin: '4px 0 0', color: C.textMid, fontSize: 12 }}>
            Registre o ponto georreferenciado para alimentar o mapa interpolado de chuvas.
          </p>
        </div>
        <span style={mapCounterStyle}>{pluviometros.length} ativos</span>
      </div>
      <div style={pluviometerMapStageStyle}>
        <SimpleFarmMap
          features={features.map(item => ({
            ...item.feature,
            properties: { ...item.feature.properties, codigo: item.talhao.codigo }
          }))}
          height={470}
          pluviometros={pluviometros}
          selectedMode="chuvas"
          placingPluviometro={placing}
          onMapPoint={handleMapPoint}
          onPluviometroClick={selectMarker}
        />
        <form onSubmit={handleSave} style={pluviometerEditorStyle}>
          <p style={sidebarEyebrowStyle}>Registrar pluviometro</p>
          <div style={pluviometerEditorActionsStyle}>
            <button
              type="button"
              onClick={startCreate}
              style={mode === 'create' ? primaryActionStyle : secondaryActionStyle}
            >
              Adicionar pluviometro
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={startRename}
              style={{ ...secondaryActionStyle, opacity: selected ? 1 : 0.45 }}
            >
              Renomear
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={startEditPoint}
              style={{ ...secondaryActionStyle, opacity: selected ? 1 : 0.45 }}
            >
              Editar ponto
            </button>
          </div>
          <label style={dateLabelStyle}>
            Nome
            <input
              value={draft.nome}
              onChange={e => setDraft(current => ({ ...current, nome: e.target.value }))}
              style={dateInputStyle}
            />
          </label>
          <div style={pluviometerCoordGridStyle}>
            <label style={dateLabelStyle}>
              Latitude
              <input
                value={draft.latitude}
                onChange={e => setDraft(current => ({ ...current, latitude: e.target.value }))}
                placeholder="-9.0000000"
                style={dateInputStyle}
              />
            </label>
            <label style={dateLabelStyle}>
              Longitude
              <input
                value={draft.longitude}
                onChange={e => setDraft(current => ({ ...current, longitude: e.target.value }))}
                placeholder="-40.0000000"
                style={dateInputStyle}
              />
            </label>
          </div>
          <p style={pluviometerHintStyle}>
            {placing
              ? 'Clique no mapa para marcar ou reposicionar o pluviometro.'
              : selected
                ? `Selecionado: ${selected.nome}`
                : 'Use adicionar pluviometro para marcar um novo ponto.'}
          </p>
          {(error || pluviometrosErro) && <div style={formErrorStyle}>{error || pluviometrosErro}</div>}
          <div style={pluviometerEditorFooterStyle}>
            <button
              type="submit"
              disabled={saving || mode === 'idle'}
              style={{ ...primaryActionStyle, opacity: saving || mode === 'idle' ? 0.55 : 1 }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              disabled={!selected || saving}
              onClick={handleDelete}
              style={{ ...dangerGhostButtonStyle, opacity: !selected || saving ? 0.45 : 1 }}
            >
              Desativar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GerencialView({
  fazenda,
  fazendaId,
  talhoes,
  pluviometros = [],
  pluviometrosErro = '',
  total,
  abrirTalhao,
  setShowNovo,
  onCreatePluviometro,
  onUpdatePluviometro,
  onDeletePluviometro,
  activeManager,
  setActiveManager,
  navigate
}) {
  const isManagerDesktop = useMediaQuery('(min-width: 900px)')
  const isManagerCompact = useMediaQuery('(max-width: 700px)')
  const managementMenu = [
    {
      id: 'talhoes',
      title: 'Cadastro de Talhao',
      short: 'Talhoes',
      text: 'Areas, culturas, fases e limites dos talhoes'
    },
    { id: 'pluviometros', title: 'Pluviometros', short: 'Chuva', text: 'Pontos georreferenciados e chuva interpolada' },
    { id: 'estoque', title: 'Estoque', short: 'Estoque', text: 'Saldos, entradas, saidas e estoque minimo' },
    { id: 'equipe', title: 'Equipe', short: 'Equipe', text: 'Tecnicos, operadores e responsaveis' },
    { id: 'insumos', title: 'Insumos', short: 'Insumos', text: 'Produtos, doses, custo medio e fornecedores' },
    { id: 'safras', title: 'Safras e Culturas', short: 'Safras', text: 'Ciclo agricola, variedades e metas' },
    { id: 'maquinas', title: 'Maquinas e Implementos', short: 'Maquinas', text: 'Frota, capacidade e custo hora' },
    {
      id: 'produtividade',
      title: 'Historico de Produtividade',
      short: 'Produtividade',
      text: 'Safras, rendimento e comparativos'
    },
    {
      id: 'configuracao',
      title: 'Configuracao da Fazenda',
      short: 'Config.',
      text: 'Nome, municipio, usuarios e preferencias'
    }
  ]
  const managementGroups = [
    { title: 'Campo', ids: ['talhoes', 'pluviometros', 'safras'] },
    { title: 'Operacao', ids: ['estoque', 'equipe', 'insumos', 'maquinas'] },
    { title: 'Gestao', ids: ['produtividade', 'configuracao'] }
  ].map(group => ({
    ...group,
    items: group.ids.map(itemId => managementMenu.find(item => item.id === itemId)).filter(Boolean)
  }))
  const activeItem = managementMenu.find(item => item.id === activeManager) || managementMenu[0]

  return (
    <section style={managementPageStyle}>
      <div style={isManagerCompact ? managementHeroCompactStyle : managementHeroStyle}>
        <p style={eyebrowStyle}>GESTAO OPERACIONAL</p>
        <h2 style={viewTitleStyle}>Gerenciamento da fazenda</h2>
        {!isManagerCompact && (
          <p style={viewSubtitleStyle}>
            Cadastros administrativos, mapas, equipe, estoque e configuracoes da propriedade.
          </p>
        )}
      </div>

      <div
        style={
          isManagerDesktop
            ? managementWorkspaceSingleStyle
            : isManagerCompact
              ? managementWorkspaceCompactStyle
              : managementWorkspaceMobileStyle
        }
      >
        {!isManagerDesktop && (
          <aside style={isManagerCompact ? managementNavRailCompactStyle : managementNavRailMobileStyle}>
            {managementGroups.map(group => (
              <div
                key={group.title}
                style={isManagerCompact ? managementNavGroupCompactStyle : managementNavGroupStyle}
              >
                {!isManagerCompact && <p style={desktopNavGroupTitleStyle}>{group.title.toUpperCase()}</p>}
                {group.items.map(item => {
                  const active = activeManager === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveManager(item.id)}
                      style={{
                        ...(isManagerCompact ? managementNavItemCompactStyle : managementNavItemStyle),
                        background: active ? C.greenLight : C.bg,
                        borderColor: active ? C.greenDp : C.border,
                        color: active ? C.textDk : C.textMid
                      }}
                    >
                      <strong style={isManagerCompact ? managementNavLabelCompactStyle : managementNavLabelStyle}>
                        {isManagerCompact ? item.short : item.title}
                      </strong>
                      {!isManagerCompact && <small style={managementNavHintStyle}>{item.text}</small>}
                    </button>
                  )
                })}
              </div>
            ))}
          </aside>
        )}

        <div style={managementModuleContentStyle}>
          {activeManager === 'talhoes' && (
            <MapaCadastroTalhoes
              talhoes={talhoes}
              total={total}
              onOpenCadastro={setShowNovo}
              onSelectTalhao={abrirTalhao}
            />
          )}

          {activeManager === 'pluviometros' && (
            <PluviometroManager
              fazendaId={fazendaId}
              talhoes={talhoes}
              pluviometros={pluviometros}
              pluviometrosErro={pluviometrosErro}
              onCreate={onCreatePluviometro}
              onUpdate={onUpdatePluviometro}
              onDelete={onDeletePluviometro}
            />
          )}

          {activeManager === 'configuracao' && (
            <ConfiguracaoFazendaPanel fazenda={fazenda} talhoes={talhoes} total={total} />
          )}

          {activeManager === 'safras' && <SafrasManager fazendaId={fazendaId} />}

          {activeManager === 'equipe' && <EquipeManager fazendaId={fazendaId} />}

          {activeManager === 'estoque' && <EstoqueManager fazendaId={fazendaId} navigate={navigate} />}

          {activeManager === 'insumos' && <InsumosShortcut navigate={navigate} />}

          {activeManager === 'maquinas' && <MaquinaManager fazendaId={fazendaId} />}

          {activeManager === 'produtividade' && <ProdutividadeManager fazendaId={fazendaId} talhoes={talhoes} />}

          {!['talhoes', 'pluviometros', 'configuracao', 'safras', 'equipe', 'estoque', 'insumos', 'maquinas', 'produtividade'].includes(
            activeManager
          ) && <ManagementModulePanel item={activeItem} />}
        </div>
      </div>
    </section>
  )
}
