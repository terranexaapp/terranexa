import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listarInsumos,
  criarInsumo,
  atualizarInsumo,
  desativarInsumo,
  atualizarEstoque,
  popularCatalogoBase,
  CLASSES_INSUMO,
  getClasseInfo,
  statusEstoqueInfo
} from '../lib/insumos'
import { listarFazendas } from '../lib/fazendas'
import { theme } from '../styles/theme'
import { ErrorPanel } from '../components/ErrorPanel'

const C = theme.normal

export function InsumosPage() {
  const navigate = useNavigate()
  const [fazendas, setFazendas] = useState([])
  const [fazendaId, setFazendaId] = useState(null)
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [popularizando, setPopularizando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroClasse, setFiltroClasse] = useState('todas')
  const [modal, setModal] = useState(null)
  const [insumoSel, setInsumoSel] = useState(null)

  useEffect(() => {
    listarFazendas().then(fs => {
      setFazendas(fs)
      if (fs.length > 0) setFazendaId(fs[0].id)
    })
  }, [])

  useEffect(() => {
    if (fazendaId) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId])

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      setInsumos(await listarInsumos(fazendaId))
    } catch (e) {
      console.error(e)
      setErro(e)
    } finally {
      setLoading(false)
    }
  }

  async function handlePopular() {
    if (!confirm('Adicionar ~40 insumos pre-cadastrados ao catalogo?')) return
    setPopularizando(true)
    try {
      const qtd = await popularCatalogoBase(fazendaId)
      await carregar()
      alert(qtd + ' insumos adicionados!')
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setPopularizando(false)
    }
  }

  async function handleExcluir(insumo) {
    if (!confirm('Excluir "' + insumo.nome + '"?')) return
    try {
      await desativarInsumo(insumo.id)
      await carregar()
    } catch (e) {
      alert('Erro: ' + e.message)
    }
  }

  const filtrados = useMemo(
    () =>
      insumos.filter(i => {
        const mb = !busca || i.nome.toLowerCase().includes(busca.toLowerCase())
        const mc = filtroClasse === 'todas' || i.classe === filtroClasse
        return mb && mc
      }),
    [insumos, busca, filtroClasse]
  )

  const agrupados = useMemo(() => {
    const g = {}
    filtrados.forEach(i => {
      if (!g[i.classe]) g[i.classe] = []
      g[i.classe].push(i)
    })
    return g
  }, [filtrados])

  const totalBaixo = insumos.filter(i => ['baixo', 'critico', 'vazio'].includes(i.estoque?.status)).length
  const valorEstoque = insumos.reduce(
    (s, i) => s + Number(i.estoque?.quantidade_atual || 0) * Number(i.custo_unitario || 0),
    0
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bgSoft }}>
      <header
        style={{
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: '14px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: C.bgLight,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: 36,
              height: 36,
              fontSize: 16,
              cursor: 'pointer',
              color: C.textDk
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '2px' }}>
              CATALOGO
            </p>
            <h1
              style={{
                margin: '2px 0 0',
                fontSize: 18,
                color: C.textDk,
                fontWeight: 700,
                fontFamily: 'Georgia, serif'
              }}
            >
              Insumos
            </h1>
          </div>
          {fazendas.length > 1 && (
            <select
              value={fazendaId || ''}
              onChange={e => setFazendaId(e.target.value)}
              style={{
                padding: '7px 10px',
                background: C.bgLight,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 12,
                color: C.textDk,
                cursor: 'pointer'
              }}
            >
              {fazendas.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setModal('novo')}
            style={{
              background: C.greenDp,
              color: C.bg,
              border: 'none',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + NOVO
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { l: 'PRODUTOS', v: String(insumos.length), c: C.greenDp },
            { l: 'ATENCAO', v: String(totalBaixo), c: totalBaixo > 0 ? C.red : C.textDim },
            { l: 'VALOR ESTOQUE', v: 'R$ ' + (valorEstoque / 1000).toFixed(1) + 'k', c: C.amber }
          ].map(s => (
            <div
              key={s.l}
              style={{ background: C.bg, borderRadius: 12, padding: '10px 12px', border: `1px solid ${C.border}` }}
            >
              <p style={{ margin: 0, fontSize: 8, color: C.textDim, fontFamily: 'monospace', letterSpacing: '1.5px' }}>
                {s.l}
              </p>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 20,
                  fontWeight: 700,
                  color: s.c,
                  fontFamily: 'Georgia, serif',
                  lineHeight: 1
                }}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>

        {insumos.length === 0 && !loading && (
          <div
            style={{
              background: C.greenLight,
              borderRadius: 14,
              padding: '20px 16px',
              marginBottom: 16,
              border: `1.5px solid ${C.greenDp}44`,
              display: 'flex',
              gap: 14,
              alignItems: 'center'
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textDk, fontFamily: 'Georgia, serif' }}>
                Catalogo vazio
              </p>
              <p style={{ margin: '4px 0 10px', fontSize: 12, color: C.textMid }}>
                Adicione o catalogo base com 40 insumos comuns do Nordeste, ou cadastre manualmente.
              </p>
              <button
                onClick={handlePopular}
                disabled={popularizando}
                style={{
                  background: C.greenDp,
                  color: C.bg,
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 14px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {popularizando ? 'ADICIONANDO...' : 'ADICIONAR CATALOGO BASE'}
              </button>
            </div>
          </div>
        )}

        {insumos.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar insumo..."
              style={{
                width: '100%',
                padding: '10px 14px',
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                fontSize: 13,
                color: C.textDk,
                outline: 'none',
                marginBottom: 8,
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
              <button onClick={() => setFiltroClasse('todas')} style={chip(filtroClasse === 'todas', C.textDk, C)}>
                Todas
              </button>
              {CLASSES_INSUMO.map(cl => (
                <button
                  key={cl.id}
                  onClick={() => setFiltroClasse(cl.id)}
                  style={chip(filtroClasse === cl.id, cl.cor, C)}
                >
                  {cl.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: C.textDim, textAlign: 'center', padding: 40, fontFamily: 'monospace', fontSize: 11 }}>
            CARREGANDO...
          </p>
        ) : erro ? (
          <ErrorPanel error={erro} onRetry={carregar} />
        ) : (
          Object.entries(agrupados).map(([classe, items]) => {
            const info = getClasseInfo(classe)
            return (
              <div key={classe} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: info.cor, flexShrink: 0 }} />
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      color: info.cor,
                      fontFamily: 'monospace',
                      letterSpacing: '2px'
                    }}
                  >
                    {info.label.toUpperCase()} ({items.length})
                  </p>
                  <div style={{ flex: 1, height: 1, background: C.borderSoft }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {items.map(insumo => (
                    <InsumoCard
                      key={insumo.id}
                      insumo={insumo}
                      onEditar={() => {
                        setInsumoSel(insumo)
                        setModal('editar')
                      }}
                      onEstoque={() => {
                        setInsumoSel(insumo)
                        setModal('estoque')
                      }}
                      onExcluir={() => handleExcluir(insumo)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}

        {insumos.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={handlePopular}
              disabled={popularizando}
              style={{
                background: C.bgLight,
                color: C.textMid,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '9px 16px',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {popularizando ? 'ADICIONANDO...' : 'ADICIONAR CATALOGO BASE'}
            </button>
          </div>
        )}
      </main>

      {modal === 'novo' && (
        <InsumoModal
          fazendaId={fazendaId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            carregar()
          }}
        />
      )}
      {modal === 'editar' && insumoSel && (
        <InsumoModal
          fazendaId={fazendaId}
          insumo={insumoSel}
          onClose={() => {
            setModal(null)
            setInsumoSel(null)
          }}
          onSaved={() => {
            setModal(null)
            setInsumoSel(null)
            carregar()
          }}
        />
      )}
      {modal === 'estoque' && insumoSel && (
        <EstoqueModal
          insumo={insumoSel}
          onClose={() => {
            setModal(null)
            setInsumoSel(null)
          }}
          onSaved={() => {
            setModal(null)
            setInsumoSel(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}

function InsumoCard({ insumo, onEditar, onEstoque, onExcluir }) {
  const info = getClasseInfo(insumo.classe)
  const est = insumo.estoque
  const st = statusEstoqueInfo(est?.status)
  const perc = est?.quantidade_inicial > 0 ? Math.min(100, (est.quantidade_atual / est.quantidade_inicial) * 100) : 0

  return (
    <div
      style={{
        background: C.bg,
        borderRadius: 12,
        padding: '11px 14px',
        border: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}
    >
      <div style={{ width: 8, height: 40, borderRadius: 4, background: info.cor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: C.textDk,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {insumo.nome}
          </p>
          {insumo.carencia_dias > 0 && (
            <span style={{ fontSize: 9, color: C.amberDk, fontFamily: 'monospace', flexShrink: 0 }}>
              {insumo.carencia_dias}d
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>
            R$ {Number(insumo.custo_unitario).toFixed(2)}/{insumo.unidade}
          </span>
          <span style={{ color: C.textVery }}>·</span>
          <span style={{ fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>
            {Number(est?.quantidade_atual || 0).toFixed(1)} {insumo.unidade}
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'monospace',
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 700,
              background: st.bg,
              color: st.cor
            }}
          >
            {st.label}
          </span>
        </div>
        {est?.quantidade_inicial > 0 && (
          <div style={{ background: C.border, borderRadius: 99, height: 3, marginTop: 5 }}>
            <div style={{ width: perc + '%', height: 3, borderRadius: 99, background: st.cor }} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onEstoque} style={btnAcao(C)}>
          EST
        </button>
        <button onClick={onEditar} style={btnAcao(C)}>
          EDI
        </button>
        <button onClick={onExcluir} style={{ ...btnAcao(C), color: C.red }}>
          X
        </button>
      </div>
    </div>
  )
}

function InsumoModal({ fazendaId, insumo, onClose, onSaved }) {
  const editando = !!insumo
  const [form, setForm] = useState({
    nome: insumo?.nome || '',
    classe: insumo?.classe || 'herbicida',
    unidade: insumo?.unidade || 'L',
    custo_unitario: insumo?.custo_unitario || '',
    carencia_dias: insumo?.carencia_dias || 0,
    fornecedor: insumo?.fornecedor || ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      if (editando) await atualizarInsumo(insumo.id, form)
      else await criarInsumo({ fazenda_id: fazendaId, ...form })
      onSaved()
    } catch (err) {
      setErro(err.message || 'Erro ao salvar')
      setLoading(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: C.bg, borderRadius: 18, padding: '22px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
            {editando ? 'Editar' : 'Novo'} Insumo
          </h2>
          <button
            onClick={onClose}
            style={{
              background: C.bgLight,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              fontSize: 16,
              cursor: 'pointer',
              color: C.textDk
            }}
          >
            X
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <F label="NOME *">
            <input
              required
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Roundup WG 720"
              style={inp}
            />
          </F>
          <F label="CLASSE *">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
              {CLASSES_INSUMO.map(cl => (
                <button
                  type="button"
                  key={cl.id}
                  onClick={() => setForm(p => ({ ...p, classe: cl.id }))}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: form.classe === cl.id ? cl.cor + '22' : C.bg,
                    border: `1.5px solid ${form.classe === cl.id ? cl.cor : C.border}`,
                    color: form.classe === cl.id ? cl.cor : C.textMid,
                    fontSize: 10,
                    fontFamily: 'monospace',
                    fontWeight: 700
                  }}
                >
                  {cl.label}
                </button>
              ))}
            </div>
          </F>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <F label="UNIDADE *">
              <select
                value={form.unidade}
                onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))}
                style={inp}
              >
                {['L', 'kg', 'g', 'mL', 'dose', 'un', 'sc', 't'].map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </F>
            <F label="CUSTO (R$)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.custo_unitario}
                onChange={e => setForm(p => ({ ...p, custo_unitario: e.target.value }))}
                placeholder="0.00"
                style={inp}
              />
            </F>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <F label="CARENCIA (dias)">
              <input
                type="number"
                min="0"
                value={form.carencia_dias}
                onChange={e => setForm(p => ({ ...p, carencia_dias: e.target.value }))}
                placeholder="0"
                style={inp}
              />
            </F>
            <F label="FORNECEDOR">
              <input
                value={form.fornecedor}
                onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))}
                placeholder="Agropecuaria..."
                style={inp}
              />
            </F>
          </div>
          {erro && (
            <div
              style={{
                background: C.redLight,
                color: C.redDk,
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 12,
                fontSize: 12
              }}
            >
              {erro}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: C.bgLight,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.textDk,
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '12px',
                background: loading ? C.textDim : C.greenDp,
                color: C.bg,
                border: 'none',
                borderRadius: 10,
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'SALVANDO...' : editando ? 'ATUALIZAR' : 'CADASTRAR'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  )
}

function EstoqueModal({ insumo, onClose, onSaved }) {
  const est = insumo.estoque
  const [form, setForm] = useState({
    quantidade_atual: est?.quantidade_atual || 0,
    quantidade_inicial: est?.quantidade_inicial || 0,
    quantidade_minima: est?.quantidade_minima || 0
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await atualizarEstoque(insumo.id, form)
      onSaved()
    } catch (err) {
      setErro(err.message || 'Erro')
      setLoading(false)
    }
  }

  const perc = form.quantidade_inicial > 0 ? Math.min(100, (form.quantidade_atual / form.quantidade_inicial) * 100) : 0
  const barCor = perc > 50 ? C.green : perc > 25 ? C.amber : C.red

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: C.bg, borderRadius: 18, padding: '22px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
            Estoque
          </h2>
          <button
            onClick={onClose}
            style={{
              background: C.bgLight,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              fontSize: 16,
              cursor: 'pointer',
              color: C.textDk
            }}
          >
            X
          </button>
        </div>
        <div style={{ padding: '10px 12px', background: C.bgLight, borderRadius: 10, marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDk }}>{insumo.nome}</p>
          <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>
            R$ {Number(insumo.custo_unitario).toFixed(2)}/{insumo.unidade}
          </p>
        </div>
        <div style={{ background: C.border, borderRadius: 99, height: 8, marginBottom: 4 }}>
          <div style={{ width: perc + '%', height: 8, borderRadius: 99, background: barCor }} />
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 10, color: C.textDim, fontFamily: 'monospace', textAlign: 'right' }}>
          {Number(form.quantidade_atual).toFixed(1)} / {Number(form.quantidade_inicial).toFixed(1)} {insumo.unidade} (
          {perc.toFixed(0)}%)
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              ['quantidade_atual', 'ATUAL'],
              ['quantidade_inicial', 'INICIAL'],
              ['quantidade_minima', 'MINIMO']
            ].map(([k, l]) => (
              <div key={k}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 8,
                    fontFamily: 'monospace',
                    letterSpacing: '1.5px',
                    color: C.textDim,
                    marginBottom: 4,
                    fontWeight: 700
                  }}
                >
                  {l}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form[k]}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ ...inp, textAlign: 'center', padding: '10px 8px' }}
                />
              </div>
            ))}
          </div>
          {erro && (
            <div
              style={{
                background: C.redLight,
                color: C.redDk,
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 12,
                fontSize: 12
              }}
            >
              {erro}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: C.bgLight,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.textDk,
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '12px',
                background: loading ? C.textDim : C.greenDp,
                color: C.bg,
                border: 'none',
                borderRadius: 10,
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'SALVANDO...' : 'ATUALIZAR'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480 }}>
        {children}
      </div>
    </div>
  )
}

function F({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 9,
          fontFamily: 'monospace',
          letterSpacing: '2px',
          color: C.textDim,
          marginBottom: 5,
          fontWeight: 700
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function chip(active, cor, C) {
  return {
    flexShrink: 0,
    padding: '5px 10px',
    borderRadius: 99,
    background: active ? cor + '22' : C.bg,
    color: active ? cor : C.textMid,
    border: `1px solid ${active ? cor : C.border}`,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  }
}

function btnAcao(C) {
  return {
    background: C.bgLight,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 700,
    color: C.textDk,
    letterSpacing: '1px'
  }
}

const inp = {
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
