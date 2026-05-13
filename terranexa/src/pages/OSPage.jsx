import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarOS, criarOS, fecharOS, cancelarOS, STATUS_OS, PRIORIDADE_OS } from '../lib/os'
import { listarFazendas } from '../lib/fazendas'
import { listarInsumos } from '../lib/insumos'
import { CATEGORIAS, getCategoriaInfo, calcularCustoInsumo } from '../lib/operacoes'
import { supabase } from '../lib/supabase'
import { theme } from '../styles/theme'

const C = theme.normal

export function OSPage() {
  const navigate = useNavigate()
  const [fazendas, setFazendas] = useState([])
  const [fazendaId, setFazendaId] = useState(null)
  const [talhoes, setTalhoes] = useState([])
  const [insumos, setInsumos] = useState([])
  const [osList, setOsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendente')
  const [modal, setModal] = useState(null)
  const [osSel, setOsSel] = useState(null)

  useEffect(() => {
    listarFazendas().then(fs => { setFazendas(fs); if (fs.length > 0) setFazendaId(fs[0].id) })
  }, [])

  useEffect(() => {
    if (!fazendaId) return
    carregar()
    supabase.from('talhoes').select('id, codigo, cultura, area_ha').eq('fazenda_id', fazendaId).eq('ativo', true).order('codigo').then(({ data }) => setTalhoes(data || []))
    listarInsumos(fazendaId).then(setInsumos)
  }, [fazendaId])

  async function carregar() {
    setLoading(true)
    try { setOsList(await listarOS(fazendaId)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleCancelar(os) {
    if (!confirm('Cancelar a ' + os.numero + '?')) return
    try { await cancelarOS(os.id); carregar() }
    catch (e) { alert('Erro: ' + e.message) }
  }

  const filtradas = useMemo(() => osList.filter(o => filtro === 'todas' || o.status === filtro), [osList, filtro])
  const counts = { pendente: osList.filter(o=>o.status==='pendente').length, concluida: osList.filter(o=>o.status==='concluida').length, cancelada: osList.filter(o=>o.status==='cancelada').length }

  return (
    <div style={{minHeight:'100vh',background:C.bgSoft}}>
      <header style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:'14px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>navigate('/')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:36,height:36,fontSize:16,cursor:'pointer',color:C.textDk}}>←</button>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>GESTAO</p>
            <h1 style={{margin:'2px 0 0',fontSize:18,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>Ordens de Servico</h1>
          </div>
          {fazendas.length>1 && <select value={fazendaId||''} onChange={e=>setFazendaId(e.target.value)} style={{padding:'7px 10px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.textDk}}>{fazendas.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select>}
          <button onClick={()=>setModal('nova')} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'9px 14px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVA OS</button>
        </div>
      </header>

      <main style={{maxWidth:900,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
          {[{l:'PENDENTES',v:counts.pendente,c:C.amber},{l:'CONCLUIDAS',v:counts.concluida,c:C.greenDp},{l:'CANCELADAS',v:counts.cancelada,c:C.textDim}].map(s=>(
            <div key={s.l} style={{background:C.bg,borderRadius:12,padding:'10px 12px',border:`1px solid ${C.border}`}}>
              <p style={{margin:0,fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'1.5px'}}>{s.l}</p>
              <p style={{margin:'3px 0 0',fontSize:22,fontWeight:700,color:s.c,fontFamily:'Georgia, serif',lineHeight:1}}>{s.v}</p>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:5,marginBottom:14}}>
          {[{id:'pendente',label:'Pendentes'},{id:'concluida',label:'Concluidas'},{id:'cancelada',label:'Canceladas'},{id:'todas',label:'Todas'}].map(f=>(
            <button key={f.id} onClick={()=>setFiltro(f.id)} style={{padding:'6px 12px',borderRadius:99,cursor:'pointer',background:filtro===f.id?C.greenDp:C.bg,color:filtro===f.id?C.bg:C.textMid,border:`1px solid ${filtro===f.id?C.greenDp:C.border}`,fontSize:10,fontFamily:'monospace',fontWeight:700,letterSpacing:'1px'}}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <p style={{color:C.textDim,textAlign:'center',padding:40,fontFamily:'monospace',fontSize:11}}>CARREGANDO...</p>
        ) : filtradas.length===0 ? (
          <div style={{background:C.bg,borderRadius:14,padding:'40px 20px',border:`1px dashed ${C.border}`,textAlign:'center'}}>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:C.textDk}}>{filtro==='pendente'?'Nenhuma OS pendente':'Nenhuma OS encontrada'}</p>
            <p style={{margin:'6px 0 16px',fontSize:12,color:C.textMid}}>{filtro==='pendente'?'Crie uma nova ordem de servico.':''}</p>
            {filtro==='pendente' && <button onClick={()=>setModal('nova')} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'10px 18px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVA OS</button>}
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filtradas.map(os=>(
              <OSCard key={os.id} os={os} onExecutar={()=>{setOsSel(os);setModal('executar')}} onCancelar={()=>handleCancelar(os)}/>
            ))}
          </div>
        )}
      </main>

      {modal==='nova' && <NovaOSModal fazendaId={fazendaId} talhoes={talhoes} insumos={insumos} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);carregar()}}/>}
      {modal==='executar' && osSel && <ExecutarOSModal os={osSel} onClose={()=>{setModal(null);setOsSel(null)}} onSaved={()=>{setModal(null);setOsSel(null);carregar()}}/>}
    </div>
  )
}

function OSCard({os, onExecutar, onCancelar}) {
  const [expanded, setExpanded] = useState(false)
  const st = STATUS_OS[os.status]
  const pr = PRIORIDADE_OS[os.prioridade]
  const cat = getCategoriaInfo(os.categoria)
  const t = os.talhao
  return (
    <div style={{background:C.bg,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color:C.textDim,fontFamily:'monospace'}}>{os.numero}</span>
            <span style={{fontSize:9,fontFamily:'monospace',padding:'2px 7px',borderRadius:99,fontWeight:700,background:st.bg,color:st.cor}}>{st.label.toUpperCase()}</span>
            <span style={{fontSize:9,fontFamily:'monospace',padding:'2px 7px',borderRadius:99,fontWeight:700,background:pr.cor+'18',color:pr.cor}}>{pr.label.toUpperCase()}</span>
          </div>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif'}}>{cat.label}</p>
          <div style={{display:'flex',gap:8,marginTop:3,flexWrap:'wrap'}}>
            <span style={{fontSize:10,color:C.textMid}}>{t?.codigo} — {t?.cultura?.charAt(0).toUpperCase()+t?.cultura?.slice(1)} · {Number(t?.area_ha||0).toFixed(0)} ha</span>
            {os.prazo && <><span style={{color:C.textVery}}>·</span><span style={{fontSize:10,color:C.textMid,fontFamily:'monospace'}}>Prazo: {os.prazo}</span></>}
            {os.criada_por?.nome && <><span style={{color:C.textVery}}>·</span><span style={{fontSize:10,color:C.textMid}}>Por: {os.criada_por.nome.split(' ')[0]}</span></>}
          </div>
          {os.os_insumos?.length>0 && <p style={{margin:'4px 0 0',fontSize:10,color:C.textDim}}>{os.os_insumos.length} insumo{os.os_insumos.length>1?'s':''} recomendado{os.os_insumos.length>1?'s':''}</p>}
        </div>
        <div style={{display:'flex',gap:5,flexShrink:0}}>
          {os.status==='pendente' && <>
            <button onClick={onExecutar} style={{background:C.greenDp,border:'none',borderRadius:8,padding:'7px 12px',color:C.bg,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer',letterSpacing:'1px'}}>EXECUTAR</button>
            <button onClick={onCancelar} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 10px',color:C.red,fontSize:12,cursor:'pointer'}}>X</button>
          </>}
          <button onClick={()=>setExpanded(!expanded)} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 10px',color:C.textMid,fontSize:12,cursor:'pointer'}}>{expanded?'▲':'▼'}</button>
        </div>
      </div>
      {expanded && os.os_insumos?.length>0 && (
        <div style={{padding:'0 14px 12px',borderTop:`1px solid ${C.borderSoft}`,background:C.bgSoft}}>
          <p style={{margin:'10px 0 6px',fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>{os.status==='concluida'?'INSUMOS EXECUTADOS':'INSUMOS RECOMENDADOS'}</p>
          {os.os_insumos.map(i=>(
            <div key={i.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 9px',background:C.bg,borderRadius:7,marginBottom:4,border:`1px solid ${C.borderSoft}`}}>
              <div style={{width:4,height:28,borderRadius:2,background:cat.cor,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:11,fontWeight:600,color:C.textDk}}>{i.insumo?.nome}</p>
                <p style={{margin:0,fontSize:9,color:C.textMid,fontFamily:'monospace'}}>
                  Rec: {i.dose_recomendada} {i.dose_unidade}
                  {os.status==='concluida'&&i.dose_real>0&&<span style={{color:C.greenDp}}> · Real: {i.dose_real} {i.dose_unidade}</span>}
                </p>
              </div>
              {os.status==='concluida'&&i.custo_real>0&&<p style={{margin:0,fontSize:11,fontWeight:700,color:cat.cor,fontFamily:'monospace'}}>R$ {Number(i.custo_real).toFixed(2)}</p>}
            </div>
          ))}
          {os.status==='concluida'&&os.observacoes_execucao&&(
            <div style={{marginTop:8,padding:'7px 9px',background:C.bg,borderRadius:7,border:`1px solid ${C.borderSoft}`}}>
              <p style={{margin:0,fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'1px'}}>OBSERVACOES EXECUCAO</p>
              <p style={{margin:'2px 0 0',fontSize:11,color:C.textMid}}>{os.observacoes_execucao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NovaOSModal({fazendaId, talhoes, insumos, onClose, onSaved}) {
  const [form, setForm] = useState({talhao_id:talhoes[0]?.id||'',categoria:'',prioridade:'media',prazo:'',observacoes:'',receituario_agronomo:'',receituario_crea:''})
  const [insumosRec, setInsumosRec] = useState([])
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [step, setStep] = useState(1)

  const talhaoSel = talhoes.find(t=>t.id===form.talhao_id)
  const areaHa = Number(talhaoSel?.area_ha||0)
  function set(k,v){setForm(p=>({...p,[k]:v}))}

  function adicionarInsumo(insumo) {
    setInsumosRec(prev=>[...prev,{insumo_id:insumo.id,nome:insumo.nome,unidade:insumo.unidade,custo_unitario:insumo.custo_unitario,carencia_dias:insumo.carencia_dias,dose_recomendada:'',dose_unidade:insumo.unidade+'/ha'}])
    setBusca('');setBuscaAberta(false)
  }

  async function handleSalvar() {
    setErro('')
    if (!form.talhao_id){setErro('Selecione o talhao');return}
    if (!form.categoria){setErro('Selecione a categoria');return}
    setSalvando(true)
    try {
      await criarOS({fazenda_id:fazendaId,talhao_id:form.talhao_id,categoria:form.categoria,prioridade:form.prioridade,prazo:form.prazo||null,observacoes:form.observacoes,receituario_agronomo:form.receituario_agronomo,receituario_crea:form.receituario_crea,insumos_recomendados:insumosRec.filter(i=>i.dose_recomendada>0).map(i=>({insumo_id:i.insumo_id,dose_recomendada:Number(i.dose_recomendada),dose_unidade:i.dose_unidade}))})
      onSaved()
    } catch(err){setErro(err.message||'Erro ao criar OS');setSalvando(false)}
  }

  const filtrados = insumos.filter(i=>(!busca||i.nome.toLowerCase().includes(busca.toLowerCase()))&&!insumosRec.find(r=>r.insumo_id===i.id)).slice(0,6)
  const catInfo = form.categoria?getCategoriaInfo(form.categoria):null
  const precisaRec = form.categoria&&['pre_emergente','pos_emergente','fungicida_terrestre','fungicida_aereo','inseticida_terrestre','inseticida_aereo','dessecacao_pre_plantio','dessecacao_pre_colheita','dessecacao_pos_colheita'].includes(form.categoria)

  return (
    <Overlay onClose={onClose}>
      <div style={{background:C.bg,borderRadius:18,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'16px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>ABRIR ORDEM DE SERVICO</p>
            <h2 style={{margin:'4px 0 0',fontSize:17,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{step===1?'Detalhes da OS':'Insumos Recomendados'}</h2>
          </div>
          <button onClick={onClose} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk}}>X</button>
        </div>
        <div style={{padding:'16px 18px'}}>
          {step===1 && (<>
            <F label="TALHAO *">
              <select required value={form.talhao_id} onChange={e=>set('talhao_id',e.target.value)} style={inp}>
                <option value="">Selecione...</option>
                {talhoes.map(t=><option key={t.id} value={t.id}>{t.codigo} — {t.cultura?.charAt(0).toUpperCase()+t.cultura?.slice(1)} · {Number(t.area_ha).toFixed(0)} ha</option>)}
              </select>
            </F>
            <F label="CATEGORIA *">
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {CATEGORIAS.map(cat=>(
                  <button type="button" key={cat.id} onClick={()=>set('categoria',cat.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,border:`1.5px solid ${form.categoria===cat.id?cat.cor:C.border}`,background:form.categoria===cat.id?cat.cor+'18':C.bg,cursor:'pointer',textAlign:'left'}}>
                    <div style={{width:8,height:8,borderRadius:2,background:cat.cor,flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:600,color:C.textDk}}>{cat.label}</span>
                    {form.categoria===cat.id&&<span style={{marginLeft:'auto',color:cat.cor}}>✓</span>}
                  </button>
                ))}
              </div>
            </F>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <F label="PRIORIDADE">
                <select value={form.prioridade} onChange={e=>set('prioridade',e.target.value)} style={inp}>
                  <option value="alta">Alta</option><option value="media">Media</option><option value="baixa">Baixa</option>
                </select>
              </F>
              <F label="PRAZO"><input type="date" value={form.prazo} onChange={e=>set('prazo',e.target.value)} style={inp}/></F>
            </div>
            {precisaRec&&(
              <div style={{padding:'12px',background:C.amberLight,borderRadius:12,marginBottom:12,border:`1px solid ${C.amber}44`}}>
                <p style={{margin:'0 0 8px',fontSize:10,fontWeight:700,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px'}}>RECEITUARIO AGRONOMICO</p>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8}}>
                  <F label="AGRONOMO"><input value={form.receituario_agronomo} onChange={e=>set('receituario_agronomo',e.target.value)} placeholder="Eng. Agronomo..." style={inp}/></F>
                  <F label="CREA"><input value={form.receituario_crea} onChange={e=>set('receituario_crea',e.target.value)} placeholder="CREA-PE 12345" style={inp}/></F>
                </div>
              </div>
            )}
            <F label="OBSERVACOES"><textarea value={form.observacoes} onChange={e=>set('observacoes',e.target.value)} placeholder="Instrucoes para o executor..." rows={2} style={{...inp,resize:'vertical'}}/></F>
            {erro&&<div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={onClose} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>CANCELAR</button>
              <button onClick={()=>{if(!form.categoria){setErro('Selecione a categoria');return};setErro('');setStep(2)}} style={{flex:2,padding:'12px',background:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>PROXIMO: INSUMOS →</button>
            </div>
          </>)}

          {step===2&&(<>
            {catInfo&&(
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:catInfo.cor+'18',borderRadius:10,marginBottom:14,border:`1px solid ${catInfo.cor}44`}}>
                <div style={{width:10,height:10,borderRadius:3,background:catInfo.cor}}/>
                <span style={{fontSize:12,fontWeight:700,color:C.textDk}}>{catInfo.label}</span>
                <span style={{fontSize:10,color:C.textMid,marginLeft:4}}>— {talhaoSel?.codigo} · {areaHa.toFixed(0)} ha</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <p style={{margin:0,fontSize:10,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>INSUMOS RECOMENDADOS</p>
              <button onClick={()=>setBuscaAberta(!buscaAberta)} style={{background:C.greenLight,border:`1px solid ${C.greenDp}44`,borderRadius:8,padding:'5px 10px',color:C.greenDp,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ ADICIONAR</button>
            </div>
            {buscaAberta&&(
              <div style={{background:C.bgSoft,borderRadius:12,padding:10,marginBottom:10,border:`1px solid ${C.border}`}}>
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar no catalogo..." autoFocus style={{width:'100%',padding:'9px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.textDk,outline:'none',boxSizing:'border-box',marginBottom:6}}/>
                {filtrados.map(i=>(
                  <div key={i.id} onClick={()=>adicionarInsumo(i)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:2,background:C.bg,border:`1px solid ${C.borderSoft}`}}>
                    <p style={{margin:0,fontSize:12,color:C.textDk,flex:1}}>{i.nome}</p>
                    <p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>R$ {Number(i.custo_unitario).toFixed(2)}/{i.unidade}</p>
                  </div>
                ))}
              </div>
            )}
            {insumosRec.length===0?(
              <div style={{padding:'20px',textAlign:'center',background:C.bgSoft,borderRadius:12,border:`1px dashed ${C.border}`,marginBottom:12}}>
                <p style={{margin:0,fontSize:12,color:C.textDim}}>Nenhum insumo adicionado</p>
                <p style={{margin:'4px 0 0',fontSize:11,color:C.textVery}}>OS pode ser criada sem insumos</p>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
                {insumosRec.map((i,idx)=>(
                  <div key={idx} style={{background:C.bg,borderRadius:10,padding:'10px 12px',border:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{i.nome}</p>
                      <button onClick={()=>setInsumosRec(p=>p.filter((_,n)=>n!==idx))} style={{background:'none',border:'none',color:C.red,fontSize:16,cursor:'pointer'}}>×</button>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <input type="number" step="0.001" min="0" value={i.dose_recomendada} onChange={e=>setInsumosRec(p=>p.map((x,n)=>n===idx?{...x,dose_recomendada:e.target.value}:x))} placeholder="Dose" style={{flex:2,padding:'8px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.textDk,outline:'none'}}/>
                      <input value={i.dose_unidade} onChange={e=>setInsumosRec(p=>p.map((x,n)=>n===idx?{...x,dose_unidade:e.target.value}:x))} style={{flex:1,padding:'8px 4px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11,color:C.textMid,outline:'none',textAlign:'center'}}/>
                      {areaHa>0&&i.dose_recomendada>0&&(
                        <div style={{flex:1,padding:'8px',background:C.bgSoft,borderRadius:8,border:`1px solid ${C.borderSoft}`,textAlign:'center'}}>
                          <p style={{margin:0,fontSize:10,color:C.greenDp,fontFamily:'monospace',fontWeight:700}}>R$ {calcularCustoInsumo(i.custo_unitario,i.dose_recomendada,areaHa).toFixed(0)}</p>
                        </div>
                      )}
                    </div>
                    {i.carencia_dias>0&&<p style={{margin:'4px 0 0',fontSize:9,color:C.amberDk,fontFamily:'monospace'}}>Carencia: {i.carencia_dias} dias</p>}
                  </div>
                ))}
              </div>
            )}
            {erro&&<div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setStep(1)} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>← VOLTAR</button>
              <button onClick={handleSalvar} disabled={salvando} style={{flex:2,padding:'12px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,letterSpacing:'2px',cursor:salvando?'not-allowed':'pointer'}}>{salvando?'CRIANDO...':'CRIAR OS'}</button>
            </div>
          </>)}
        </div>
      </div>
    </Overlay>
  )
}

function ExecutarOSModal({os, onClose, onSaved}) {
  const cat = getCategoriaInfo(os.categoria)
  const t = os.talhao
  const areaHa = Number(t?.area_ha||0)
  const [dataExecucao, setDataExecucao] = useState(new Date().toISOString().split('T')[0])
  const [custoAplicacao, setCustoAplicacao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [recAgronomo, setRecAgronomo] = useState(os.receituario_agronomo||'')
  const [recCrea, setRecCrea] = useState(os.receituario_crea||'')
  const [insumosReais, setInsumosReais] = useState(
    (os.os_insumos||[]).map(i=>({id:i.id,nome:i.insumo?.nome,unidade:i.insumo?.unidade,custo_unitario:i.insumo?.custo_unitario,carencia_dias:i.insumo?.carencia_dias,dose_recomendada:i.dose_recomendada,dose_unidade:i.dose_unidade,dose_real:i.dose_recomendada,quantidade_real:Math.round(Number(i.dose_recomendada)*areaHa*1000)/1000,custo_real:Math.round(calcularCustoInsumo(i.insumo?.custo_unitario,i.dose_recomendada,areaHa)*100)/100}))
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function atualizarReal(idx, patch) {
    setInsumosReais(prev=>prev.map((i,n)=>{
      if(n!==idx)return i
      const u={...i,...patch}
      if('dose_real' in patch){u.quantidade_real=Math.round(Number(u.dose_real)*areaHa*1000)/1000;u.custo_real=Math.round(calcularCustoInsumo(u.custo_unitario,u.dose_real,areaHa)*100)/100}
      return u
    }))
  }

  const custoInsumos = insumosReais.reduce((s,i)=>s+Number(i.custo_real||0),0)
  const custoTotal = custoInsumos + Number(custoAplicacao||0)
  const custoHa = areaHa>0?custoTotal/areaHa:0

  async function handleFechar() {
    setErro('');setSalvando(true)
    try {
      await fecharOS({os_id:os.id,data_execucao:dataExecucao,custo_aplicacao:Number(custoAplicacao)||0,observacoes,receituario_agronomo:recAgronomo,receituario_crea:recCrea,insumos_reais:insumosReais})
      onSaved()
    } catch(err){setErro(err.message||'Erro ao fechar OS');setSalvando(false)}
  }

  const precisaRec = ['pre_emergente','pos_emergente','fungicida_terrestre','fungicida_aereo','inseticida_terrestre','inseticida_aereo','dessecacao_pre_plantio','dessecacao_pre_colheita','dessecacao_pos_colheita'].includes(os.categoria)

  return (
    <Overlay onClose={onClose}>
      <div style={{background:C.bg,borderRadius:18,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`,background:cat.cor+'0D',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <p style={{margin:0,fontSize:10,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>EXECUTAR {os.numero}</p>
            <h2 style={{margin:'4px 0 2px',fontSize:16,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{cat.label}</h2>
            <p style={{margin:0,fontSize:11,color:C.textMid}}>{t?.codigo} — {t?.cultura?.charAt(0).toUpperCase()+t?.cultura?.slice(1)} · {areaHa.toFixed(0)} ha</p>
          </div>
          <button onClick={onClose} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk}}>X</button>
        </div>
        <div style={{padding:'16px 18px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <F label="DATA DE EXECUCAO *"><input type="date" required value={dataExecucao} onChange={e=>setDataExecucao(e.target.value)} style={inp}/></F>
            <F label="CUSTO DE APLICACAO (R$)"><input type="number" step="0.01" min="0" value={custoAplicacao} onChange={e=>setCustoAplicacao(e.target.value)} placeholder="0.00" style={inp}/></F>
          </div>
          {(os.receituario_agronomo||precisaRec)&&(
            <div style={{padding:'10px 12px',background:C.amberLight,borderRadius:10,marginBottom:12,border:`1px solid ${C.amber}44`}}>
              <p style={{margin:'0 0 8px',fontSize:9,fontWeight:700,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px'}}>RECEITUARIO</p>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8}}>
                <F label="AGRONOMO"><input value={recAgronomo} onChange={e=>setRecAgronomo(e.target.value)} placeholder="Eng. Agronomo..." style={inp}/></F>
                <F label="CREA"><input value={recCrea} onChange={e=>setRecCrea(e.target.value)} placeholder="CREA-PE 12345" style={inp}/></F>
              </div>
            </div>
          )}
          {insumosReais.length>0&&(<>
            <p style={{margin:'0 0 4px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>CONFIRMAR INSUMOS REAIS</p>
            <p style={{margin:'0 0 10px',fontSize:11,color:C.textMid}}>Ajuste se diferente do recomendado:</p>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
              {insumosReais.map((i,idx)=>(
                <div key={i.id} style={{background:C.bgSoft,borderRadius:10,padding:'10px 12px',border:`1px solid ${C.borderSoft}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{i.nome}</p>
                    <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace'}}>Rec: {i.dose_recomendada} {i.dose_unidade}</p>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={{display:'block',fontSize:8,fontFamily:'monospace',letterSpacing:'1.5px',color:C.textDim,marginBottom:3,fontWeight:700}}>DOSE REAL</label>
                      <div style={{display:'flex',gap:4}}>
                        <input type="number" step="0.001" min="0" value={i.dose_real} onChange={e=>atualizarReal(idx,{dose_real:e.target.value})} style={{flex:2,padding:'8px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.textDk,outline:'none'}}/>
                        <div style={{flex:1,padding:'8px 4px',background:C.bg,borderRadius:8,border:`1px solid ${C.borderSoft}`,textAlign:'center',fontSize:10,color:C.textMid,display:'flex',alignItems:'center',justifyContent:'center'}}>{i.dose_unidade}</div>
                      </div>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:8,fontFamily:'monospace',letterSpacing:'1.5px',color:C.textDim,marginBottom:3,fontWeight:700}}>CUSTO CALCULADO</label>
                      <div style={{padding:'8px 10px',background:C.bg,borderRadius:8,border:`1px solid ${C.borderSoft}`}}>
                        <p style={{margin:0,fontSize:12,fontWeight:700,color:C.greenDp,fontFamily:'monospace'}}>R$ {Number(i.custo_real).toFixed(2)}</p>
                        <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace'}}>{Number(i.quantidade_real).toFixed(2)} {i.unidade} total</p>
                      </div>
                    </div>
                  </div>
                  {i.carencia_dias>0&&<p style={{margin:'4px 0 0',fontSize:9,color:C.amberDk,fontFamily:'monospace'}}>Carencia: {i.carencia_dias} dias apos aplicacao</p>}
                </div>
              ))}
            </div>
          </>)}
          <F label="OBSERVACOES DA EXECUCAO">
            <textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Como foi a execucao..." rows={2} style={{...inp,resize:'vertical'}}/>
          </F>
          <div style={{background:C.bgSoft,borderRadius:12,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.borderSoft}`}}>
            <p style={{margin:'0 0 8px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>RESUMO DO CUSTO REAL</p>
            {[{l:'Insumos',v:custoInsumos},{l:'Aplicacao',v:Number(custoAplicacao||0)}].map(r=>(
              <div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:12,color:C.textMid}}>{r.l}</span>
                <span style={{fontSize:12,color:C.textDk,fontFamily:'monospace'}}>R$ {r.v.toFixed(2)}</span>
              </div>
            ))}
            <div style={{height:1,background:C.border,margin:'8px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
              <span style={{fontSize:13,fontWeight:700,color:C.textDk}}>Total Real</span>
              <div style={{textAlign:'right'}}>
                <p style={{margin:0,fontSize:16,fontWeight:700,color:C.greenDp,fontFamily:'Georgia, serif'}}>R$ {custoTotal.toFixed(2)}</p>
                <p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>R$ {custoHa.toFixed(2)}/ha</p>
              </div>
            </div>
          </div>
          {erro&&<div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>CANCELAR</button>
            <button onClick={handleFechar} disabled={salvando} style={{flex:2,padding:'12px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,letterSpacing:'1.5px',cursor:salvando?'not-allowed':'pointer'}}>{salvando?'FECHANDO...':'FECHAR OS + REGISTRAR'}</button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

function Overlay({children, onClose}) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:520}}>{children}</div>
    </div>
  )
}

function F({label, children}) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>{label}</label>
      {children}
    </div>
  )
}

const inp = {width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none',boxSizing:'border-box'}
