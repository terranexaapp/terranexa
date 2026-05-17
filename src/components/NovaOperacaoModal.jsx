import { useEffect, useState } from 'react'
import { CATEGORIAS, getCategoriaInfo, criarOperacao, calcularCustoInsumo, listarSafras } from '../lib/operacoes'
import { listarInsumos } from '../lib/insumos'
import { listarCentrosCusto } from '../lib/centrosCusto'
import { theme } from '../styles/theme'

const C = theme.normal

export function NovaOperacaoModal({ talhao, fazendaId, onClose, onSaved }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    categoria: '',
    data_operacao: new Date().toISOString().split('T')[0],
    custo_aplicacao: '',
    observacoes: '',
    receituario_agronomo: '',
    receituario_crea: '',
    safra_id: '',
    centro_custo_id: ''
  })
  const [insumosUsados, setInsumosUsados] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [safras, setSafras] = useState([])
  const [centrosCusto, setCentrosCusto] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    listarInsumos(fazendaId).then(setCatalogo)
    listarSafras(fazendaId).then(setSafras)
    listarCentrosCusto(fazendaId).then(setCentrosCusto).catch(() => setCentrosCusto([]))
  }, [fazendaId])

  // Sugere CC padrão do primeiro insumo selecionado (se ainda não escolhido manualmente)
  useEffect(() => {
    if (form.centro_custo_id) return
    const first = insumosUsados[0]
    if (!first) return
    const insumo = catalogo.find(c => c.id === first.insumo_id)
    if (insumo?.centro_custo_padrao_id) {
      setForm(p => ({ ...p, centro_custo_id: insumo.centro_custo_padrao_id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insumosUsados.length, catalogo])

  function set(k, v) {
    setForm(p => ({ ...p, [k]: v }))
  }

  const custoInsumos = insumosUsados.reduce((s, i) => s + Number(i.custo_total || 0), 0)
  const custoTotal = custoInsumos + Number(form.custo_aplicacao || 0)
  const custoHa = talhao?.area_ha ? custoTotal / Number(talhao.area_ha) : 0
  const catInfo = form.categoria ? getCategoriaInfo(form.categoria) : null
  const precisaRec =
    form.categoria &&
    [
      'pre_emergente',
      'pos_emergente',
      'fungicida_terrestre',
      'fungicida_aereo',
      'inseticida_terrestre',
      'inseticida_aereo',
      'dessecacao_pre_plantio',
      'dessecacao_pre_colheita',
      'dessecacao_pos_colheita'
    ].includes(form.categoria)

  async function handleSalvar() {
    setErro('')
    if (!form.categoria) {
      setErro('Selecione a categoria')
      return
    }
    if (!form.data_operacao) {
      setErro('Informe a data')
      return
    }
    if (!form.centro_custo_id) {
      setErro('Selecione o centro de custo desta operação.')
      return
    }
    setSalvando(true)
    try {
      await criarOperacao({
        talhao_id: talhao.id,
        safra_id: form.safra_id || null,
        categoria: form.categoria,
        data_operacao: form.data_operacao,
        custo_aplicacao: Number(form.custo_aplicacao) || 0,
        observacoes: form.observacoes,
        receituario_agronomo: form.receituario_agronomo,
        receituario_crea: form.receituario_crea,
        centro_custo_id: form.centro_custo_id,
        insumos_usados: insumosUsados
      })
      onSaved()
    } catch (err) {
      setErro(err.message || 'Erro ao salvar')
      setSalvando(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 640,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '12px 18px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '2px' }}>
                NOVA OPERACAO
              </p>
              <h2
                style={{
                  margin: '2px 0 0',
                  fontSize: 17,
                  color: C.textDk,
                  fontWeight: 700,
                  fontFamily: 'Georgia, serif'
                }}
              >
                {talhao.codigo} — {talhao.cultura?.charAt(0).toUpperCase() + talhao.cultura?.slice(1)} ·{' '}
                {talhao.area_ha} ha
              </h2>
            </div>
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
          <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
            {[
              ['1', 'Categoria'],
              ['2', 'Detalhes'],
              ['3', 'Insumos']
            ].map(([n, l]) => (
              <button
                key={n}
                onClick={() => step > Number(n) && setStep(Number(n))}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: 'none',
                  background: 'none',
                  borderBottom: `2.5px solid ${step >= Number(n) ? C.greenDp : C.borderSoft}`,
                  color: step >= Number(n) ? C.greenDp : C.textDim,
                  fontSize: 10,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  cursor: step > Number(n) ? 'pointer' : 'default'
                }}
              >
                {n}. {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {step === 1 && (
            <div>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: C.textMid }}>Selecione o tipo de operacao:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      set('categoria', cat.id)
                      setStep(2)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${C.border}`,
                      background: form.categoria === cat.id ? cat.cor + '18' : C.bg,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.cor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.textDk }}>{cat.label}</span>
                    <span aria-hidden="true" style={{ marginLeft: 'auto', color: C.textMid, fontSize: 16 }}>
                      ›
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: catInfo?.cor + '18',
                  borderRadius: 10,
                  marginBottom: 14,
                  border: `1px solid ${catInfo?.cor}44`
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 3, background: catInfo?.cor }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textDk }}>{catInfo?.label}</span>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: C.textMid,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    cursor: 'pointer'
                  }}
                >
                  TROCAR
                </button>
              </div>
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
                  DATA *
                </label>
                <input
                  type="date"
                  required
                  value={form.data_operacao}
                  onChange={e => set('data_operacao', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bgSoft,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    color: C.textDk,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {safras.length > 0 && (
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
                    SAFRA
                  </label>
                  <select
                    value={form.safra_id}
                    onChange={e => set('safra_id', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: C.bgSoft,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      fontSize: 13,
                      color: C.textDk,
                      outline: 'none'
                    }}
                  >
                    <option value="">Sem safra</option>
                    {safras.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                        {s.ativa ? ' (ativa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                  CENTRO DE CUSTO *
                </label>
                <select
                  required
                  value={form.centro_custo_id}
                  onChange={e => set('centro_custo_id', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bgSoft,
                    border: `1px solid ${form.centro_custo_id ? C.border : C.amber}`,
                    borderRadius: 10,
                    fontSize: 13,
                    color: C.textDk,
                    outline: 'none'
                  }}
                >
                  <option value="">Selecione…</option>
                  {centrosCusto.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.codigo} · {cc.nome}
                    </option>
                  ))}
                </select>
                {centrosCusto.length === 0 && (
                  <p style={{ margin: '4px 0 0', color: C.amberDk, fontSize: 10 }}>
                    Nenhum CC cadastrado. Vá em Gerencial → Configurações da fazenda.
                  </p>
                )}
              </div>
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
                  CUSTO DE APLICACAO (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.custo_aplicacao}
                  onChange={e => set('custo_aplicacao', e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bgSoft,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    color: C.textDk,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {precisaRec && (
                <div
                  style={{
                    padding: '12px',
                    background: C.amberLight,
                    borderRadius: 12,
                    marginBottom: 12,
                    border: `1px solid ${C.amber}44`
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.amberDk,
                      fontFamily: 'monospace',
                      letterSpacing: '1px'
                    }}
                  >
                    RECEITUARIO AGRONOMICO
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                    <div>
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
                        AGRONOMO
                      </label>
                      <input
                        value={form.receituario_agronomo}
                        onChange={e => set('receituario_agronomo', e.target.value)}
                        placeholder="Eng. Agronomo..."
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: C.bg,
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                          fontSize: 13,
                          color: C.textDk,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
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
                        CREA
                      </label>
                      <input
                        value={form.receituario_crea}
                        onChange={e => set('receituario_crea', e.target.value)}
                        placeholder="CREA-PE 12345"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: C.bg,
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                          fontSize: 13,
                          color: C.textDk,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
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
                  OBSERVACOES
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={e => set('observacoes', e.target.value)}
                  placeholder="Condicoes do campo..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bgSoft,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    color: C.textDk,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>
              <button
                onClick={() => setStep(3)}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: C.greenDp,
                  color: C.bg,
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  cursor: 'pointer'
                }}
              >
                PROXIMO: INSUMOS →
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <SeletorInsumos
                catalogo={catalogo}
                areaHa={Number(talhao.area_ha)}
                insumosUsados={insumosUsados}
                setInsumosUsados={setInsumosUsados}
              />
              <div
                style={{
                  background: C.bgSoft,
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginTop: 12,
                  border: `1px solid ${C.borderSoft}`
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 9,
                    color: C.textDim,
                    fontFamily: 'monospace',
                    letterSpacing: '2px'
                  }}
                >
                  RESUMO DE CUSTO
                </p>
                {[
                  { l: 'Insumos', v: custoInsumos },
                  { l: 'Aplicacao', v: Number(form.custo_aplicacao || 0) }
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.textMid }}>{r.l}</span>
                    <span style={{ fontSize: 12, color: C.textDk, fontFamily: 'monospace' }}>R$ {r.v.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: C.border, margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textDk }}>Total</span>
                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        color: C.greenDp,
                        fontFamily: 'Georgia, serif'
                      }}
                    >
                      R$ {custoTotal.toFixed(2)}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>
                      R$ {custoHa.toFixed(2)}/ha
                    </p>
                  </div>
                </div>
              </div>
              {erro && (
                <div
                  style={{
                    background: C.redLight,
                    color: C.redDk,
                    borderRadius: 10,
                    padding: '10px 12px',
                    marginTop: 10,
                    fontSize: 12
                  }}
                >
                  {erro}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setStep(2)}
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
                  VOLTAR
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: salvando ? C.textDim : C.greenDp,
                    color: C.bg,
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    cursor: salvando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {salvando ? 'SALVANDO...' : 'SALVAR OPERACAO'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  )
}

function SeletorInsumos({ catalogo, areaHa, insumosUsados, setInsumosUsados }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)

  const filtrados = catalogo
    .filter(
      i =>
        (!busca || i.nome.toLowerCase().includes(busca.toLowerCase())) && !insumosUsados.find(u => u.insumo_id === i.id)
    )
    .slice(0, 8)

  function adicionar(insumo) {
    setInsumosUsados(prev => [
      ...prev,
      {
        insumo_id: insumo.id,
        nome: insumo.nome,
        classe: insumo.classe,
        unidade: insumo.unidade,
        custo_unitario: insumo.custo_unitario,
        carencia_dias: insumo.carencia_dias,
        dose: '',
        dose_unidade: insumo.unidade + '/ha',
        quantidade_total: 0,
        custo_total: 0
      }
    ])
    setBusca('')
    setAberto(false)
  }

  function atualizar(insumoId, patch) {
    setInsumosUsados(prev =>
      prev.map(i => {
        if (i.insumo_id !== insumoId) return i
        const u = { ...i, ...patch }
        if ('dose' in patch) {
          u.quantidade_total = Math.round(Number(u.dose) * areaHa * 1000) / 1000
          u.custo_total = Math.round(calcularCustoInsumo(u.custo_unitario, u.dose, areaHa) * 100) / 100
        }
        return u
      })
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, color: C.textDim, fontFamily: 'monospace', letterSpacing: '2px' }}>
          INSUMOS ({insumosUsados.length})
        </p>
        <button
          onClick={() => setAberto(!aberto)}
          style={{
            background: C.greenLight,
            border: `1px solid ${C.greenDp}44`,
            borderRadius: 8,
            padding: '5px 10px',
            color: C.greenDp,
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          + ADICIONAR
        </button>
      </div>
      {aberto && (
        <div
          style={{
            background: C.bgSoft,
            borderRadius: 12,
            padding: 10,
            marginBottom: 10,
            border: `1px solid ${C.border}`
          }}
        >
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar no catalogo..."
            autoFocus
            style={{
              width: '100%',
              padding: '9px 12px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 13,
              color: C.textDk,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 6
            }}
          />
          {filtrados.map(i => (
            <div
              key={i.id}
              onClick={() => adicionar(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                marginBottom: 2,
                background: C.bg,
                border: `1px solid ${C.borderSoft}`
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: C.textDk, flex: 1 }}>{i.nome}</p>
              <p style={{ margin: 0, fontSize: 10, color: C.textMid, fontFamily: 'monospace' }}>
                R$ {Number(i.custo_unitario).toFixed(2)}/{i.unidade}
              </p>
            </div>
          ))}
          {catalogo.length === 0 && (
            <p style={{ margin: 0, fontSize: 11, color: C.textDim, padding: '6px 4px' }}>
              Catalogo vazio. Acesse /insumos primeiro.
            </p>
          )}
        </div>
      )}
      {insumosUsados.length === 0 ? (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            background: C.bgSoft,
            borderRadius: 12,
            border: `1px dashed ${C.border}`
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: C.textDim }}>Nenhum insumo adicionado</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textVery }}>
            Operacoes sem insumos podem ser salvas normalmente
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {insumosUsados.map(i => (
            <div
              key={i.insumo_id}
              style={{ background: C.bg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${C.border}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textDk }}>{i.nome}</p>
                <button
                  onClick={() => setInsumosUsados(p => p.filter(x => x.insumo_id !== i.insumo_id))}
                  aria-label={`Remover ${i.nome}`}
                  style={{ background: 'none', border: 'none', color: C.red, fontSize: 16, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 8,
                      fontFamily: 'monospace',
                      letterSpacing: '1.5px',
                      color: C.textDim,
                      marginBottom: 3,
                      fontWeight: 700
                    }}
                  >
                    DOSE POR HA
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={i.dose}
                      onChange={e => atualizar(i.insumo_id, { dose: e.target.value })}
                      placeholder="0.000"
                      style={{
                        flex: 2,
                        padding: '8px',
                        background: C.bgSoft,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        fontSize: 13,
                        color: C.textDk,
                        outline: 'none'
                      }}
                    />
                    <input
                      value={i.dose_unidade}
                      onChange={e => atualizar(i.insumo_id, { dose_unidade: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        background: C.bgSoft,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        fontSize: 11,
                        color: C.textMid,
                        outline: 'none',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 8,
                      fontFamily: 'monospace',
                      letterSpacing: '1.5px',
                      color: C.textDim,
                      marginBottom: 3,
                      fontWeight: 700
                    }}
                  >
                    CUSTO CALCULADO
                  </label>
                  <div
                    style={{
                      padding: '8px 10px',
                      background: C.bgSoft,
                      borderRadius: 8,
                      border: `1px solid ${C.borderSoft}`
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.greenDp, fontFamily: 'monospace' }}>
                      R$ {Number(i.custo_total).toFixed(2)}
                    </p>
                    <p style={{ margin: 0, fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>
                      {Number(i.quantidade_total).toFixed(2)} {i.unidade} total
                    </p>
                  </div>
                </div>
              </div>
              {i.carencia_dias > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 9, color: C.amberDk, fontFamily: 'monospace' }}>
                  Carencia: {i.carencia_dias} dias
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
