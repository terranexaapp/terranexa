import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarOS, criarOS, fecharOSCompleta, cancelarOS, OPERACOES_MAE, getOperacaoMae, STATUS_OS, PRIORIDADE_OS, BICOS_COMUNS } from '../lib/os'
import { listarFazendas } from '../lib/fazendas'
import { listarInsumos } from '../lib/insumos'
import { listarEquipes, criarEquipe, desativarEquipe } from '../lib/equipes'
import { calcularCustoInsumo } from '../lib/operacoes'
import { supabase } from '../lib/supabase'
import { theme } from '../styles/theme'

const C = theme.normal

export function OSPage() {
  const navigate = useNavigate()
  const [fazendas, setFazendas] = useState([])
  const [fazendaId, setFazendaId] = useState(null)
  const [talhoes, setTalhoes] = useState([])
  const [insumos, setInsumos] = useState([])
  const [equipes, setEquipes] = useState([])
  const [osList, setOsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendente')
  const [modal, setModal] = useState(null)
  const [osSel, setOsSel] = useState(null)

  useEffect(() => { listarFazendas().then(fs => { setFazendas(fs); if (fs.length > 0) setFazendaId(fs[0].id) }) }, [])

  useEffect(() => {
    if (!fazendaId) return
    carregar()
    supabase.from('talhoes').select('id, codigo, cultura, area_ha').eq('fazenda_id', fazendaId).eq('ativo', true).order('codigo').then(({ data }) => setTalhoes(data || []))
    listarInsumos(fazendaId).then(setInsumos)
    listarEquipes(fazendaId).then(setEquipes)
  }, [fazendaId])

  async function carregar() {
    setLoading(true)
    try { setOsList(await listarOS(fazendaId)) } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleCancelar(os) {
    if (!confirm('Cancelar a ' + os.numero + '?')) return
    try { await cancelarOS(os.id); carregar() } catch (e) { alert('Erro: ' + e.message) }
  }

  const filtradas = useMemo(() => osList.filter(o => filtro === 'todas' || o.status === filtro), [osList, filtro])
  const counts = { pendente: osList.filter(o => o.status==='pendente').length, concluida: osList.filter(o => o.status==='concluida').length, cancelada: osList.filter(o => o.status==='cancelada').length }

  return (
    <div style={{minHeight:'100vh',background:C.bgSoft}}>
      <header style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:'14px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>navigate('/')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:36,height:36,fontSize:16,cursor:'pointer',color:C.textDk}}>←</button>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>GESTÃO</p>
            <h1 style={{margin:'2px 0 0',fontSize:18,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>Ordens de Serviço</h1>
          </div>
          {fazendas.length>1 && <select value={fazendaId||''} onChange={e=>setFazendaId(e.target.value)} style={{padding:'7px 10px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.textDk}}>{fazendas.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select>}
          <button onClick={()=>setModal('equipes')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,padding:'8px 12px',color:C.textDk,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>EQUIPES</button>
          <button onClick={()=>setModal('nova')} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'9px 14px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVA ORDEM</button>
        </div>
      </header>
      <main style={{maxWidth:900,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
          {[{l:'PENDENTES',v:counts.pendente,c:C.amber},{l:'CONCLUÍDAS',v:counts.concluida,c:C.greenDp},{l:'CANCELADAS',v:counts.cancelada,c:C.textDim}].map(s=>(
            <div key={s.l} style={{background:C.bg,borderRadius:12,padding:'10px 12px',border:`1px solid ${C.border}`}}>
              <p style={{margin:0,fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'1.5px'}}>{s.l}</p>
              <p style={{margin:'3px 0 0',fontSize:22,fontWeight:700,color:s.c,fontFamily:'Georgia, serif',lineHeight:1}}>{s.v}</p>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:5,marginBottom:14}}>
          {[{id:'pendente',label:'Pendentes'},{id:'concluida',label:'Concluídas'},{id:'cancelada',label:'Canceladas'},{id:'todas',label:'Todas'}].map(f=>(
            <button key={f.id} onClick={()=>setFiltro(f.id)} style={{padding:'6px 12px',borderRadius:99,cursor:'pointer',background:filtro===f.id?C.greenDp:C.bg,color:filtro===f.id?C.bg:C.textMid,border:`1px solid ${filtro===f.id?C.greenDp:C.border}`,fontSize:10,fontFamily:'monospace',fontWeight:700}}>{f.label}</button>
          ))}
        </div>
        {loading ? <p style={{color:C.textDim,textAlign:'center',padding:40,fontFamily:'monospace',fontSize:11}}>CARREGANDO...</p>
        : filtradas.length===0 ? (
          <div style={{background:C.bg,borderRadius:14,padding:'40px 20px',border:`1px dashed ${C.border}`,textAlign:'center'}}>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:C.textDk}}>{filtro==='pendente'?'Nenhuma ordem pendente':'Nenhuma ordem encontrada'}</p>
            <p style={{margin:'6px 0 16px',fontSize:12,color:C.textMid}}>{filtro==='pendente'?'Abra uma nova Ordem de Serviço.':''}</p>
            {filtro==='pendente'&&<button onClick={()=>setModal('nova')} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'10px 18px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVA ORDEM</button>}
          </div>
        ) : <div style={{display:'flex',flexDirection:'column',gap:8}}>{filtradas.map(os=><OSCard key={os.id} os={os} onExecutar={()=>{setOsSel(os);setModal('executar')}} onCancelar={()=>handleCancelar(os)}/>)}</div>}
      </main>
      {modal==='nova'&&<NovaOSModal fazendaId={fazendaId} talhoes={talhoes} insumos={insumos} equipes={equipes} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);carregar()}}/>}
      {modal==='executar'&&osSel&&<ExecutarOSModal os={osSel} onClose={()=>{setModal(null);setOsSel(null)}} onSaved={()=>{setModal(null);setOsSel(null);carregar()}}/>}
      {modal==='equipes'&&<EquipesModal fazendaId={fazendaId} equipes={equipes} onClose={()=>setModal(null)} onSaved={()=>listarEquipes(fazendaId).then(setEquipes)}/>}
    </div>
  )
}

function OSCard({os, onExecutar, onCancelar}) {
  const [expanded, setExpanded] = useState(false)
  const st = STATUS_OS[os.status]||STATUS_OS.pendente
  const pr = PRIORIDADE_OS[os.prioridade]||PRIORIDADE_OS.media
  const maeInfo = getOperacaoMae(os.operacao_mae)
  const todosTalhoes = useMemo(()=>{ const l=(os.os_talhoes||[]).map(ot=>ot.talhao).filter(Boolean); return l.length>0?l:[os.talhao].filter(Boolean) },[os])
  return (
    <div style={{background:C.bg,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color:C.textDim,fontFamily:'monospace'}}>{os.numero}</span>
            <span style={{fontSize:9,fontFamily:'monospace',padding:'2px 7px',borderRadius:99,fontWeight:700,background:st.bg,color:st.cor}}>{st.label.toUpperCase()}</span>
            <span style={{fontSize:9,fontFamily:'monospace',padding:'2px 7px',borderRadius:99,fontWeight:700,background:pr.cor+'18',color:pr.cor}}>{pr.label.toUpperCase()}</span>
            {os.equipe&&<span style={{fontSize:9,fontFamily:'monospace',padding:'2px 7px',borderRadius:99,fontWeight:700,background:C.bgSoft,color:C.textMid,border:`1px solid ${C.border}`}}>{os.equipe.nome}</span>}
          </div>
          {maeInfo&&<p style={{margin:0,fontSize:10,color:C.textDim}}>{maeInfo.label}</p>}
          <p style={{margin:'1px 0 4px',fontSize:14,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif'}}>{os.operacao_recomendada}</p>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {todosTalhoes.map(t=><span key={t.id} style={{fontSize:10,color:C.textMid,background:C.bgSoft,padding:'2px 7px',borderRadius:6,border:`1px solid ${C.border}`}}>{t.codigo} · {Number(t.area_ha).toFixed(0)} ha</span>)}
            {os.area_parcial_ha&&<span style={{fontSize:10,color:C.amberDk,background:C.amberLight,padding:'2px 7px',borderRadius:6,border:`1px solid ${C.amber}44`}}>Parcial: {Number(os.area_parcial_ha).toFixed(0)} ha ({Number(os.area_percentual||0).toFixed(0)}%)</span>}
            {os.prazo&&<span style={{fontSize:10,color:C.textMid,fontFamily:'monospace'}}>Prazo: {os.prazo}</span>}
          </div>
          {os.os_insumos?.length>0&&<p style={{margin:'4px 0 0',fontSize:10,color:C.textDim}}>{os.os_insumos.length} insumo{os.os_insumos.length>1?'s':''} recomendado{os.os_insumos.length>1?'s':''}</p>}
        </div>
        <div style={{display:'flex',gap:5,flexShrink:0}}>
          {os.status==='pendente'&&<><button onClick={onExecutar} style={{background:C.greenDp,border:'none',borderRadius:8,padding:'7px 12px',color:C.bg,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>EXECUTAR</button><button onClick={onCancelar} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 10px',color:C.red,fontSize:14,cursor:'pointer'}}>✕</button></>}
          <button onClick={()=>setExpanded(!expanded)} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 10px',color:C.textMid,fontSize:12,cursor:'pointer'}}>{expanded?'▲':'▼'}</button>
        </div>
      </div>
      {expanded&&(
        <div style={{padding:'0 14px 12px',borderTop:`1px solid ${C.borderSoft}`,background:C.bgSoft}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10,marginBottom:8}}>
            {os.cultura_alvo&&<Chip label="CULTURA" valor={os.cultura_alvo}/>}
            {os.vazao_lha&&<Chip label="VAZÃO" valor={os.vazao_lha+' L/ha'}/>}
            {os.bico&&<Chip label="BICO" valor={os.bico}/>}
            {os.equipe&&<Chip label="EQUIPE" valor={os.equipe.nome+' — '+os.equipe.responsavel}/>}
          </div>
          {os.observacoes&&<div style={{padding:'8px 10px',background:C.bg,borderRadius:8,border:`1px solid ${C.amber}44`,marginBottom:8}}><p style={{margin:0,fontSize:8,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px',fontWeight:700}}>INSTRUÇÕES DO AGRÔNOMO</p><p style={{margin:'3px 0 0',fontSize:11,color:C.textDk,lineHeight:1.5}}>{os.observacoes}</p></div>}
          {os.os_insumos?.length>0&&<><p style={{margin:'0 0 5px',fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>{os.status==='concluida'?'INSUMOS EXECUTADOS':'INSUMOS RECOMENDADOS'}</p>{os.os_insumos.map(i=><div key={i.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 9px',background:C.bg,borderRadius:7,marginBottom:4,border:`1px solid ${C.borderSoft}`}}><div style={{flex:1}}><p style={{margin:0,fontSize:11,fontWeight:600,color:C.textDk}}>{i.insumo?.nome}</p><p style={{margin:0,fontSize:9,color:C.textMid,fontFamily:'monospace'}}>Rec: {i.dose_recomendada} {i.dose_unidade}{os.status==='concluida'&&i.dose_real>0&&<span style={{color:C.greenDp}}> · Real: {i.dose_real} {i.dose_unidade}</span>}</p></div>{os.status==='concluida'&&i.custo_real>0&&<p style={{margin:0,fontSize:11,fontWeight:700,color:C.greenDp,fontFamily:'monospace'}}>R$ {Number(i.custo_real).toFixed(2)}</p>}</div>)}</>}
        </div>
      )}
    </div>
  )
}

function Chip({label, valor}) {
  return <div style={{background:C.bg,borderRadius:8,padding:'5px 9px',border:`1px solid ${C.border}`}}><p style={{margin:0,fontSize:7,color:C.textDim,fontFamily:'monospace',letterSpacing:'1px',fontWeight:700}}>{label}</p><p style={{margin:'2px 0 0',fontSize:11,color:C.textDk,fontWeight:600}}>{valor}</p></div>
}

function formatCultura(cultura) {
  if (!cultura) return ''
  return cultura.charAt(0).toUpperCase() + cultura.slice(1)
}

function NovaOSModal({fazendaId, talhoes, insumos, equipes, onClose, onSaved}) {
  const [operacaoMae, setOperacaoMae] = useState('')
  const [servico, setServico] = useState('')
  const [talhoesSel, setTalhoesSel] = useState([])
  const [areaParcial, setAreaParcial] = useState('')
  const [form, setForm] = useState({vazao_lha:'',bico:'',equipe_id:'',prioridade:'media',prazo:'',receituario_agronomo:'',receituario_crea:'',observacoes:''})
  const [insumosRec, setInsumosRec] = useState([])
  const [busca, setBusca] = useState('')
  const [buscaTalhao, setBuscaTalhao] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [bicosDropdown, setBicosDropdown] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const maeInfo = getOperacaoMae(operacaoMae)
  const servicoInfo = maeInfo?.servicos.find(s=>s.id===servico)
  const talhoesSelecionados = useMemo(()=>talhoes.filter(t=>talhoesSel.includes(t.id)),[talhoes,talhoesSel])
  const areaTotal = talhoesSel.reduce((s,id)=>{ const t=talhoes.find(x=>x.id===id); return s+Number(t?.area_ha||0) },0)
  const areaEfetiva = areaParcial&&Number(areaParcial)>0 ? Math.min(Number(areaParcial),areaTotal) : areaTotal
  const percentualParcial = areaTotal>0&&areaParcial&&Number(areaParcial)>0 ? Math.round((Number(areaParcial)/areaTotal)*100) : null
  const culturaDaOrdem = useMemo(()=>{
    const culturas = [...new Set(talhoesSelecionados.map(t=>formatCultura(t.cultura)).filter(Boolean))]
    return culturas.join(', ')
  },[talhoesSelecionados])
  const talhoesFiltrados = useMemo(()=>{
    const q = buscaTalhao.trim().toLowerCase()
    return talhoes
      .filter(t=>!talhoesSel.includes(t.id))
      .filter(t=>!q || `${t.codigo} ${t.cultura || ''}`.toLowerCase().includes(q))
      .slice(0,10)
  },[talhoes,buscaTalhao,talhoesSel])
  const usaBico = operacaoMae === 'aplicacao_tratorizada'

  function set(k,v){setForm(p=>({...p,[k]:v}))}
  function toggleTalhao(id){setTalhoesSel(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
  function adicionarInsumo(insumo){setInsumosRec(prev=>[...prev,{insumo_id:insumo.id,nome:insumo.nome,unidade:insumo.unidade,custo_unitario:insumo.custo_unitario,carencia_dias:insumo.carencia_dias,dose_recomendada:'',dose_unidade:insumo.unidade+'/ha'}]);setBusca('');setBuscaAberta(false)}

  useEffect(()=>{
    if (!usaBico) setForm(p=>p.bico ? {...p,bico:''} : p)
  },[usaBico])

  const filtrados = insumos.filter(i=>(!busca||i.nome.toLowerCase().includes(busca.toLowerCase()))&&!insumosRec.find(r=>r.insumo_id===i.id)).slice(0,8)
  const precisaRec = servicoInfo&&['dessecacao_pre_plantio','dessecacao_pre_colheita','dessecacao_aerea','pre_emergente','pos_emergente','fungicida','fungicida_aereo','inseticida','inseticida_aereo'].includes(servicoInfo.id)

  async function handleSalvar() {
    setErro('')
    if (!operacaoMae){setErro('Selecione o serviço');return}
    if (!servico){setErro('Selecione a natureza agrícola');return}
    if (talhoesSel.length===0){setErro('Selecione ao menos um talhão');return}
    setSalvando(true)
    try {
      await criarOS({fazenda_id:fazendaId,talhao_ids:talhoesSel,operacao_mae:operacaoMae,servico,categoria:servicoInfo?.categoria||'outros',prioridade:form.prioridade,prazo:form.prazo||null,observacoes:form.observacoes,receituario_agronomo:form.receituario_agronomo,receituario_crea:form.receituario_crea,equipe_id:form.equipe_id||null,cultura_alvo:culturaDaOrdem||null,vazao_lha:form.vazao_lha||null,bico:usaBico?(form.bico||null):null,area_parcial_ha:areaParcial?Number(areaParcial):null,area_percentual:percentualParcial,insumos_recomendados:insumosRec.filter(i=>i.dose_recomendada>0).map(i=>({insumo_id:i.insumo_id,dose_recomendada:Number(i.dose_recomendada),dose_unidade:i.dose_unidade}))})
      onSaved()
    } catch(err){setErro(err.message||'Erro ao criar ordem de serviço');setSalvando(false)}
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:12,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bg,borderRadius:18,width:'100%',maxWidth:560,maxHeight:'94vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div><p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>ABRIR ORDEM DE SERVIÇO</p><h2 style={{margin:'4px 0 0',fontSize:17,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>Nova Ordem de Serviço</h2></div>
          <button onClick={onClose} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px 18px'}}>

          <SecTitle label="1. SERVIÇO"/>
          <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
            {OPERACOES_MAE.map((mae,idx)=>(
              <button key={mae.id} onClick={()=>{setOperacaoMae(mae.id);setServico('')}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,border:`1.5px solid ${operacaoMae===mae.id?C.greenDp:C.border}`,background:operacaoMae===mae.id?C.greenLight:C.bg,cursor:'pointer',textAlign:'left'}}>
                <span style={{width:24,height:24,borderRadius:7,background:operacaoMae===mae.id?C.greenDp:C.bgSoft,color:operacaoMae===mae.id?C.bg:C.textDim,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontFamily:'monospace',fontWeight:700,flexShrink:0}}>{idx+1}</span>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk,flex:1}}>{mae.label}</p>
                <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace'}}>{mae.servicos.length}</p>
              </button>
            ))}
          </div>

          {maeInfo&&<>
            <SecTitle label="2. NATUREZA AGRÍCOLA"/>
            <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
              {maeInfo.servicos.map(s=>(
                <button key={s.id} onClick={()=>setServico(s.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,border:`1.5px solid ${servico===s.id?C.greenDp:C.border}`,background:servico===s.id?C.greenLight:C.bg,cursor:'pointer',textAlign:'left'}}>
                  <div style={{width:8,height:8,borderRadius:2,background:servico===s.id?C.greenDp:C.border,flexShrink:0}}/>
                  <span style={{fontSize:12,fontWeight:600,color:C.textDk}}>{s.label}</span>
                  {servico===s.id&&<span style={{marginLeft:'auto',color:C.greenDp}}>✓</span>}
                </button>
              ))}
            </div>
          </>}

          <SecTitle label={`3. TALHÕES (${talhoesSel.length} selecionado${talhoesSel.length!==1?'s':''} · ${areaTotal.toFixed(1)} ha)`}/>
          <div style={{marginBottom:10}}>
            <input value={buscaTalhao} onChange={e=>setBuscaTalhao(e.target.value)} placeholder="Digite para buscar talhão..." style={{...inp,marginBottom:6}}/>
            {buscaTalhao&&(
              <div style={{background:C.bgSoft,borderRadius:10,padding:6,border:`1px solid ${C.border}`,marginBottom:8,maxHeight:190,overflowY:'auto'}}>
                {talhoesFiltrados.length===0 ? (
                  <p style={{margin:0,padding:'8px 10px',fontSize:11,color:C.textDim}}>Nenhum talhão encontrado</p>
                ) : talhoesFiltrados.map(t=>(
                  <button key={t.id} onClick={()=>{toggleTalhao(t.id);setBuscaTalhao('')}} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,border:`1px solid ${C.borderSoft}`,background:C.bg,cursor:'pointer',textAlign:'left',marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.textDk,width:48}}>{t.codigo}</span>
                    <span style={{fontSize:11,color:C.textMid,flex:1}}>{formatCultura(t.cultura)}</span>
                    <span style={{fontSize:10,color:C.textDim,fontFamily:'monospace'}}>{Number(t.area_ha).toFixed(1)} ha</span>
                  </button>
                ))}
              </div>
            )}
            {talhoesSelecionados.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {talhoesSelecionados.map(t=>(
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:9,border:`1.5px solid ${C.greenDp}`,background:C.greenLight}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.textDk,width:48}}>{t.codigo}</span>
                    <span style={{fontSize:11,color:C.textMid,flex:1}}>{formatCultura(t.cultura)}</span>
                    <span style={{fontSize:10,color:C.textMid,fontFamily:'monospace'}}>{Number(t.area_ha).toFixed(1)} ha</span>
                    <button onClick={()=>toggleTalhao(t.id)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,width:24,height:24,color:C.red,cursor:'pointer'}}>×</button>
                  </div>
                ))}
              </div>
            )}
            {talhoesSelecionados.length===0&&<p style={{margin:'4px 0 0',fontSize:10,color:C.textDim}}>Busque e selecione um talhão para preencher a cultura automaticamente.</p>}
          </div>

          {talhoesSel.length>0&&(
            <div style={{background:C.bgSoft,borderRadius:10,padding:'10px 12px',marginBottom:14,border:`1px solid ${C.border}`}}>
              <F label="ÁREA PARCIAL (ha) — opcional">
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="number" step="0.1" min="0" max={areaTotal} value={areaParcial} onChange={e=>setAreaParcial(e.target.value)} placeholder={'Max '+areaTotal.toFixed(0)+' ha'} style={{...inp,flex:2}}/>
                  {percentualParcial!==null&&<div style={{flex:1,padding:'10px',background:C.amberLight,borderRadius:10,textAlign:'center',border:`1px solid ${C.amber}44`}}><p style={{margin:0,fontSize:16,fontWeight:700,color:C.amberDk,fontFamily:'Georgia, serif'}}>{percentualParcial}%</p><p style={{margin:0,fontSize:8,color:C.amberDk,fontFamily:'monospace'}}>DA ÁREA</p></div>}
                </div>
              </F>
              {areaParcial&&Number(areaParcial)>0&&<p style={{margin:'4px 0 0',fontSize:10,color:C.amberDk}}>Recomendação calculada sobre <strong>{Number(areaParcial).toFixed(1)} ha</strong></p>}
            </div>
          )}

          <SecTitle label="4. DETALHES TÉCNICOS"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <F label="CULTURA">
              <div style={{...inp,background:C.bgLight,color:culturaDaOrdem?C.textDk:C.textDim}}>
                {culturaDaOrdem || 'Selecione um talhão'}
              </div>
            </F>
            <F label="VAZÃO (L/ha)">
              <input type="number" step="0.1" min="0" value={form.vazao_lha} onChange={e=>set('vazao_lha',e.target.value)} placeholder="Ex: 80" style={inp}/>
            </F>
          </div>
          {usaBico&&(
            <F label="BICO UTILIZADO">
              <div style={{position:'relative'}}>
                <input value={form.bico} onChange={e=>set('bico',e.target.value)} onFocus={()=>setBicosDropdown(true)} onBlur={()=>setTimeout(()=>setBicosDropdown(false),200)} placeholder="Selecione ou digite..." style={inp}/>
                {bicosDropdown&&(
                  <div style={{position:'absolute',top:'100%',left:0,right:0,background:C.bg,borderRadius:10,border:`1px solid ${C.border}`,zIndex:10,maxHeight:160,overflowY:'auto',boxShadow:'0 4px 16px rgba(0,0,0,0.1)'}}>
                    {BICOS_COMUNS.filter(b=>!form.bico||b.toLowerCase().includes(form.bico.toLowerCase())).map(b=><div key={b} onMouseDown={()=>set('bico',b)} style={{padding:'9px 12px',cursor:'pointer',fontSize:12,color:C.textDk,borderBottom:`1px solid ${C.borderSoft}`}}>{b}</div>)}
                  </div>
                )}
              </div>
            </F>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <F label="EQUIPE RESPONSÁVEL">
              <select value={form.equipe_id} onChange={e=>set('equipe_id',e.target.value)} style={inp}>
                <option value="">Sem equipe</option>
                {equipes.map(eq=><option key={eq.id} value={eq.id}>{eq.nome} — {eq.responsavel}</option>)}
              </select>
            </F>
            <F label="PRIORIDADE">
              <select value={form.prioridade} onChange={e=>set('prioridade',e.target.value)} style={inp}>
                <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
              </select>
            </F>
          </div>
          <F label="PRAZO"><input type="date" value={form.prazo} onChange={e=>set('prazo',e.target.value)} style={inp}/></F>
          {precisaRec&&(
            <div style={{padding:'10px 12px',background:C.amberLight,borderRadius:10,marginBottom:12,border:`1px solid ${C.amber}44`}}>
              <p style={{margin:'0 0 8px',fontSize:9,fontWeight:700,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px'}}>RECEITUÁRIO AGRONÔMICO</p>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8}}>
                <F label="AGRÔNOMO"><input value={form.receituario_agronomo} onChange={e=>set('receituario_agronomo',e.target.value)} placeholder="Eng. Agrônomo..." style={inp}/></F>
                <F label="CREA"><input value={form.receituario_crea} onChange={e=>set('receituario_crea',e.target.value)} placeholder="CREA-PE 12345" style={inp}/></F>
              </div>
            </div>
          )}
          <F label="OBSERVAÇÕES / INSTRUÇÕES PARA O EXECUTOR">
            <textarea value={form.observacoes} onChange={e=>set('observacoes',e.target.value)} placeholder="Instruções de aplicação, condições ideais, cuidados especiais..." rows={3} style={{...inp,resize:'vertical'}}/>
          </F>

          <SecTitle label="5. INSUMOS RECOMENDADOS"/>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
            <button onClick={()=>setBuscaAberta(!buscaAberta)} style={{background:C.greenLight,border:`1px solid ${C.greenDp}44`,borderRadius:8,padding:'6px 12px',color:C.greenDp,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ ADICIONAR INSUMO</button>
          </div>
          {buscaAberta&&(
            <div style={{background:C.bgSoft,borderRadius:12,padding:10,marginBottom:10,border:`1px solid ${C.border}`}}>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar no catálogo..." autoFocus style={{width:'100%',padding:'9px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.textDk,outline:'none',boxSizing:'border-box',marginBottom:6}}/>
              {filtrados.map(i=><div key={i.id} onClick={()=>adicionarInsumo(i)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:2,background:C.bg,border:`1px solid ${C.borderSoft}`}}><p style={{margin:0,fontSize:12,color:C.textDk,flex:1}}>{i.nome}</p><p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>R$ {Number(i.custo_unitario).toFixed(2)}/{i.unidade}</p></div>)}
            </div>
          )}
          {insumosRec.length===0?(
            <div style={{padding:'16px',textAlign:'center',background:C.bgSoft,borderRadius:12,border:`1px dashed ${C.border}`,marginBottom:12}}>
              <p style={{margin:0,fontSize:12,color:C.textDim}}>Nenhum insumo adicionado</p>
              <p style={{margin:'3px 0 0',fontSize:10,color:C.textVery}}>A ordem de serviço pode ser criada sem insumos</p>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
              {insumosRec.map((i,idx)=>(
                <div key={idx} style={{background:C.bg,borderRadius:10,padding:'10px 12px',border:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{i.nome}</p>
                    <button onClick={()=>setInsumosRec(p=>p.filter((_,n)=>n!==idx))} style={{background:'none',border:'none',color:C.red,fontSize:16,cursor:'pointer'}}>×</button>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input type="number" step="0.001" min="0" value={i.dose_recomendada} onChange={e=>setInsumosRec(p=>p.map((x,n)=>n===idx?{...x,dose_recomendada:e.target.value}:x))} placeholder="Dose" style={{flex:2,padding:'8px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.textDk,outline:'none'}}/>
                    <input value={i.dose_unidade} onChange={e=>setInsumosRec(p=>p.map((x,n)=>n===idx?{...x,dose_unidade:e.target.value}:x))} style={{flex:1,padding:'8px 4px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11,color:C.textMid,outline:'none',textAlign:'center'}}/>
                    {areaEfetiva>0&&i.dose_recomendada>0&&<div style={{flex:1,padding:'8px',background:C.bgSoft,borderRadius:8,border:`1px solid ${C.borderSoft}`,textAlign:'center'}}><p style={{margin:0,fontSize:10,color:C.greenDp,fontFamily:'monospace',fontWeight:700}}>R$ {calcularCustoInsumo(i.custo_unitario,i.dose_recomendada,areaEfetiva).toFixed(0)}</p><p style={{margin:0,fontSize:8,color:C.textDim,fontFamily:'monospace'}}>{(Number(i.dose_recomendada)*areaEfetiva).toFixed(1)} {i.unidade}</p></div>}
                  </div>
                  {i.carencia_dias>0&&<p style={{margin:'4px 0 0',fontSize:9,color:C.amberDk,fontFamily:'monospace'}}>Carência: {i.carencia_dias} dias</p>}
                </div>
              ))}
            </div>
          )}

          {erro&&<div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} style={{flex:1,padding:'13px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>CANCELAR</button>
            <button onClick={handleSalvar} disabled={salvando} style={{flex:2,padding:'13px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:12,fontFamily:'monospace',fontWeight:700,letterSpacing:'2px',cursor:salvando?'not-allowed':'pointer'}}>{salvando?'CRIANDO...':'CRIAR ORDEM DE SERVIÇO'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExecutarOSModal({os, onClose, onSaved}) {
  const maeInfo = getOperacaoMae(os.operacao_mae)
  const todosTalhoes = useMemo(()=>{ const l=(os.os_talhoes||[]).map(ot=>ot.talhao).filter(Boolean); return l.length>0?l:[os.talhao].filter(Boolean) },[os])
  const areaRef = os.area_parcial_ha ? Number(os.area_parcial_ha) : todosTalhoes.reduce((s,t)=>s+Number(t?.area_ha||0),0)
  const [dataExecucao, setDataExecucao] = useState(new Date().toISOString().split('T')[0])
  const [custoAplicacao, setCustoAplicacao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [recAgronomo, setRecAgronomo] = useState(os.receituario_agronomo||'')
  const [recCrea, setRecCrea] = useState(os.receituario_crea||'')
  const [insumosReais, setInsumosReais] = useState((os.os_insumos||[]).map(i=>({id:i.id,nome:i.insumo?.nome,unidade:i.insumo?.unidade,custo_unitario:i.insumo?.custo_unitario,carencia_dias:i.insumo?.carencia_dias,dose_recomendada:i.dose_recomendada,dose_unidade:i.dose_unidade,dose_real:i.dose_recomendada,quantidade_real:Math.round(Number(i.dose_recomendada)*areaRef*1000)/1000,custo_real:Math.round(calcularCustoInsumo(i.insumo?.custo_unitario,i.dose_recomendada,areaRef)*100)/100})))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function atualizarReal(idx,patch){setInsumosReais(prev=>prev.map((i,n)=>{if(n!==idx)return i;const u={...i,...patch};if('dose_real' in patch){u.quantidade_real=Math.round(Number(u.dose_real)*areaRef*1000)/1000;u.custo_real=Math.round(calcularCustoInsumo(u.custo_unitario,u.dose_real,areaRef)*100)/100};return u}))}

  const custoInsumos = insumosReais.reduce((s,i)=>s+Number(i.custo_real||0),0)
  const custoTotal = custoInsumos + Number(custoAplicacao||0)
  const custoHa = areaRef>0?custoTotal/areaRef:0
  const precisaRec = os.operacao_mae==='aplicacao_tratorizada'||os.operacao_mae==='aplicacao_aerea'

  async function handleFechar(){setErro('');setSalvando(true);try{await fecharOSCompleta({os_id:os.id,talhoes_ids:todosTalhoes.map(t=>t.id),data_execucao:dataExecucao,custo_aplicacao:Number(custoAplicacao)||0,observacoes,receituario_agronomo:recAgronomo,receituario_crea:recCrea,insumos_reais:insumosReais});onSaved()}catch(err){setErro(err.message||'Erro');setSalvando(false)}}

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:12,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bg,borderRadius:18,width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`,background:C.greenLight,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <p style={{margin:0,fontSize:10,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>EXECUTAR {os.numero}</p>
            <h2 style={{margin:'4px 0 2px',fontSize:15,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{os.operacao_recomendada}</h2>
            {maeInfo&&<p style={{margin:0,fontSize:10,color:C.textMid}}>{maeInfo.label}</p>}
            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
              {todosTalhoes.map(t=><span key={t.id} style={{fontSize:10,background:C.bg,padding:'2px 7px',borderRadius:6,border:`1px solid ${C.border}`,color:C.textMid}}>{t.codigo} · {Number(t.area_ha).toFixed(0)} ha</span>)}
              {os.area_parcial_ha&&<span style={{fontSize:10,background:C.amberLight,padding:'2px 7px',borderRadius:6,border:`1px solid ${C.amber}44`,color:C.amberDk}}>Parcial: {Number(os.area_parcial_ha).toFixed(0)} ha ({Number(os.area_percentual||0).toFixed(0)}%)</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk,flexShrink:0}}>✕</button>
        </div>
        <div style={{padding:'16px 18px'}}>
          {(os.cultura_alvo||os.vazao_lha||os.bico||os.equipe)&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{os.cultura_alvo&&<Chip label="CULTURA" valor={os.cultura_alvo}/>}{os.vazao_lha&&<Chip label="VAZÃO" valor={os.vazao_lha+' L/ha'}/>}{os.bico&&<Chip label="BICO" valor={os.bico}/>}{os.equipe&&<Chip label="EQUIPE" valor={os.equipe.nome}/>}</div>}
          {os.observacoes&&<div style={{padding:'10px 12px',background:C.amberLight,borderRadius:12,marginBottom:14,border:`1.5px solid ${C.amber}44`}}><p style={{margin:'0 0 4px',fontSize:9,fontWeight:700,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px'}}>INSTRUÇÕES DO AGRÔNOMO</p><p style={{margin:0,fontSize:12,color:C.textDk,lineHeight:1.6}}>{os.observacoes}</p></div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <F label="DATA DE EXECUÇÃO *"><input type="date" required value={dataExecucao} onChange={e=>setDataExecucao(e.target.value)} style={inp}/></F>
            <F label="CUSTO DE APLICAÇÃO (R$)"><input type="number" step="0.01" min="0" value={custoAplicacao} onChange={e=>setCustoAplicacao(e.target.value)} placeholder="0.00" style={inp}/></F>
          </div>
          {(os.receituario_agronomo||precisaRec)&&<div style={{padding:'10px 12px',background:C.amberLight,borderRadius:10,marginBottom:12,border:`1px solid ${C.amber}44`}}><p style={{margin:'0 0 8px',fontSize:9,fontWeight:700,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px'}}>RECEITUÁRIO</p><div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8}}><F label="AGRÔNOMO"><input value={recAgronomo} onChange={e=>setRecAgronomo(e.target.value)} placeholder="Eng. Agrônomo..." style={inp}/></F><F label="CREA"><input value={recCrea} onChange={e=>setRecCrea(e.target.value)} placeholder="CREA-PE 12345" style={inp}/></F></div></div>}
          {insumosReais.length>0&&<><p style={{margin:'0 0 4px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>CONFIRMAR INSUMOS REAIS</p><p style={{margin:'0 0 10px',fontSize:11,color:C.textMid}}>Ajuste se diferente do recomendado:</p><div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>{insumosReais.map((i,idx)=><div key={i.id} style={{background:C.bgSoft,borderRadius:10,padding:'10px 12px',border:`1px solid ${C.borderSoft}`}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{i.nome}</p><p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace'}}>Rec: {i.dose_recomendada} {i.dose_unidade}</p></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><div><label style={{display:'block',fontSize:8,fontFamily:'monospace',letterSpacing:'1.5px',color:C.textDim,marginBottom:3,fontWeight:700}}>DOSE REAL</label><div style={{display:'flex',gap:4}}><input type="number" step="0.001" min="0" value={i.dose_real} onChange={e=>atualizarReal(idx,{dose_real:e.target.value})} style={{flex:2,padding:'8px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.textDk,outline:'none'}}/><div style={{flex:1,padding:'8px 4px',background:C.bg,borderRadius:8,border:`1px solid ${C.borderSoft}`,textAlign:'center',fontSize:10,color:C.textMid,display:'flex',alignItems:'center',justifyContent:'center'}}>{i.dose_unidade}</div></div></div><div><label style={{display:'block',fontSize:8,fontFamily:'monospace',letterSpacing:'1.5px',color:C.textDim,marginBottom:3,fontWeight:700}}>CUSTO CALCULADO</label><div style={{padding:'8px 10px',background:C.bg,borderRadius:8,border:`1px solid ${C.borderSoft}`}}><p style={{margin:0,fontSize:12,fontWeight:700,color:C.greenDp,fontFamily:'monospace'}}>R$ {Number(i.custo_real).toFixed(2)}</p><p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace'}}>{Number(i.quantidade_real).toFixed(2)} {i.unidade}</p></div></div></div>{i.carencia_dias>0&&<p style={{margin:'4px 0 0',fontSize:9,color:C.amberDk,fontFamily:'monospace'}}>Carência: {i.carencia_dias} dias</p>}</div>)}</div></>}
          <F label="OBSERVAÇÕES DA EXECUÇÃO"><textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Como foi a execução..." rows={2} style={{...inp,resize:'vertical'}}/></F>
          <div style={{background:C.bgSoft,borderRadius:12,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.borderSoft}`}}>
            <p style={{margin:'0 0 8px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>RESUMO DO CUSTO REAL</p>
            {[{l:'Insumos',v:custoInsumos},{l:'Aplicação',v:Number(custoAplicacao||0)}].map(r=><div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:12,color:C.textMid}}>{r.l}</span><span style={{fontSize:12,color:C.textDk,fontFamily:'monospace'}}>R$ {r.v.toFixed(2)}</span></div>)}
            <div style={{height:1,background:C.border,margin:'8px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><span style={{fontSize:13,fontWeight:700,color:C.textDk}}>Total Real</span><div style={{textAlign:'right'}}><p style={{margin:0,fontSize:16,fontWeight:700,color:C.greenDp,fontFamily:'Georgia, serif'}}>R$ {custoTotal.toFixed(2)}</p><p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>R$ {custoHa.toFixed(2)}/ha · {areaRef.toFixed(1)} ha</p></div></div>
          </div>
          {erro&&<div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>CANCELAR</button>
            <button onClick={handleFechar} disabled={salvando} style={{flex:2,padding:'12px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:salvando?'not-allowed':'pointer'}}>{salvando?'FECHANDO...':'FECHAR ORDEM + REGISTRAR'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EquipesModal({fazendaId, equipes, onClose, onSaved}) {
  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleCriar(e) {
    e.preventDefault(); setErro(''); setSalvando(true)
    try { await criarEquipe({fazenda_id:fazendaId,nome,responsavel}); setNome(''); setResponsavel(''); onSaved() }
    catch(err){setErro(err.message||'Erro')} finally{setSalvando(false)}
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bg,borderRadius:18,width:'100%',maxWidth:460,maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div><p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>CADASTRO</p><h2 style={{margin:'4px 0 0',fontSize:17,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>Equipes de Campo</h2></div>
          <button onClick={onClose} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px 18px'}}>
          {equipes.length>0&&(
            <div style={{marginBottom:20}}>
              <p style={{margin:'0 0 8px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>EQUIPES CADASTRADAS</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {equipes.map(eq=>(
                  <div key={eq.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:C.bgSoft,borderRadius:10,border:`1px solid ${C.border}`}}>
                    <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,color:C.textDk}}>{eq.nome}</p><p style={{margin:0,fontSize:11,color:C.textMid}}>Resp: {eq.responsavel}</p></div>
                    <button onClick={()=>desativarEquipe(eq.id).then(onSaved)} style={{background:'none',border:'none',color:C.red,fontSize:18,cursor:'pointer',padding:4}}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p style={{margin:'0 0 10px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>NOVA EQUIPE</p>
          <form onSubmit={handleCriar}>
            <F label="NOME DA EQUIPE *"><input required value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Equipe 01" style={inp} autoFocus/></F>
            <F label="RESPONSÁVEL *"><input required value={responsavel} onChange={e=>setResponsavel(e.target.value)} placeholder="Ex: João Silva" style={inp}/></F>
            {erro&&<div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
            <div style={{display:'flex',gap:8}}>
              <button type="button" onClick={onClose} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>FECHAR</button>
              <button type="submit" disabled={salvando} style={{flex:2,padding:'12px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:salvando?'not-allowed':'pointer'}}>{salvando?'SALVANDO...':'CADASTRAR EQUIPE'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function SecTitle({label}){return <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><p style={{margin:0,fontSize:9,color:C.greenDp,fontFamily:'monospace',letterSpacing:'2px',fontWeight:700}}>{label}</p><div style={{flex:1,height:1,background:C.greenDp+'33'}}/></div>}
function F({label,children}){return <div style={{marginBottom:12}}><label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>{label}</label>{children}</div>}
const inp={width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none',boxSizing:'border-box'}
