import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  aprovarSolicitacao,
  atualizarPapelUsuarioFazenda,
  atualizarPermissoesPapelFazenda,
  atualizarContratoConta,
  buscarDossieSolicitacao,
  iniciarAnalise,
  listarCatalogoPragasCulturas,
  listarHierarquiaUsuariosFazendas,
  listarResumoContas,
  listarSolicitacoesLiberacao,
  listarUsuariosCadastrados,
  pedirDocumentos,
  rejeitarSolicitacao,
  salvarCulturasPraga,
  vincularUsuarioFazenda
} from '../lib/centralTerranexa'
import {
  FAZENDA_PAPEIS,
  FAZENDA_PERMISSAO_GROUPS,
  FAZENDA_PERMISSAO_LABELS,
  PROPRIETARIO_PAPEL,
  getFazendaPapelMeta,
  resumirPermissoes
} from '../lib/fazendaPapeis'
import { theme } from '../styles/theme'
import { Logo } from '../components/Logo'
import { ErrorPanel } from '../components/ErrorPanel'

const C = theme.normal

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  pendente_validacao: 'Pendente',
  em_analise: 'Em analise',
  aguardando_documentos: 'Aguardando docs',
  aprovado: 'Aprovado',
  aprovado_parcial: 'Aprovado parcial',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
  bloqueado_por_risco: 'Bloqueado'
}

const RISCO_LABEL = { baixo: 'Baixo', medio: 'Medio', alto: 'Alto' }
const HIERARQUIA_INICIAL = { proprietarios: [], fazendas: [], papeis: FAZENDA_PAPEIS, avisos: [] }
const AGRO_CATALOGO_INICIAL = { culturas: [], pragas: [], avisos: [] }
const FILTERS = [
  ['fila', 'Fila'],
  ['pendente_validacao', 'Pendentes'],
  ['em_analise', 'Em analise'],
  ['aguardando_documentos', 'Docs'],
  ['todas', 'Todas']
]

function formatHa(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function riskTone(risco) {
  if (risco === 'alto') return { color: C.redDk, background: C.redLight, borderColor: C.red }
  if (risco === 'medio') return { color: C.amberDk, background: C.amberLight, borderColor: C.amber }
  return { color: C.greenDp, background: C.greenLight, borderColor: C.greenDp }
}

function statusTone(status) {
  if (status === 'aprovado') return { color: C.greenDp, background: C.greenLight }
  if (status === 'rejeitado' || status === 'bloqueado_por_risco') return { color: C.redDk, background: C.redLight }
  if (status === 'aguardando_documentos') return { color: C.amberDk, background: C.amberLight }
  return { color: C.blue, background: C.blueLight }
}

function emptyContractDraft(conta) {
  return {
    plano_nome: conta?.plano_nome || 'Plano Comercial',
    hectares_contratados: conta?.hectares_contratados || 0,
    hectares_tolerancia: conta?.hectares_tolerancia || 0,
    controle_hectares_ativo: Boolean(conta?.controle_hectares_ativo),
    status: conta?.status || 'ativa'
  }
}

function buildPermissionsDraft(papeis) {
  return (papeis || []).reduce((acc, papel) => {
    acc[papel.papel] = { ...(papel.permissoes || {}) }
    return acc
  }, {})
}

export function CentralTerranexaPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [filter, setFilter] = useState('fila')
  const [solicitacoes, setSolicitacoes] = useState([])
  const [contas, setContas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [usuarioSearch, setUsuarioSearch] = useState('')
  const [hierarquia, setHierarquia] = useState(HIERARQUIA_INICIAL)
  const [hierarquiaSearch, setHierarquiaSearch] = useState('')
  const [linkDraft, setLinkDraft] = useState({ fazendaId: '', userId: '', email: '', papel: 'tecnico' })
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const [linkError, setLinkError] = useState('')
  const [permissionsDraft, setPermissionsDraft] = useState(buildPermissionsDraft(FAZENDA_PAPEIS))
  const [permissionSaving, setPermissionSaving] = useState('')
  const [permissionMessage, setPermissionMessage] = useState('')
  const [permissionError, setPermissionError] = useState('')
  const [agroCatalogo, setAgroCatalogo] = useState(AGRO_CATALOGO_INICIAL)
  const [agroSearch, setAgroSearch] = useState('')
  const [agroType, setAgroType] = useState('todos')
  const [agroCulture, setAgroCulture] = useState('todas')
  const [agroSavingId, setAgroSavingId] = useState('')
  const [agroMessage, setAgroMessage] = useState('')
  const [agroError, setAgroError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [dossie, setDossie] = useState({ evidencias: [], revisoes: [], eventos: [] })
  const [loading, setLoading] = useState(true)
  const [dossieLoading, setDossieLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [decisionNote, setDecisionNote] = useState('')
  const [contractDraft, setContractDraft] = useState(emptyContractDraft())

  const selected = useMemo(
    () => solicitacoes.find(item => item.id === selectedId) || solicitacoes[0] || null,
    [selectedId, solicitacoes]
  )

  const stats = useMemo(() => {
    const fila = solicitacoes.filter(item =>
      ['pendente_validacao', 'em_analise', 'aguardando_documentos'].includes(item.status)
    ).length
    const altoRisco = solicitacoes.filter(item => item.risco_nivel === 'alto').length
    const excedidas = contas.filter(conta => conta.status_uso === 'excedido').length
    const hectaresAtivos = contas.reduce((sum, conta) => sum + Number(conta.hectares_ativos || 0), 0)
    return { fila, altoRisco, excedidas, hectaresAtivos }
  }, [solicitacoes, contas])

  const usuariosFiltrados = useMemo(() => {
    const term = usuarioSearch.trim().toLowerCase()
    if (!term) return usuarios
    return usuarios.filter(usuario =>
      [usuario.nome, usuario.email, usuario.papel, usuario.id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    )
  }, [usuarioSearch, usuarios])

  const usuariosById = useMemo(
    () =>
      usuarios.reduce((acc, usuario) => {
        acc[usuario.id] = usuario
        return acc
      }, {}),
    [usuarios]
  )

  const hierarquiaFiltrada = useMemo(() => {
    const term = hierarquiaSearch.trim().toLowerCase()
    if (!term) return hierarquia.proprietarios

    return hierarquia.proprietarios
      .map(grupo => {
        const owner = grupo.proprietario || {}
        const ownerMatches = [owner.nome, owner.email, owner.papel, owner.id]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(term))
        const fazendas = ownerMatches
          ? grupo.fazendas
          : grupo.fazendas.filter(fazenda => {
              const farmMatches = [
                fazenda.nome,
                fazenda.municipio,
                fazenda.estado,
                fazenda.conta?.nome,
                fazenda.status_liberacao
              ]
                .filter(Boolean)
                .some(value => String(value).toLowerCase().includes(term))
              const memberMatches = fazenda.membros.some(membro =>
                [
                  membro.email,
                  membro.usuario?.nome,
                  membro.usuario?.email,
                  membro.papel,
                  membro.papelMeta?.label,
                  membro.status
                ]
                  .filter(Boolean)
                  .some(value => String(value).toLowerCase().includes(term))
              )
              return farmMatches || memberMatches
            })
        return { ...grupo, fazendas }
      })
      .filter(grupo => grupo.fazendas.length > 0)
  }, [hierarquia.proprietarios, hierarquiaSearch])

  const papeisDisponiveis = hierarquia.papeis?.length ? hierarquia.papeis : FAZENDA_PAPEIS

  const agroPragasFiltradas = useMemo(() => {
    const term = agroSearch.trim().toLowerCase()
    return (agroCatalogo.pragas || []).filter(praga => {
      const matchesType = agroType === 'todos' || praga.tipo === agroType
      const matchesCulture = agroCulture === 'todas' || praga.culturaIds?.includes(agroCulture)
      const matchesSearch =
        !term ||
        [praga.nome_comum, praga.nome_cientifico, praga.codigo, praga.tipo]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(term))
      return matchesType && matchesCulture && matchesSearch
    })
  }, [agroCatalogo.pragas, agroCulture, agroSearch, agroType])

  async function carregar({ keepSelection = true } = {}) {
    try {
      setLoading(true)
      setError(null)
      const [solicitacoesData, contasData, usuariosData, hierarquiaData, agroData] = await Promise.all([
        listarSolicitacoesLiberacao({ status: filter }),
        listarResumoContas(),
        listarUsuariosCadastrados(),
        listarHierarquiaUsuariosFazendas(),
        listarCatalogoPragasCulturas().catch(err => ({
          ...AGRO_CATALOGO_INICIAL,
          avisos: [err.message || 'Nao foi possivel carregar o catalogo agronomico.']
        }))
      ])
      setSolicitacoes(solicitacoesData)
      setContas(contasData)
      setUsuarios(usuariosData)
      setHierarquia(hierarquiaData)
      setPermissionsDraft(buildPermissionsDraft(hierarquiaData.papeis))
      setAgroCatalogo(agroData)
      setLinkDraft(draft => ({
        ...draft,
        fazendaId: hierarquiaData.fazendas.some(fazenda => fazenda.id === draft.fazendaId)
          ? draft.fazendaId
          : hierarquiaData.fazendas[0]?.id || ''
      }))
      if (!keepSelection || !solicitacoesData.some(item => item.id === selectedId)) {
        setSelectedId(solicitacoesData[0]?.id || null)
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar({ keepSelection: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    let active = true
    async function carregarDossie() {
      if (!selected) {
        setDossie({ evidencias: [], revisoes: [], eventos: [] })
        setContractDraft(emptyContractDraft())
        return
      }
      setDossieLoading(true)
      setActionError('')
      setDecisionNote('')
      setContractDraft(emptyContractDraft(selected.conta))
      try {
        const data = await buscarDossieSolicitacao(selected)
        if (active) setDossie(data)
      } catch (err) {
        if (active) setActionError(err.message || 'Nao foi possivel carregar o dossie.')
      } finally {
        if (active) setDossieLoading(false)
      }
    }
    carregarDossie()
    return () => {
      active = false
    }
  }, [selected])

  async function runAction(action) {
    if (!selected) return
    setSaving(true)
    setActionError('')
    try {
      const note = decisionNote.trim()
      if ((action === 'docs' || action === 'reject') && !note) {
        setActionError('Informe uma observacao para esta decisao.')
        setSaving(false)
        return
      }
      if (action === 'start') await iniciarAnalise(selected, profile.id)
      if (action === 'docs') await pedirDocumentos(selected, note, profile.id)
      if (action === 'reject') await rejeitarSolicitacao(selected, note, profile.id)
      if (action === 'approve') {
        await aprovarSolicitacao(selected, note || 'Liberacao aprovada pela Central TerraNexa.', profile.id)
      }
      await carregar()
    } catch (err) {
      setActionError(err.message || 'Nao foi possivel concluir a acao.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSalvarContrato(e) {
    e.preventDefault()
    if (!selected?.conta_id) return
    setSaving(true)
    setActionError('')
    try {
      await atualizarContratoConta(selected.conta_id, contractDraft, profile.id)
      await carregar()
    } catch (err) {
      setActionError(err.message || 'Nao foi possivel atualizar o contrato.')
    } finally {
      setSaving(false)
    }
  }

  function handleSelecionarUsuario(userId) {
    const usuario = usuariosById[userId]
    setLinkDraft(draft => ({
      ...draft,
      userId,
      email: usuario?.email || draft.email
    }))
  }

  async function handleVincularFazenda(e) {
    e.preventDefault()
    setLinkSaving(true)
    setLinkError('')
    setLinkMessage('')
    try {
      await vincularUsuarioFazenda({
        fazendaId: linkDraft.fazendaId,
        userId: linkDraft.userId || null,
        email: linkDraft.email,
        papel: linkDraft.papel,
        convidadoPor: profile.id
      })
      setLinkMessage('Vinculo atualizado com sucesso.')
      setLinkDraft(draft => ({ ...draft, userId: '', email: '' }))
      await carregar()
    } catch (err) {
      setLinkError(err.message || 'Nao foi possivel vincular o usuario a fazenda.')
    } finally {
      setLinkSaving(false)
    }
  }

  async function handleAlterarPapelVinculo(vinculo, papel) {
    if (papel === vinculo.papel) return
    setLinkError('')
    setLinkMessage('')
    try {
      await atualizarPapelUsuarioFazenda(vinculo.id, papel)
      setLinkMessage('Papel atualizado.')
      await carregar()
    } catch (err) {
      setLinkError(err.message || 'Nao foi possivel alterar o papel.')
    }
  }

  function handleTogglePermissao(papel, permissao) {
    setPermissionsDraft(draft => ({
      ...draft,
      [papel]: {
        ...(draft[papel] || {}),
        [permissao]: !Boolean(draft[papel]?.[permissao])
      }
    }))
  }

  function handleSetPermissoesGrupo(papel, keys, value) {
    setPermissionsDraft(draft => ({
      ...draft,
      [papel]: {
        ...(draft[papel] || {}),
        ...keys.reduce((acc, key) => {
          acc[key] = value
          return acc
        }, {})
      }
    }))
  }

  async function handleSalvarPermissoes(papel) {
    setPermissionSaving(papel.papel)
    setPermissionError('')
    setPermissionMessage('')
    try {
      await atualizarPermissoesPapelFazenda(papel.papel, permissionsDraft[papel.papel] || {})
      setPermissionMessage(`Permissoes de ${papel.label} salvas.`)
      await carregar()
    } catch (err) {
      setPermissionError(err.message || 'Nao foi possivel salvar as permissoes.')
    } finally {
      setPermissionSaving('')
    }
  }

  function handleToggleCulturaPraga(pragaId, culturaId) {
    setAgroCatalogo(catalogo => ({
      ...catalogo,
      pragas: catalogo.pragas.map(praga => {
        if (praga.id !== pragaId) return praga
        const current = new Set(praga.culturaIds || [])
        if (current.has(culturaId)) current.delete(culturaId)
        else current.add(culturaId)
        return { ...praga, culturaIds: [...current] }
      })
    }))
  }

  async function handleSalvarCulturasPraga(praga) {
    setAgroSavingId(praga.id)
    setAgroError('')
    setAgroMessage('')
    try {
      const totalFazendas = await salvarCulturasPraga({
        catalogoPragaId: praga.id,
        culturaIds: praga.culturaIds || []
      })
      setAgroMessage(`${praga.nome_comum} atualizado. ${Number(totalFazendas || 0)} fazendas sincronizadas.`)
      setAgroCatalogo(await listarCatalogoPragasCulturas())
    } catch (err) {
      setAgroError(err.message || 'Nao foi possivel salvar as culturas desta praga/doenca.')
    } finally {
      setAgroSavingId('')
    }
  }

  return (
    <div style={s.root}>
      <header style={s.topbar}>
        <div style={s.brand}>
          <Logo size={34} />
          <div>
            <p style={s.brandName}>
              Terra<span style={{ color: C.amber }}>Nexa</span>
            </p>
            <p style={s.brandMeta}>CENTRAL INTERNA</p>
          </div>
        </div>
        <div style={s.topActions}>
          <span style={s.userBadge}>{profile?.papel || 'interno'}</span>
          <button type="button" onClick={() => navigate('/')} style={s.secondaryBtn}>
            App produtor
          </button>
          <button type="button" onClick={signOut} style={s.ghostBtn}>
            Sair
          </button>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.pageTitleRow}>
          <div>
            <p style={s.eyebrow}>APROVACAO COMERCIAL</p>
            <h1 style={s.title}>Central TerraNexa</h1>
          </div>
          <button type="button" onClick={() => carregar()} disabled={loading} style={s.primaryBtn}>
            Atualizar
          </button>
        </div>

        <div className="tn-central-stats" style={s.statsGrid}>
          <Stat label="Fila ativa" value={stats.fila} />
          <Stat label="Alto risco" value={stats.altoRisco} tone="danger" />
          <Stat label="Contas excedidas" value={stats.excedidas} tone="warning" />
          <Stat label="Hectares ativos" value={formatHa(stats.hectaresAtivos)} />
        </div>

        {error ? (
          <ErrorPanel error={error} onRetry={() => carregar({ keepSelection: false })} />
        ) : (
          <div className="tn-central-workspace" style={s.workspace}>
            <section style={s.queuePane}>
              <div style={s.filterRow}>
                {FILTERS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    style={{
                      ...s.filterBtn,
                      borderColor: filter === key ? C.greenDp : C.border,
                      color: filter === key ? C.greenDp : C.textMid,
                      background: filter === key ? C.greenLight : C.bg
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loading ? (
                <p style={s.emptyText}>Carregando fila...</p>
              ) : solicitacoes.length === 0 ? (
                <p style={s.emptyText}>Nenhuma solicitacao nesta visao.</p>
              ) : (
                <div style={s.queueList}>
                  {solicitacoes.map(item => (
                    <QueueItem
                      key={item.id}
                      item={item}
                      active={selected?.id === item.id}
                      onClick={() => setSelectedId(item.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section style={s.detailPane}>
              {!selected ? (
                <p style={s.emptyText}>Selecione uma solicitacao.</p>
              ) : (
                <>
                  <DetailHeader solicitacao={selected} />
                  {actionError && <div style={s.errorBox}>{actionError}</div>}

                  <div className="tn-central-detail-grid" style={s.detailGrid}>
                    <InfoBlock
                      title="Conta"
                      rows={[
                        ['Nome', selected.conta?.nome || '-'],
                        ['Plano', selected.conta?.plano_nome || '-'],
                        ['Contrato', formatHa(selected.hectares_contratados_snapshot)],
                        ['Ativos', formatHa(selected.hectares_ativos_snapshot)],
                        ['Pos solicitacao', formatHa(selected.hectares_pos_solicitacao)]
                      ]}
                    />
                    <InfoBlock
                      title="Area"
                      rows={[
                        ['Fazenda', selected.fazenda?.nome || '-'],
                        ['Municipio', [selected.fazenda?.municipio, selected.fazenda?.estado].filter(Boolean).join(' / ') || '-'],
                        ['Talhao', selected.talhao?.codigo || selected.talhao?.nome || '-'],
                        ['Area solicitada', formatHa(selected.area_solicitada_ha)],
                        ['Criado em', formatDate(selected.created_at)]
                      ]}
                    />
                  </div>

                  <section style={s.actionSection}>
                    <label style={s.label} htmlFor="decision-note">
                      OBSERVACAO DA ANALISE
                    </label>
                    <textarea
                      id="decision-note"
                      value={decisionNote}
                      onChange={e => setDecisionNote(e.target.value)}
                      placeholder="Registre o motivo da decisao, documento pendente ou condicao comercial."
                      style={s.textarea}
                    />
                    <div style={s.actionRow}>
                      <button type="button" disabled={saving} onClick={() => runAction('start')} style={s.secondaryBtn}>
                        Iniciar analise
                      </button>
                      <button type="button" disabled={saving} onClick={() => runAction('docs')} style={s.warningBtn}>
                        Pedir documentos
                      </button>
                      <button type="button" disabled={saving} onClick={() => runAction('reject')} style={s.dangerBtn}>
                        Rejeitar
                      </button>
                      <button type="button" disabled={saving} onClick={() => runAction('approve')} style={s.primaryBtn}>
                        Aprovar
                      </button>
                    </div>
                  </section>

                  <form onSubmit={handleSalvarContrato} style={s.contractSection}>
                    <div style={s.contractHeader}>
                      <div>
                        <p style={s.eyebrow}>CONTRATO</p>
                        <h3 style={s.sectionTitle}>Limite comercial da conta</h3>
                      </div>
                      <label style={s.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={contractDraft.controle_hectares_ativo}
                          onChange={e =>
                            setContractDraft(draft => ({ ...draft, controle_hectares_ativo: e.target.checked }))
                          }
                        />
                        Controle ativo
                      </label>
                    </div>
                    <div className="tn-central-contract-grid" style={s.contractGrid}>
                      <Field label="Plano">
                        <input
                          value={contractDraft.plano_nome}
                          onChange={e => setContractDraft(draft => ({ ...draft, plano_nome: e.target.value }))}
                          style={s.input}
                        />
                      </Field>
                      <Field label="Hectares contratados">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={contractDraft.hectares_contratados}
                          onChange={e =>
                            setContractDraft(draft => ({ ...draft, hectares_contratados: e.target.value }))
                          }
                          style={s.input}
                        />
                      </Field>
                      <Field label="Tolerancia">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={contractDraft.hectares_tolerancia}
                          onChange={e =>
                            setContractDraft(draft => ({ ...draft, hectares_tolerancia: e.target.value }))
                          }
                          style={s.input}
                        />
                      </Field>
                    </div>
                    <button type="submit" disabled={saving} style={s.secondaryBtn}>
                      Salvar contrato
                    </button>
                  </form>

                  <Dossie dossie={dossie} loading={dossieLoading} />
                </>
              )}
            </section>
          </div>
        )}

        <section style={s.accountsSection}>
          <div style={s.accountsHeader}>
            <p style={s.eyebrow}>CONTAS</p>
            <span style={s.smallMeta}>{contas.length} contas</span>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <Th>Conta</Th>
                  <Th>Uso</Th>
                  <Th>Contrato</Th>
                  <Th>Disponivel</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {contas.slice(0, 12).map(conta => (
                  <tr key={conta.conta_id}>
                    <Td>{conta.nome}</Td>
                    <Td>{formatHa(conta.hectares_ativos)}</Td>
                    <Td>{formatHa(conta.hectares_liberados)}</Td>
                    <Td>{formatHa(conta.hectares_disponiveis)}</Td>
                    <Td>
                      <span style={{ ...s.badge, ...statusUsoTone(conta.status_uso) }}>{conta.status_uso}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <PermissionsMatrixSection
          papeis={papeisDisponiveis}
          draft={permissionsDraft}
          saving={permissionSaving}
          message={permissionMessage}
          error={permissionError}
          onToggle={handleTogglePermissao}
          onSetGroup={handleSetPermissoesGrupo}
          onSave={handleSalvarPermissoes}
        />

        <AgroCatalogSection
          catalogo={agroCatalogo}
          pragas={agroPragasFiltradas}
          search={agroSearch}
          type={agroType}
          culture={agroCulture}
          savingId={agroSavingId}
          message={agroMessage}
          error={agroError}
          onSearch={setAgroSearch}
          onType={setAgroType}
          onCulture={setAgroCulture}
          onToggleCulture={handleToggleCulturaPraga}
          onSave={handleSalvarCulturasPraga}
        />

        <section style={s.hierarchySection}>
          <div style={s.accountsHeader}>
            <div>
              <p style={s.eyebrow}>HIERARQUIA</p>
              <h2 style={s.usersTitle}>Usuarios por proprietario e fazenda</h2>
            </div>
            <span style={s.smallMeta}>
              {hierarquia.fazendas.length} fazendas / {hierarquia.proprietarios.length} proprietarios
            </span>
          </div>

          {hierarquia.avisos?.length > 0 && (
            <div style={s.warningBox}>
              {hierarquia.avisos.map(aviso => (
                <p key={aviso} style={{ margin: 0 }}>
                  {aviso}
                </p>
              ))}
            </div>
          )}

          <form className="tn-central-link-form" onSubmit={handleVincularFazenda} style={s.linkForm}>
            <Field label="Fazenda">
              <select
                value={linkDraft.fazendaId}
                onChange={e => setLinkDraft(draft => ({ ...draft, fazendaId: e.target.value }))}
                style={s.input}
              >
                <option value="">Selecione</option>
                {hierarquia.fazendas.map(fazenda => (
                  <option key={fazenda.id} value={fazenda.id}>
                    {fazenda.nome} {fazenda.proprietario?.nome ? `/ ${fazenda.proprietario.nome}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Usuario cadastrado">
              <select value={linkDraft.userId} onChange={e => handleSelecionarUsuario(e.target.value)} style={s.input}>
                <option value="">Informar e-mail manualmente</option>
                {usuarios.map(usuario => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nome || usuario.email} / {usuario.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={linkDraft.email}
                onChange={e => setLinkDraft(draft => ({ ...draft, email: e.target.value, userId: '' }))}
                placeholder="usuario@email.com"
                style={s.input}
              />
            </Field>
            <Field label="Hierarquia">
              <select
                value={linkDraft.papel}
                onChange={e => setLinkDraft(draft => ({ ...draft, papel: e.target.value }))}
                style={s.input}
              >
                {papeisDisponiveis.map(papel => (
                  <option key={papel.papel} value={papel.papel}>
                    {papel.label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" disabled={linkSaving} style={s.primaryBtn}>
              {linkSaving ? 'Vinculando...' : 'Vincular'}
            </button>
          </form>

          {(linkError || linkMessage) && (
            <div style={linkError ? s.errorBox : s.successBox}>{linkError || linkMessage}</div>
          )}

          <div style={s.userTools}>
            <input
              value={hierarquiaSearch}
              onChange={e => setHierarquiaSearch(e.target.value)}
              placeholder="Filtrar por proprietario, fazenda, conta, usuario ou papel"
              style={s.searchInput}
            />
          </div>

          <div style={s.ownerList}>
            {hierarquiaFiltrada.map(grupo => (
              <OwnerHierarchyCard
                key={grupo.id}
                grupo={grupo}
                papeis={papeisDisponiveis}
                onAlterarPapel={handleAlterarPapelVinculo}
              />
            ))}
            {hierarquiaFiltrada.length === 0 && <p style={s.emptyText}>Nenhum vinculo encontrado neste filtro.</p>}
          </div>
        </section>

        <section style={s.usersSection}>
          <div style={s.accountsHeader}>
            <div>
              <p style={s.eyebrow}>USUARIOS</p>
              <h2 style={s.usersTitle}>Cadastros de usuarios</h2>
            </div>
            <span style={s.smallMeta}>
              {usuariosFiltrados.length} de {usuarios.length} usuarios
            </span>
          </div>
          <div style={s.userTools}>
            <input
              value={usuarioSearch}
              onChange={e => setUsuarioSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, papel ou ID"
              style={s.searchInput}
            />
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <Th>Nome</Th>
                  <Th>E-mail</Th>
                  <Th>Papel</Th>
                  <Th>Contas vinculadas</Th>
                  <Th>Criado em</Th>
                  <Th>Atualizado</Th>
                  <Th>ID</Th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(usuario => (
                  <tr key={usuario.id}>
                    <Td>{usuario.nome || '-'}</Td>
                    <Td>{usuario.email || '-'}</Td>
                    <Td>
                      <span style={{ ...s.badge, ...userRoleTone(usuario.papel) }}>{usuario.papel || 'sem papel'}</span>
                    </Td>
                    <Td>
                      <UserAccounts vinculos={usuario.vinculos} />
                    </Td>
                    <Td>{formatDate(usuario.created_at)}</Td>
                    <Td>{formatDate(usuario.updated_at)}</Td>
                    <Td>
                      <code style={s.userId}>{usuario.id}</code>
                    </Td>
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <Td>Nenhum usuario encontrado.</Td>
                    <Td>-</Td>
                    <Td>-</Td>
                    <Td>-</Td>
                    <Td>-</Td>
                    <Td>-</Td>
                    <Td>-</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value, tone = 'default' }) {
  const color = tone === 'danger' ? C.redDk : tone === 'warning' ? C.amberDk : C.greenDp
  return (
    <div style={s.stat}>
      <span style={s.statLabel}>{label}</span>
      <strong style={{ ...s.statValue, color }}>{value}</strong>
    </div>
  )
}

function QueueItem({ item, active, onClick }) {
  const risk = riskTone(item.risco_nivel)
  const status = statusTone(item.status)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...s.queueItem,
        borderColor: active ? C.greenDp : C.border,
        background: active ? '#F7FBF1' : C.bg
      }}
    >
      <div style={s.queueTop}>
        <strong style={s.queueTitle}>{item.conta?.nome || 'Conta sem nome'}</strong>
        <span style={{ ...s.badge, ...risk }}>{RISCO_LABEL[item.risco_nivel] || item.risco_nivel}</span>
      </div>
      <span style={s.queueMeta}>
        {item.fazenda?.nome || 'Fazenda'} / {item.talhao?.codigo || item.tipo}
      </span>
      <div style={s.queueBottom}>
        <span style={{ ...s.badge, ...status }}>{STATUS_LABEL[item.status] || item.status}</span>
        <span style={s.queueArea}>{formatHa(item.area_solicitada_ha)}</span>
      </div>
    </button>
  )
}

function DetailHeader({ solicitacao }) {
  const risk = riskTone(solicitacao.risco_nivel)
  const status = statusTone(solicitacao.status)
  return (
    <div style={s.detailHeader}>
      <div>
        <p style={s.eyebrow}>{solicitacao.tipo.replaceAll('_', ' ').toUpperCase()}</p>
        <h2 style={s.detailTitle}>{solicitacao.conta?.nome || 'Conta em analise'}</h2>
        <p style={s.detailSub}>
          Solicitante: {solicitacao.criadoPor?.nome || solicitacao.criadoPor?.email || '-'} / {formatDate(solicitacao.created_at)}
        </p>
      </div>
      <div style={s.headerBadges}>
        <span style={{ ...s.badge, ...risk }}>{RISCO_LABEL[solicitacao.risco_nivel]}</span>
        <span style={{ ...s.badge, ...status }}>{STATUS_LABEL[solicitacao.status] || solicitacao.status}</span>
      </div>
    </div>
  )
}

function InfoBlock({ title, rows }) {
  return (
    <div style={s.infoBlock}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {rows.map(([label, value]) => (
        <div key={label} style={s.infoRow}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={s.field}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  )
}

function Dossie({ dossie, loading }) {
  return (
    <section style={s.dossieSection}>
      <div className="tn-central-dossie-grid" style={s.dossieGrid}>
        <Timeline title="Revisoes" rows={dossie.revisoes} loading={loading} empty="Sem revisoes." />
        <Timeline title="Auditoria" rows={dossie.eventos} loading={loading} empty="Sem eventos." eventMode />
        <Evidencias rows={dossie.evidencias} loading={loading} />
      </div>
    </section>
  )
}

function Timeline({ title, rows, loading, empty, eventMode = false }) {
  return (
    <div style={s.timelineBlock}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {loading ? (
        <p style={s.emptyText}>Carregando...</p>
      ) : rows.length === 0 ? (
        <p style={s.emptyText}>{empty}</p>
      ) : (
        rows.slice(0, 6).map(row => (
          <div key={row.id} style={s.timelineRow}>
            <strong>{eventMode ? row.evento : row.acao}</strong>
            <span>{eventMode ? JSON.stringify(row.payload || {}) : row.observacao || '-'}</span>
            <small>{formatDate(row.created_at)}</small>
          </div>
        ))
      )}
    </div>
  )
}

function Evidencias({ rows, loading }) {
  return (
    <div style={s.timelineBlock}>
      <h3 style={s.sectionTitle}>Evidencias</h3>
      {loading ? (
        <p style={s.emptyText}>Carregando...</p>
      ) : rows.length === 0 ? (
        <p style={s.emptyText}>Sem evidencias anexadas.</p>
      ) : (
        rows.slice(0, 6).map(row => (
          <div key={row.id} style={s.timelineRow}>
            <strong>{row.tipo_documento}</strong>
            <span>{row.descricao || row.arquivo_path || '-'}</span>
            <small>{formatDate(row.created_at)}</small>
          </div>
        ))
      )}
    </div>
  )
}

function Th({ children }) {
  return <th style={s.th}>{children}</th>
}

function Td({ children }) {
  return <td style={s.td}>{children}</td>
}

function PermissionsMatrixSection({ papeis, draft, saving, message, error, onToggle, onSetGroup, onSave }) {
  return (
    <section style={s.permissionsSection}>
      <div style={s.accountsHeader}>
        <div>
          <p style={s.eyebrow}>PERMISSOES</p>
          <h2 style={s.usersTitle}>Telas liberadas por tipo de usuario</h2>
        </div>
        <span style={s.smallMeta}>{papeis.length} hierarquias</span>
      </div>

      {(error || message) && <div style={error ? s.errorBox : s.successBox}>{error || message}</div>}

      <div className="tn-central-permissions-grid" style={s.permissionsGrid}>
        {papeis.map(papel => (
          <article key={papel.papel} style={s.permissionCard}>
            <div style={s.permissionCardHeader}>
              <div>
                <strong style={s.permissionRoleTitle}>{papel.label}</strong>
                <p style={s.permissionRoleMeta}>Nivel {papel.nivel_hierarquia} / {papel.resumo}</p>
              </div>
              <span style={{ ...s.roleBadge, ...farmRoleTone(papel.papel) }}>{papel.papel}</span>
            </div>

            {FAZENDA_PERMISSAO_GROUPS.map(group => (
              <div key={`${papel.papel}-${group.title}`} style={s.permissionGroup}>
                <div style={s.permissionGroupHeader}>
                  <span>{group.title}</span>
                  <div style={s.permissionMiniActions}>
                    <button type="button" onClick={() => onSetGroup(papel.papel, group.keys, true)} style={s.miniBtn}>
                      Tudo
                    </button>
                    <button type="button" onClick={() => onSetGroup(papel.papel, group.keys, false)} style={s.miniBtn}>
                      Nada
                    </button>
                  </div>
                </div>
                <div className="tn-central-permission-checks" style={s.permissionChecks}>
                  {group.keys.map(key => (
                    <label key={key} style={s.permissionCheck}>
                      <input
                        type="checkbox"
                        checked={Boolean(draft[papel.papel]?.[key])}
                        onChange={() => onToggle(papel.papel, key)}
                      />
                      <span>{FAZENDA_PERMISSAO_LABELS[key] || key}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={saving === papel.papel}
              onClick={() => onSave(papel)}
              style={s.secondaryBtn}
            >
              {saving === papel.papel ? 'Salvando...' : 'Salvar permissoes'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function AgroCatalogSection({
  catalogo,
  pragas,
  search,
  type,
  culture,
  savingId,
  message,
  error,
  onSearch,
  onType,
  onCulture,
  onToggleCulture,
  onSave
}) {
  const tipos = ['todos', ...new Set((catalogo.pragas || []).map(praga => praga.tipo).filter(Boolean))]
  return (
    <section style={s.agroSection}>
      <div style={s.accountsHeader}>
        <div>
          <p style={s.eyebrow}>CATALOGO AGRONOMICO</p>
          <h2 style={s.usersTitle}>Pragas e doencas por cultura</h2>
        </div>
        <span style={s.smallMeta}>
          {pragas.length} de {catalogo.pragas.length} itens
        </span>
      </div>

      {catalogo.avisos?.length > 0 && (
        <div style={s.warningBox}>
          {catalogo.avisos.map(aviso => (
            <p key={aviso} style={{ margin: 0 }}>
              {aviso}
            </p>
          ))}
        </div>
      )}

      {(error || message) && <div style={error ? s.errorBox : s.successBox}>{error || message}</div>}

      <div className="tn-central-agro-tools" style={s.agroTools}>
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar por nome, codigo ou nome cientifico"
          style={s.searchInput}
        />
        <select value={type} onChange={e => onType(e.target.value)} style={s.input}>
          {tipos.map(tipo => (
            <option key={tipo} value={tipo}>
              {tipo === 'todos' ? 'Todos os tipos' : agroTypeLabel(tipo)}
            </option>
          ))}
        </select>
        <select value={culture} onChange={e => onCulture(e.target.value)} style={s.input}>
          <option value="todas">Todas culturas</option>
          {catalogo.culturas.map(cultura => (
            <option key={cultura.id} value={cultura.id}>
              {cultura.nome}
            </option>
          ))}
        </select>
      </div>

      <div style={s.agroList}>
        {pragas.map(praga => (
          <article key={praga.id} style={s.agroRow}>
            <div style={s.agroRowHeader}>
              <div>
                <strong style={s.agroTitle}>{praga.nome_comum}</strong>
                <p style={s.agroMeta}>
                  {praga.nome_cientifico || 'Sem nome cientifico'} / {praga.codigo}
                </p>
              </div>
              <span style={{ ...s.badge, ...agroTypeTone(praga.tipo) }}>{agroTypeLabel(praga.tipo)}</span>
            </div>
            <div className="tn-central-culture-checks" style={s.cultureChecks}>
              {catalogo.culturas.map(cultura => (
                <label key={`${praga.id}-${cultura.id}`} style={s.cultureCheck}>
                  <input
                    type="checkbox"
                    checked={Boolean(praga.culturaIds?.includes(cultura.id))}
                    onChange={() => onToggleCulture(praga.id, cultura.id)}
                  />
                  <span>{cultura.nome}</span>
                </label>
              ))}
            </div>
            <div style={s.agroFooter}>
              <span style={s.smallMeta}>
                {praga.culturaIds?.length || 0} culturas direcionadas
              </span>
              <button
                type="button"
                disabled={savingId === praga.id}
                onClick={() => onSave(praga)}
                style={s.secondaryBtn}
              >
                {savingId === praga.id ? 'Salvando...' : 'Salvar culturas'}
              </button>
            </div>
          </article>
        ))}
        {pragas.length === 0 && <p style={s.emptyText}>Nenhum item encontrado neste filtro.</p>}
      </div>
    </section>
  )
}

function OwnerHierarchyCard({ grupo, papeis, onAlterarPapel }) {
  const owner = grupo.proprietario || {}
  return (
    <article style={s.ownerCard}>
      <div style={s.ownerHeader}>
        <div>
          <p style={s.eyebrow}>PROPRIETARIO</p>
          <h3 style={s.ownerTitle}>{owner.nome || owner.email || 'Sem proprietario definido'}</h3>
          <p style={s.ownerMeta}>{owner.email || owner.id || '-'}</p>
        </div>
        <div style={s.ownerStats}>
          <span style={s.ownerStat}>{formatHa(grupo.total_ha)}</span>
          <span style={s.ownerStat}>
            {grupo.fazendas.length} {grupo.fazendas.length === 1 ? 'fazenda' : 'fazendas'}
          </span>
          <span style={s.ownerStat}>
            {grupo.contas_total} {grupo.contas_total === 1 ? 'conta' : 'contas'}
          </span>
        </div>
      </div>
      <div style={s.farmList}>
        {grupo.fazendas.map(fazenda => (
          <FarmHierarchyBlock
            key={fazenda.id}
            fazenda={fazenda}
            papeis={papeis}
            onAlterarPapel={onAlterarPapel}
          />
        ))}
      </div>
    </article>
  )
}

function FarmHierarchyBlock({ fazenda, papeis, onAlterarPapel }) {
  const owner = fazenda.proprietario
  return (
    <div style={s.farmCard}>
      <div style={s.farmHeader}>
        <div>
          <strong style={s.farmTitle}>{fazenda.nome}</strong>
          <p style={s.farmMeta}>
            {[fazenda.municipio, fazenda.estado].filter(Boolean).join(' / ') || 'Sem localizacao'} /{' '}
            {formatHa(fazenda.area_total_ha)}
          </p>
        </div>
        <div style={s.farmTags}>
          <span style={s.accountPill}>{fazenda.conta?.nome || 'Sem conta'}</span>
          <span style={{ ...s.badge, ...statusUsoTone(fazenda.status_liberacao || 'ok') }}>
            {fazenda.status_liberacao || 'ativa'}
          </span>
        </div>
      </div>

      <div style={s.memberList}>
        <div style={s.memberRow}>
          <div style={s.memberIdentity}>
            <strong>{owner?.nome || owner?.email || 'Proprietario nao definido'}</strong>
            <span>{owner?.email || '-'}</span>
          </div>
          <span style={{ ...s.roleBadge, ...farmRoleTone('proprietario') }}>{PROPRIETARIO_PAPEL.label}</span>
          <RolePermissionChips papelMeta={PROPRIETARIO_PAPEL} />
        </div>

        {fazenda.membros.map(membro => (
          <MemberHierarchyRow
            key={membro.id}
            membro={membro}
            papeis={papeis}
            onAlterarPapel={onAlterarPapel}
          />
        ))}

        {fazenda.membros.length === 0 && (
          <p style={s.memberEmpty}>Nenhum usuario vinculado alem do proprietario.</p>
        )}
      </div>
    </div>
  )
}

function MemberHierarchyRow({ membro, papeis, onAlterarPapel }) {
  const usuario = membro.usuario || {}
  const papelMeta = membro.papelMeta || getFazendaPapelMeta(membro.papel)
  return (
    <div style={s.memberRow}>
      <div style={s.memberIdentity}>
        <strong>{usuario.nome || membro.email}</strong>
        <span>
          {membro.email} / {membro.status} / {formatDate(membro.aceito_em || membro.criado_em)}
        </span>
      </div>
      <select
        value={membro.papel}
        onChange={e => onAlterarPapel(membro, e.target.value)}
        style={{ ...s.roleSelect, ...farmRoleTone(membro.papel) }}
        aria-label="Alterar hierarquia"
      >
        {papeis.map(papel => (
          <option key={papel.papel} value={papel.papel}>
            {papel.label}
          </option>
        ))}
      </select>
      <RolePermissionChips papelMeta={papelMeta} />
    </div>
  )
}

function RolePermissionChips({ papelMeta }) {
  const labels = resumirPermissoes(papelMeta?.permissoes, 4)
  if (!labels.length) return <span style={s.smallMeta}>Sem permissoes ativas</span>
  return (
    <div style={s.permissionChips}>
      {labels.map(label => (
        <span key={label} style={s.permissionChip}>
          {label}
        </span>
      ))}
    </div>
  )
}

function UserAccounts({ vinculos }) {
  if (!vinculos?.length) return <span style={s.smallMeta}>Sem conta vinculada</span>
  return (
    <div style={s.userAccounts}>
      {vinculos.map(vinculo => (
        <span key={vinculo.id} style={s.accountPill}>
          {vinculo.conta?.nome || 'Conta'} / {vinculo.papel} / {vinculo.status}
        </span>
      ))}
    </div>
  )
}

function statusUsoTone(status) {
  if (['excedido', 'bloqueada', 'bloqueado', 'rejeitada'].includes(status)) return { color: C.redDk, background: C.redLight }
  if (['atencao', 'sem_contrato', 'pendente_validacao', 'rascunho'].includes(status)) {
    return { color: C.amberDk, background: C.amberLight }
  }
  return { color: C.greenDp, background: C.greenLight }
}

function userRoleTone(papel) {
  if (['terranexa_admin', 'comercial', 'suporte'].includes(papel)) {
    return { color: C.blue, background: C.blueLight }
  }
  if (['proprietario', 'admin'].includes(papel)) {
    return { color: C.greenDp, background: C.greenLight }
  }
  return { color: C.textMid, background: C.bgLight }
}

function farmRoleTone(papel) {
  if (papel === 'proprietario' || papel === 'gerente') return { color: C.greenDp, background: C.greenLight }
  if (papel === 'agronomo') return { color: C.blue, background: C.blueLight }
  if (papel === 'tecnico') return { color: C.amberDk, background: C.amberLight }
  if (papel === 'coordenador_equipe') return { color: C.textDk, background: C.bgLight }
  return { color: C.textMid, background: C.bgSoft }
}

function agroTypeLabel(tipo) {
  const labels = {
    praga: 'Praga',
    doenca: 'Doenca',
    daninha: 'Daninha',
    deficiencia: 'Deficiencia',
    outro: 'Outro'
  }
  return labels[tipo] || tipo || 'Outro'
}

function agroTypeTone(tipo) {
  if (tipo === 'praga') return { color: C.redDk, background: C.redLight }
  if (tipo === 'doenca') return { color: C.amberDk, background: C.amberLight }
  if (tipo === 'daninha') return { color: C.greenDp, background: C.greenLight }
  if (tipo === 'deficiencia') return { color: C.blue, background: C.blueLight }
  return { color: C.textMid, background: C.bgLight }
}

const s = {
  root: {
    minHeight: '100vh',
    background: '#F7FAF4',
    color: C.textDk,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  },
  topbar: {
    height: 64,
    padding: '0 24px',
    background: C.bg,
    borderBottom: `1px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    position: 'sticky',
    top: 0,
    zIndex: 20
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandName: { margin: 0, fontSize: 18, fontWeight: 900, color: C.greenDp, lineHeight: 1 },
  brandMeta: { margin: '3px 0 0', color: C.textDim, fontSize: 9, fontFamily: 'monospace', letterSpacing: '2px' },
  topActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  userBadge: {
    padding: '6px 9px',
    borderRadius: 8,
    background: C.bgLight,
    border: `1px solid ${C.border}`,
    color: C.textMid,
    fontSize: 11,
    fontFamily: 'monospace'
  },
  main: { maxWidth: 1320, margin: '0 auto', padding: '24px 20px 60px' },
  pageTitleRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18
  },
  eyebrow: { margin: 0, color: C.textDim, fontSize: 10, fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 900 },
  title: { margin: '4px 0 0', fontSize: 26, lineHeight: 1.15, color: C.textDk, fontWeight: 900 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 },
  stat: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' },
  statLabel: { display: 'block', color: C.textDim, fontSize: 11, marginBottom: 6 },
  statValue: { fontSize: 21, lineHeight: 1 },
  workspace: { display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 14, alignItems: 'start' },
  queuePane: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  filterBtn: {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer'
  },
  queueList: { display: 'grid', gap: 8, maxHeight: 720, overflow: 'auto', paddingRight: 2 },
  queueItem: {
    width: '100%',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: 12,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: 8,
    fontFamily: 'inherit'
  },
  queueTop: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  queueTitle: { color: C.textDk, fontSize: 13, lineHeight: 1.25 },
  queueMeta: { color: C.textMid, fontSize: 12 },
  queueBottom: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  queueArea: { color: C.textDk, fontSize: 12, fontWeight: 800 },
  badge: { borderRadius: 999, padding: '4px 8px', fontSize: 10, fontFamily: 'monospace', fontWeight: 900 },
  detailPane: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, minWidth: 0 },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    borderBottom: `1px solid ${C.borderSoft}`,
    paddingBottom: 14,
    marginBottom: 14
  },
  detailTitle: { margin: '4px 0', fontSize: 22, lineHeight: 1.2, color: C.textDk },
  detailSub: { margin: 0, color: C.textMid, fontSize: 12 },
  headerBadges: { display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
  infoBlock: { border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 12 },
  sectionTitle: { margin: '0 0 10px', color: C.textDk, fontSize: 14, fontWeight: 900 },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '7px 0',
    borderTop: `1px solid ${C.borderSoft}`,
    fontSize: 12,
    color: C.textMid
  },
  actionSection: { borderTop: `1px solid ${C.borderSoft}`, paddingTop: 14, marginBottom: 14 },
  label: { color: C.textDim, fontSize: 10, fontFamily: 'monospace', letterSpacing: '1.4px', fontWeight: 900 },
  textarea: {
    width: '100%',
    minHeight: 86,
    resize: 'vertical',
    marginTop: 6,
    padding: 10,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.textDk,
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 },
  primaryBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    background: C.greenDp,
    color: C.bg,
    fontWeight: 900,
    cursor: 'pointer'
  },
  secondaryBtn: {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '9px 13px',
    background: C.bg,
    color: C.textDk,
    fontWeight: 800,
    cursor: 'pointer'
  },
  ghostBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '9px 12px',
    background: C.bgLight,
    color: C.textMid,
    fontWeight: 800,
    cursor: 'pointer'
  },
  warningBtn: {
    border: `1px solid ${C.amber}`,
    borderRadius: 8,
    padding: '9px 13px',
    background: C.amberLight,
    color: C.amberDk,
    fontWeight: 900,
    cursor: 'pointer'
  },
  dangerBtn: {
    border: `1px solid ${C.red}`,
    borderRadius: 8,
    padding: '9px 13px',
    background: C.redLight,
    color: C.redDk,
    fontWeight: 900,
    cursor: 'pointer'
  },
  errorBox: {
    background: C.redLight,
    color: C.redDk,
    border: `1px solid ${C.red}`,
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 12,
    fontSize: 12
  },
  contractSection: { borderTop: `1px solid ${C.borderSoft}`, paddingTop: 14, marginBottom: 14 },
  contractHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 6, color: C.textMid, fontSize: 12, fontWeight: 800 },
  contractGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 },
  field: { display: 'grid', gap: 5 },
  input: {
    width: '100%',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '9px 10px',
    color: C.textDk,
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  dossieSection: { borderTop: `1px solid ${C.borderSoft}`, paddingTop: 14 },
  dossieGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  timelineBlock: { border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 12, minWidth: 0 },
  timelineRow: { display: 'grid', gap: 3, borderTop: `1px solid ${C.borderSoft}`, padding: '8px 0', fontSize: 12 },
  emptyText: { margin: 0, color: C.textDim, fontSize: 12, padding: 12 },
  accountsSection: { marginTop: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 },
  permissionsSection: { marginTop: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 },
  agroSection: { marginTop: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 },
  hierarchySection: { marginTop: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 },
  usersSection: { marginTop: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 },
  accountsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  usersTitle: { margin: '4px 0 0', color: C.textDk, fontSize: 17, fontWeight: 900 },
  userTools: { margin: '8px 0 12px' },
  warningBox: {
    background: C.amberLight,
    color: C.amberDk,
    border: `1px solid ${C.amber}`,
    borderRadius: 8,
    padding: '9px 12px',
    marginBottom: 10,
    fontSize: 12
  },
  successBox: {
    background: C.greenLight,
    color: C.greenDp,
    border: `1px solid ${C.greenDp}`,
    borderRadius: 8,
    padding: '10px 12px',
    margin: '10px 0',
    fontSize: 12
  },
  linkForm: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 1.3fr 1.2fr 0.9fr auto',
    gap: 10,
    alignItems: 'end',
    background: '#FBFCF8',
    border: `1px solid ${C.borderSoft}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  searchInput: {
    width: '100%',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: C.textDk,
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  permissionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  permissionCard: {
    display: 'grid',
    gap: 10,
    alignContent: 'start',
    border: `1px solid ${C.borderSoft}`,
    borderRadius: 8,
    padding: 12,
    background: '#FBFCF8',
    minWidth: 0
  },
  permissionCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 9,
    borderBottom: `1px solid ${C.borderSoft}`
  },
  permissionRoleTitle: { display: 'block', color: C.textDk, fontSize: 14, lineHeight: 1.2 },
  permissionRoleMeta: { margin: '3px 0 0', color: C.textMid, fontSize: 11, lineHeight: 1.35 },
  permissionGroup: { display: 'grid', gap: 7 },
  permissionGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    color: C.textDk,
    fontSize: 11,
    fontWeight: 900
  },
  permissionMiniActions: { display: 'flex', gap: 5, flexShrink: 0 },
  miniBtn: {
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    padding: '4px 7px',
    background: C.bg,
    color: C.textMid,
    fontSize: 10,
    fontWeight: 900,
    cursor: 'pointer'
  },
  permissionChecks: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 },
  permissionCheck: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    border: `1px solid ${C.borderSoft}`,
    borderRadius: 8,
    padding: '6px 7px',
    background: C.bg,
    color: C.textMid,
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.25
  },
  agroTools: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) minmax(160px, 0.7fr) minmax(160px, 0.8fr)', gap: 8, marginBottom: 10 },
  agroList: { display: 'grid', gap: 9 },
  agroRow: {
    border: `1px solid ${C.borderSoft}`,
    borderRadius: 8,
    padding: 12,
    background: '#FBFCF8',
    minWidth: 0
  },
  agroRowHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 9
  },
  agroTitle: { display: 'block', color: C.textDk, fontSize: 14, lineHeight: 1.2 },
  agroMeta: { margin: '3px 0 0', color: C.textMid, fontSize: 11, lineHeight: 1.35 },
  cultureChecks: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 },
  cultureCheck: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    border: `1px solid ${C.borderSoft}`,
    borderRadius: 8,
    padding: '6px 7px',
    background: C.bg,
    color: C.textMid,
    fontSize: 11,
    fontWeight: 800
  },
  agroFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingTop: 9,
    borderTop: `1px solid ${C.borderSoft}`
  },
  smallMeta: { color: C.textDim, fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', color: C.textDim, fontSize: 10, fontFamily: 'monospace', padding: '9px 8px', borderBottom: `1px solid ${C.border}` },
  td: { padding: '10px 8px', borderBottom: `1px solid ${C.borderSoft}`, color: C.textMid, whiteSpace: 'nowrap' },
  userId: { color: C.textDim, fontSize: 11 },
  ownerList: { display: 'grid', gap: 10 },
  ownerCard: { border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, background: C.bg },
  ownerHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 10,
    borderBottom: `1px solid ${C.borderSoft}`
  },
  ownerTitle: { margin: '4px 0', color: C.textDk, fontSize: 16, fontWeight: 900 },
  ownerMeta: { margin: 0, color: C.textMid, fontSize: 12 },
  ownerStats: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  ownerStat: {
    borderRadius: 999,
    padding: '5px 8px',
    background: C.greenLight,
    color: C.greenDp,
    fontSize: 11,
    fontWeight: 900
  },
  farmList: { display: 'grid', gap: 9, marginTop: 10 },
  farmCard: { border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 10, background: '#FBFCF8' },
  farmHeader: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 9 },
  farmTitle: { color: C.textDk, fontSize: 14 },
  farmMeta: { margin: '3px 0 0', color: C.textMid, fontSize: 12 },
  farmTags: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  memberList: { display: 'grid', gap: 6 },
  memberRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1fr) minmax(150px, auto) minmax(220px, 1.2fr)',
    gap: 8,
    alignItems: 'center',
    padding: '8px 9px',
    border: `1px solid ${C.borderSoft}`,
    borderRadius: 8,
    background: C.bg
  },
  memberIdentity: { display: 'grid', gap: 2, minWidth: 0, color: C.textDk, fontSize: 12 },
  roleBadge: { borderRadius: 8, padding: '6px 9px', fontSize: 11, fontWeight: 900, textAlign: 'center' },
  roleSelect: {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '6px 9px',
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  permissionChips: { display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' },
  permissionChip: {
    borderRadius: 999,
    padding: '4px 7px',
    background: C.bgLight,
    border: `1px solid ${C.borderSoft}`,
    color: C.textMid,
    fontSize: 10,
    fontWeight: 800
  },
  memberEmpty: { margin: 0, color: C.textDim, fontSize: 12, padding: '4px 2px' },
  userAccounts: { display: 'flex', gap: 5, flexWrap: 'wrap', minWidth: 220 },
  accountPill: {
    display: 'inline-block',
    borderRadius: 999,
    padding: '4px 8px',
    background: C.greenLight,
    color: C.greenDp,
    fontSize: 10,
    fontWeight: 800
  }
}

if (typeof document !== 'undefined' && !document.getElementById('tn-central-styles')) {
  const el = document.createElement('style')
  el.id = 'tn-central-styles'
  el.textContent = `
    @media (max-width: 980px) {
      .tn-central-workspace,
      .tn-central-link-form,
      .tn-central-permissions-grid,
      .tn-central-agro-tools { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 760px) {
      .tn-central-stats { grid-template-columns: 1fr 1fr !important; }
      .tn-central-detail-grid,
      .tn-central-contract-grid,
      .tn-central-dossie-grid { grid-template-columns: 1fr !important; }
      .tn-central-permission-checks,
      .tn-central-culture-checks { grid-template-columns: 1fr !important; }
    }
  `
  document.head.appendChild(el)
}
