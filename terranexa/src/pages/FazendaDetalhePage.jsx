import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listarOperacoes, getCategoriaInfo, resumoCustosPorCategoria } from '../lib/operacoes'
import { NovaOperacaoModal } from '../components/NovaOperacaoModal'
import { theme } from '../styles/theme'

const C = theme.normal
const FASE_LABELS = { preparo:'Preparo', plantio:'Plantio', brotacao:'Brotacao', vegetativo:'Vegetativo', floracao:'Floracao', frutificacao:'Frutificacao', maturacao:'Maturacao', colheita:'Colheita', pos_colheita:'Pos-colheita', pousio:'Pousio' }

export function FazendaDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fazenda, setFazenda] = useState(null)
  const [talhoes, setTalhoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [form, setForm] = useState({ codigo:'T1', cultura:'soja', area_ha:'', fase:'preparo' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [talhaoSel, setTalhaoSel] = useState(null)
  const [operacoes, setOperacoes] = useState([])
  const [custos, setCustos] = useState([])
  const [loadOps, setLoadOps] = useState(false)
  const [showNovaOp, setShowNovaOp] = useState(false)
  const [opSel, setOpSel] = useState(null)

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const [{ data: f }, { data: ts }] = await Promise.all([
      supabase.from('fazendas').select('*').eq('id', id).single(),
      supabase.from('talhoes').select('*').eq('fazenda_id', id).eq('ativo', true).order('codigo')
    ])
    setFazenda(f)
    setTalhoes(ts || [])
    const nums = (ts||[]).map(t=>parseInt(t.codigo.replace(/\D/g,''))).filter(n=>!isNaN(n))
    setForm(p=>({...p, codigo:'T'+(nums.length===0?1:Math.max(...nums)+1)}))
    setLoading(false)
  }

  async function abrirTalhao(talhao) {
    setTalhaoSel(talhao)
    setLoadOps(true)
    const [ops, cs] = await Promise.all([listarOperacoes(talhao.id), resumoCustosPorCategoria(talhao.id)])
    setOperacoes(ops)
    setCustos(cs)
    setLoadOps(false)
  }

  async function salvarTalhao(e) {
    e.preventDefault(); setErro(''); setSalvando(true)
    const { error } = await supabase.from('talhoes').insert({ fazenda_id:id, codigo:form.codigo, cultura:form.cultura, area_ha:parseFloat(form.area_ha), fase:form.fase })
    if (error) { setErro(error.message); setSalvando(false); return }
    setShowNovo(false); carregar(); setSalvando(false)
  }

  async function excluirTalhao(tid) {
    if (!confirm('Excluir este talhao?')) return
    await supabase.from('talhoes').update({ ativo:false }).eq('id', tid)
    if (talhaoSel?.id===tid) setTalhaoSel(null)
    carregar()
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bgSoft}}><p style={{color:C.textDim,fontFamily:'monospace'}}>CARREGANDO...</p></div>

  const total = talhoes.reduce((s,t)=>s+Number(t.area_ha||0),0)
  const totalCusto = custos.reduce((s,c)=>s+Number(c.custo_total||0),0)

  return (
    <div style={{minHeight:'100vh',background:C.bgSoft,display:'flex',flexDirection:'column'}}>
      <header style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:'14px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>navigate('/')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:36,height:36,fontSize:16,cursor:'pointer',color:C.textDk}}>←</button>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>FAZENDA</p>
            <h1 style={{margin:'2px 0 0',fontSize:17,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{fazenda?.nome}</h1>
          </div>
          <button onClick={()=>navigate('/insumos')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 12px',color:C.textDk,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>INSUMOS</button>
        </div>
      </header>

      <div style={{flex:1,display:'flex',maxWidth:1100,margin:'0 auto',width:'100%',padding:'16px',gap:16,flexWrap:'wrap'}}>
        <div style={{width:300,flexShrink:0}}>
          <div style={{background:`linear-gradient(135deg,${C.greenLight},${C.amberLight})`,borderRadius:14,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
            <div>
              <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>AREA TOTAL</p>
              <p style={{margin:'3px 0 0',fontSize:22,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif',lineHeight:1}}>{total.toFixed(2)} ha</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>TALHOES</p>
              <p style={{margin:'3px 0 0',fontSize:22,fontWeight:700,color:C.greenDp,fontFamily:'Georgia, serif',lineHeight:1}}>{talhoes.length}</p>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>TALHOES</p>
            <button onClick={()=>setShowNovo(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:8,padding:'6px 11px',fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVO</button>
          </div>
          {talhoes.length===0 ? (
            <div style={{background:C.bg,borderRadius:12,padding:'24px 16px',border:`1px dashed ${C.border}`,textAlign:'center'}}>
              <p style={{margin:'0 0 12px',fontSize:12,color:C.textMid}}>Nenhum talhao cadastrado.</p>
              <button onClick={()=>setShowNovo(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:8,padding:'8px 14px',fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ CADASTRAR</button>
            </div>
          ) : talhoes.map(t=>(
            <div key={t.id} onClick={()=>abrirTalhao(t)} style={{background:C.bg,borderRadius:10,padding:'10px 12px',border:`1.5px solid ${talhaoSel?.id===t.id?C.greenDp:C.border}`,cursor:'pointer',display:'flex',alignItems:'center',gap:10,marginBottom:5,transition:'all 0.15s'}}>
              <div style={{width:34,height:34,borderRadius:8,background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.greenDp,fontFamily:'Georgia, serif',flexShrink:0}}>{t.codigo}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{t.codigo} — {t.cultura?.charAt(0).toUpperCase()+t.cultura?.slice(1)}</p>
                <p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>{Number(t.area_ha).toFixed(2)} HA · {(FASE_LABELS[t.fase]||t.fase).toUpperCase()}</p>
              </div>
              <button onClick={e=>{e.stopPropagation();excluirTalhao(t.id)}} style={{background:'none',border:'none',color:C.textDim,fontSize:16,cursor:'pointer',padding:2}}>×</button>
            </div>
          ))}
        </div>

        <div style={{flex:1,minWidth:260}}>
          {!talhaoSel ? (
            <div style={{background:C.bg,borderRadius:14,padding:'48px 20px',textAlign:'center',border:`1px dashed ${C.border}`}}>
              <p style={{margin:0,fontSize:28}}>🗺</p>
              <p style={{margin:'8px 0 4px',fontSize:14,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif'}}>Selecione um talhao</p>
              <p style={{margin:0,fontSize:12,color:C.textMid}}>Clique em um talhao para ver o historico</p>
            </div>
          ) : loadOps ? (
            <div style={{background:C.bg,borderRadius:14,padding:'48px 20px',textAlign:'center'}}><p style={{color:C.textDim,fontFamily:'monospace',fontSize:11}}>CARREGANDO...</p></div>
          ) : (
            <div>
              <div style={{background:C.bg,borderRadius:14,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>HISTORICO</p>
                  <h2 style={{margin:'2px 0 0',fontSize:16,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{talhaoSel.codigo} — {talhaoSel.cultura?.charAt(0).toUpperCase()+talhaoSel.cultura?.slice(1)} · {Number(talhaoSel.area_ha).toFixed(2)} ha</h2>
                </div>
                <button onClick={()=>setShowNovaOp(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'9px 14px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ REGISTRAR</button>
              </div>

              {custos.length>0 && (
                <div style={{background:C.bg,borderRadius:14,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.border}`}}>
                  <p style={{margin:'0 0 10px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>CUSTO POR CATEGORIA</p>
                  {custos.sort((a,b)=>b.custo_total-a.custo_total).map(c=>{
                    const info = getCategoriaInfo(c.categoria)
                    const perc = totalCusto>0?(c.custo_total/totalCusto*100):0
                    return (
                      <div key={c.categoria} style={{marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <div style={{width:8,height:8,borderRadius:2,background:info.cor}}/>
                            <span style={{fontSize:11,color:C.textDk}}>{info.label}</span>
                            <span style={{fontSize:9,color:C.textDim,fontFamily:'monospace'}}>{c.qtd_operacoes} op.</span>
                          </div>
                          <div>
                            <span style={{fontSize:11,fontWeight:700,color:info.cor,fontFamily:'monospace'}}>R$ {Number(c.custo_total).toFixed(2)}</span>
                            <span style={{fontSize:9,color:C.textDim,fontFamily:'monospace',marginLeft:6}}>{perc.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div style={{background:C.border,borderRadius:99,height:5,overflow:'hidden'}}>
                          <div style={{width:perc+'%',height:5,borderRadius:99,background:info.cor}}/>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{paddingTop:8,borderTop:`1px solid ${C.borderSoft}`,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.textDk}}>Total</span>
                    <span style={{fontSize:13,fontWeight:700,color:C.greenDp,fontFamily:'monospace'}}>R$ {totalCusto.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {operacoes.length===0 ? (
                <div style={{background:C.bg,borderRadius:14,padding:'32px 20px',border:`1px dashed ${C.border}`,textAlign:'center'}}>
                  <p style={{margin:0,fontSize:14,fontWeight:700,color:C.textDk}}>Nenhuma operacao registrada</p>
                  <p style={{margin:'6px 0 14px',fontSize:12,color:C.textMid}}>Registre a primeira operacao deste talhao.</p>
                  <button onClick={()=>setShowNovaOp(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'10px 18px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ REGISTRAR</button>
                </div>
              ) : operacoes.map(op=>(
                <OperacaoCard key={op.id} op={op} open={opSel===op.id} onToggle={()=>setOpSel(opSel===op.id?null:op.id)}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNovo && (
        <div onClick={()=>setShowNovo(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.bg,borderRadius:18,padding:'24px 22px',width:'100%',maxWidth:420}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h2 style={{margin:0,fontSize:18,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>Novo Talhao</h2>
              <button onClick={()=>setShowNovo(false)} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk}}>X</button>
            </div>
            <form onSubmit={salvarTalhao}>
              {[['CODIGO *','codigo','T1','text'],['AREA (ha) *','area_ha','28.5','number']].map(([l,k,ph,t])=>(
                <div key={k} style={{marginBottom:12}}>
                  <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>{l}</label>
                  <input required type={t} step={t==='number'?'0.01':undefined} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>CULTURA</label>
                <select value={form.cultura} onChange={e=>setForm(p=>({...p,cultura:e.target.value}))} style={{width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none'}}>
                  {[['soja','Soja'],['milho','Milho'],['algodao','Algodao'],['feijao','Feijao'],['sorgo','Sorgo'],['cana','Cana'],['cafe','Cafe'],['outro','Outro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>FASE</label>
                <select value={form.fase} onChange={e=>setForm(p=>({...p,fase:e.target.value}))} style={{width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none'}}>
                  {Object.entries(FASE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {erro && <div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={()=>setShowNovo(false)} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>CANCELAR</button>
                <button type="submit" disabled={salvando} style={{flex:2,padding:'12px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:salvando?'not-allowed':'pointer'}}>{salvando?'SALVANDO...':'SALVAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNovaOp && talhaoSel && (
        <NovaOperacaoModal talhao={talhaoSel} fazendaId={id} onClose={()=>setShowNovaOp(false)} onSaved={async()=>{setShowNovaOp(false);await abrirTalhao(talhaoSel)}}/>
      )}
    </div>
  )
}

function OperacaoCard({ op, open, onToggle }) {
  const info = getCategoriaInfo(op.categoria)
  const totalInsumos = (op.insumos||[]).reduce((s,i)=>s+Number(i.custo_total||0),0)
  const totalOp = totalInsumos + Number(op.custo_aplicacao||0)

  return (
    <div style={{background:C.bg,borderRadius:12,border:`1px solid ${open?info.cor:C.border}`,overflow:'hidden',marginBottom:6,transition:'border 0.2s'}}>
      <button onClick={onToggle} style={{width:'100%',background:'none',border:'none',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left'}}>
        <div style={{width:8,height:32,borderRadius:4,background:info.cor,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{info.label}</p>
          <p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>{op.data_operacao} · {op.insumos?.length||0} insumo{(op.insumos?.length||0)!==1?'s':''}</p>
        </div>
        <p style={{margin:0,fontSize:12,fontWeight:700,color:info.cor,fontFamily:'monospace',flexShrink:0}}>R$ {totalOp.toFixed(2)}</p>
        <span style={{color:C.textMid,transform:open?'rotate(90deg)':'none',transition:'transform 0.2s',fontSize:14}}>›</span>
      </button>
      {open && (
        <div style={{padding:'0 14px 12px',borderTop:`1px solid ${C.borderSoft}`,background:C.bgSoft}}>
          <div style={{display:'flex',gap:8,marginTop:10,marginBottom:8}}>
            {[{l:'INSUMOS',v:totalInsumos,c:C.greenDp},{l:'APLICACAO',v:Number(op.custo_aplicacao||0),c:C.amberDk}].map(x=>(
              <div key={x.l} style={{flex:1,background:C.bg,borderRadius:8,padding:'7px 9px',border:`1px solid ${C.border}`}}>
                <p style={{margin:0,fontSize:7,color:C.textDim,fontFamily:'monospace',letterSpacing:'1px'}}>{x.l}</p>
                <p style={{margin:'2px 0 0',fontSize:12,fontWeight:700,color:x.c,fontFamily:'monospace'}}>R$ {x.v.toFixed(2)}</p>
              </div>
            ))}
          </div>
          {op.insumos?.length>0 && (
            <>
              <p style={{margin:'0 0 5px',fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>INSUMOS</p>
              {op.insumos.map(i=>(
                <div key={i.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 9px',background:C.bg,borderRadius:7,marginBottom:4,border:`1px solid ${C.borderSoft}`}}>
                  <div style={{width:4,height:28,borderRadius:2,background:info.cor,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:11,fontWeight:600,color:C.textDk}}>{i.insumo?.nome}</p>
                    <p style={{margin:0,fontSize:9,color:C.textMid,fontFamily:'monospace'}}>{i.dose} {i.dose_unidade} · {i.quantidade_total} {i.insumo?.unidade} total</p>
                  </div>
                  <p style={{margin:0,fontSize:11,fontWeight:700,color:info.cor,fontFamily:'monospace'}}>R$ {Number(i.custo_total).toFixed(2)}</p>
                </div>
              ))}
            </>
          )}
          {op.receituario_agronomo && (
            <div style={{marginTop:8,padding:'7px 9px',background:C.amberLight,borderRadius:7,border:`1px solid ${C.amber}44`}}>
              <p style={{margin:0,fontSize:8,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px',fontWeight:700}}>RECEITUARIO</p>
              <p style={{margin:'2px 0 0',fontSize:11,color:C.textDk}}>{op.receituario_agronomo} — {op.receituario_crea}</p>
            </div>
          )}
          {op.observacoes && (
            <div style={{marginTop:8,padding:'7px 9px',background:C.bg,borderRadius:7,border:`1px solid ${C.borderSoft}`}}>
              <p style={{margin:0,fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'1px'}}>OBSERVACOES</p>
              <p style={{margin:'2px 0 0',fontSize:11,color:C.textMid,lineHeight:1.4}}>{op.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
EOFcat > src/pages/FazendaDetalhePage.jsx << 'EOF'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listarOperacoes, getCategoriaInfo, resumoCustosPorCategoria } from '../lib/operacoes'
import { NovaOperacaoModal } from '../components/NovaOperacaoModal'
import { theme } from '../styles/theme'

const C = theme.normal
const FASE_LABELS = { preparo:'Preparo', plantio:'Plantio', brotacao:'Brotacao', vegetativo:'Vegetativo', floracao:'Floracao', frutificacao:'Frutificacao', maturacao:'Maturacao', colheita:'Colheita', pos_colheita:'Pos-colheita', pousio:'Pousio' }

export function FazendaDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fazenda, setFazenda] = useState(null)
  const [talhoes, setTalhoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [form, setForm] = useState({ codigo:'T1', cultura:'soja', area_ha:'', fase:'preparo' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [talhaoSel, setTalhaoSel] = useState(null)
  const [operacoes, setOperacoes] = useState([])
  const [custos, setCustos] = useState([])
  const [loadOps, setLoadOps] = useState(false)
  const [showNovaOp, setShowNovaOp] = useState(false)
  const [opSel, setOpSel] = useState(null)

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const [{ data: f }, { data: ts }] = await Promise.all([
      supabase.from('fazendas').select('*').eq('id', id).single(),
      supabase.from('talhoes').select('*').eq('fazenda_id', id).eq('ativo', true).order('codigo')
    ])
    setFazenda(f)
    setTalhoes(ts || [])
    const nums = (ts||[]).map(t=>parseInt(t.codigo.replace(/\D/g,''))).filter(n=>!isNaN(n))
    setForm(p=>({...p, codigo:'T'+(nums.length===0?1:Math.max(...nums)+1)}))
    setLoading(false)
  }

  async function abrirTalhao(talhao) {
    setTalhaoSel(talhao)
    setLoadOps(true)
    const [ops, cs] = await Promise.all([listarOperacoes(talhao.id), resumoCustosPorCategoria(talhao.id)])
    setOperacoes(ops)
    setCustos(cs)
    setLoadOps(false)
  }

  async function salvarTalhao(e) {
    e.preventDefault(); setErro(''); setSalvando(true)
    const { error } = await supabase.from('talhoes').insert({ fazenda_id:id, codigo:form.codigo, cultura:form.cultura, area_ha:parseFloat(form.area_ha), fase:form.fase })
    if (error) { setErro(error.message); setSalvando(false); return }
    setShowNovo(false); carregar(); setSalvando(false)
  }

  async function excluirTalhao(tid) {
    if (!confirm('Excluir este talhao?')) return
    await supabase.from('talhoes').update({ ativo:false }).eq('id', tid)
    if (talhaoSel?.id===tid) setTalhaoSel(null)
    carregar()
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bgSoft}}><p style={{color:C.textDim,fontFamily:'monospace'}}>CARREGANDO...</p></div>

  const total = talhoes.reduce((s,t)=>s+Number(t.area_ha||0),0)
  const totalCusto = custos.reduce((s,c)=>s+Number(c.custo_total||0),0)

  return (
    <div style={{minHeight:'100vh',background:C.bgSoft,display:'flex',flexDirection:'column'}}>
      <header style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:'14px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>navigate('/')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:36,height:36,fontSize:16,cursor:'pointer',color:C.textDk}}>←</button>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>FAZENDA</p>
            <h1 style={{margin:'2px 0 0',fontSize:17,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{fazenda?.nome}</h1>
          </div>
          <button onClick={()=>navigate('/insumos')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 12px',color:C.textDk,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>INSUMOS</button>
        </div>
      </header>

      <div style={{flex:1,display:'flex',maxWidth:1100,margin:'0 auto',width:'100%',padding:'16px',gap:16,flexWrap:'wrap'}}>
        <div style={{width:300,flexShrink:0}}>
          <div style={{background:`linear-gradient(135deg,${C.greenLight},${C.amberLight})`,borderRadius:14,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
            <div>
              <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>AREA TOTAL</p>
              <p style={{margin:'3px 0 0',fontSize:22,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif',lineHeight:1}}>{total.toFixed(2)} ha</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>TALHOES</p>
              <p style={{margin:'3px 0 0',fontSize:22,fontWeight:700,color:C.greenDp,fontFamily:'Georgia, serif',lineHeight:1}}>{talhoes.length}</p>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>TALHOES</p>
            <button onClick={()=>setShowNovo(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:8,padding:'6px 11px',fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVO</button>
          </div>
          {talhoes.length===0 ? (
            <div style={{background:C.bg,borderRadius:12,padding:'24px 16px',border:`1px dashed ${C.border}`,textAlign:'center'}}>
              <p style={{margin:'0 0 12px',fontSize:12,color:C.textMid}}>Nenhum talhao cadastrado.</p>
              <button onClick={()=>setShowNovo(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:8,padding:'8px 14px',fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ CADASTRAR</button>
            </div>
          ) : talhoes.map(t=>(
            <div key={t.id} onClick={()=>abrirTalhao(t)} style={{background:C.bg,borderRadius:10,padding:'10px 12px',border:`1.5px solid ${talhaoSel?.id===t.id?C.greenDp:C.border}`,cursor:'pointer',display:'flex',alignItems:'center',gap:10,marginBottom:5,transition:'all 0.15s'}}>
              <div style={{width:34,height:34,borderRadius:8,background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.greenDp,fontFamily:'Georgia, serif',flexShrink:0}}>{t.codigo}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{t.codigo} — {t.cultura?.charAt(0).toUpperCase()+t.cultura?.slice(1)}</p>
                <p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>{Number(t.area_ha).toFixed(2)} HA · {(FASE_LABELS[t.fase]||t.fase).toUpperCase()}</p>
              </div>
              <button onClick={e=>{e.stopPropagation();excluirTalhao(t.id)}} style={{background:'none',border:'none',color:C.textDim,fontSize:16,cursor:'pointer',padding:2}}>×</button>
            </div>
          ))}
        </div>

        <div style={{flex:1,minWidth:260}}>
          {!talhaoSel ? (
            <div style={{background:C.bg,borderRadius:14,padding:'48px 20px',textAlign:'center',border:`1px dashed ${C.border}`}}>
              <p style={{margin:0,fontSize:28}}>🗺</p>
              <p style={{margin:'8px 0 4px',fontSize:14,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif'}}>Selecione um talhao</p>
              <p style={{margin:0,fontSize:12,color:C.textMid}}>Clique em um talhao para ver o historico</p>
            </div>
          ) : loadOps ? (
            <div style={{background:C.bg,borderRadius:14,padding:'48px 20px',textAlign:'center'}}><p style={{color:C.textDim,fontFamily:'monospace',fontSize:11}}>CARREGANDO...</p></div>
          ) : (
            <div>
              <div style={{background:C.bg,borderRadius:14,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>HISTORICO</p>
                  <h2 style={{margin:'2px 0 0',fontSize:16,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{talhaoSel.codigo} — {talhaoSel.cultura?.charAt(0).toUpperCase()+talhaoSel.cultura?.slice(1)} · {Number(talhaoSel.area_ha).toFixed(2)} ha</h2>
                </div>
                <button onClick={()=>setShowNovaOp(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'9px 14px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ REGISTRAR</button>
              </div>

              {custos.length>0 && (
                <div style={{background:C.bg,borderRadius:14,padding:'12px 14px',marginBottom:12,border:`1px solid ${C.border}`}}>
                  <p style={{margin:'0 0 10px',fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>CUSTO POR CATEGORIA</p>
                  {custos.sort((a,b)=>b.custo_total-a.custo_total).map(c=>{
                    const info = getCategoriaInfo(c.categoria)
                    const perc = totalCusto>0?(c.custo_total/totalCusto*100):0
                    return (
                      <div key={c.categoria} style={{marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <div style={{width:8,height:8,borderRadius:2,background:info.cor}}/>
                            <span style={{fontSize:11,color:C.textDk}}>{info.label}</span>
                            <span style={{fontSize:9,color:C.textDim,fontFamily:'monospace'}}>{c.qtd_operacoes} op.</span>
                          </div>
                          <div>
                            <span style={{fontSize:11,fontWeight:700,color:info.cor,fontFamily:'monospace'}}>R$ {Number(c.custo_total).toFixed(2)}</span>
                            <span style={{fontSize:9,color:C.textDim,fontFamily:'monospace',marginLeft:6}}>{perc.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div style={{background:C.border,borderRadius:99,height:5,overflow:'hidden'}}>
                          <div style={{width:perc+'%',height:5,borderRadius:99,background:info.cor}}/>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{paddingTop:8,borderTop:`1px solid ${C.borderSoft}`,display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.textDk}}>Total</span>
                    <span style={{fontSize:13,fontWeight:700,color:C.greenDp,fontFamily:'monospace'}}>R$ {totalCusto.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {operacoes.length===0 ? (
                <div style={{background:C.bg,borderRadius:14,padding:'32px 20px',border:`1px dashed ${C.border}`,textAlign:'center'}}>
                  <p style={{margin:0,fontSize:14,fontWeight:700,color:C.textDk}}>Nenhuma operacao registrada</p>
                  <p style={{margin:'6px 0 14px',fontSize:12,color:C.textMid}}>Registre a primeira operacao deste talhao.</p>
                  <button onClick={()=>setShowNovaOp(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'10px 18px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ REGISTRAR</button>
                </div>
              ) : operacoes.map(op=>(
                <OperacaoCard key={op.id} op={op} open={opSel===op.id} onToggle={()=>setOpSel(opSel===op.id?null:op.id)}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNovo && (
        <div onClick={()=>setShowNovo(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.bg,borderRadius:18,padding:'24px 22px',width:'100%',maxWidth:420}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h2 style={{margin:0,fontSize:18,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>Novo Talhao</h2>
              <button onClick={()=>setShowNovo(false)} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk}}>X</button>
            </div>
            <form onSubmit={salvarTalhao}>
              {[['CODIGO *','codigo','T1','text'],['AREA (ha) *','area_ha','28.5','number']].map(([l,k,ph,t])=>(
                <div key={k} style={{marginBottom:12}}>
                  <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>{l}</label>
                  <input required type={t} step={t==='number'?'0.01':undefined} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>CULTURA</label>
                <select value={form.cultura} onChange={e=>setForm(p=>({...p,cultura:e.target.value}))} style={{width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none'}}>
                  {[['soja','Soja'],['milho','Milho'],['algodao','Algodao'],['feijao','Feijao'],['sorgo','Sorgo'],['cana','Cana'],['cafe','Cafe'],['outro','Outro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:5,fontWeight:700}}>FASE</label>
                <select value={form.fase} onChange={e=>setForm(p=>({...p,fase:e.target.value}))} style={{width:'100%',padding:'10px 12px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.textDk,outline:'none'}}>
                  {Object.entries(FASE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {erro && <div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>{erro}</div>}
              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={()=>setShowNovo(false)} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>CANCELAR</button>
                <button type="submit" disabled={salvando} style={{flex:2,padding:'12px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:salvando?'not-allowed':'pointer'}}>{salvando?'SALVANDO...':'SALVAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNovaOp && talhaoSel && (
        <NovaOperacaoModal talhao={talhaoSel} fazendaId={id} onClose={()=>setShowNovaOp(false)} onSaved={async()=>{setShowNovaOp(false);await abrirTalhao(talhaoSel)}}/>
      )}
    </div>
  )
}

function OperacaoCard({ op, open, onToggle }) {
  const info = getCategoriaInfo(op.categoria)
  const totalInsumos = (op.insumos||[]).reduce((s,i)=>s+Number(i.custo_total||0),0)
  const totalOp = totalInsumos + Number(op.custo_aplicacao||0)

  return (
    <div style={{background:C.bg,borderRadius:12,border:`1px solid ${open?info.cor:C.border}`,overflow:'hidden',marginBottom:6,transition:'border 0.2s'}}>
      <button onClick={onToggle} style={{width:'100%',background:'none',border:'none',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left'}}>
        <div style={{width:8,height:32,borderRadius:4,background:info.cor,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textDk}}>{info.label}</p>
          <p style={{margin:0,fontSize:10,color:C.textMid,fontFamily:'monospace'}}>{op.data_operacao} · {op.insumos?.length||0} insumo{(op.insumos?.length||0)!==1?'s':''}</p>
        </div>
        <p style={{margin:0,fontSize:12,fontWeight:700,color:info.cor,fontFamily:'monospace',flexShrink:0}}>R$ {totalOp.toFixed(2)}</p>
        <span style={{color:C.textMid,transform:open?'rotate(90deg)':'none',transition:'transform 0.2s',fontSize:14}}>›</span>
      </button>
      {open && (
        <div style={{padding:'0 14px 12px',borderTop:`1px solid ${C.borderSoft}`,background:C.bgSoft}}>
          <div style={{display:'flex',gap:8,marginTop:10,marginBottom:8}}>
            {[{l:'INSUMOS',v:totalInsumos,c:C.greenDp},{l:'APLICACAO',v:Number(op.custo_aplicacao||0),c:C.amberDk}].map(x=>(
              <div key={x.l} style={{flex:1,background:C.bg,borderRadius:8,padding:'7px 9px',border:`1px solid ${C.border}`}}>
                <p style={{margin:0,fontSize:7,color:C.textDim,fontFamily:'monospace',letterSpacing:'1px'}}>{x.l}</p>
                <p style={{margin:'2px 0 0',fontSize:12,fontWeight:700,color:x.c,fontFamily:'monospace'}}>R$ {x.v.toFixed(2)}</p>
              </div>
            ))}
          </div>
          {op.insumos?.length>0 && (
            <>
              <p style={{margin:'0 0 5px',fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>INSUMOS</p>
              {op.insumos.map(i=>(
                <div key={i.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 9px',background:C.bg,borderRadius:7,marginBottom:4,border:`1px solid ${C.borderSoft}`}}>
                  <div style={{width:4,height:28,borderRadius:2,background:info.cor,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:11,fontWeight:600,color:C.textDk}}>{i.insumo?.nome}</p>
                    <p style={{margin:0,fontSize:9,color:C.textMid,fontFamily:'monospace'}}>{i.dose} {i.dose_unidade} · {i.quantidade_total} {i.insumo?.unidade} total</p>
                  </div>
                  <p style={{margin:0,fontSize:11,fontWeight:700,color:info.cor,fontFamily:'monospace'}}>R$ {Number(i.custo_total).toFixed(2)}</p>
                </div>
              ))}
            </>
          )}
          {op.receituario_agronomo && (
            <div style={{marginTop:8,padding:'7px 9px',background:C.amberLight,borderRadius:7,border:`1px solid ${C.amber}44`}}>
              <p style={{margin:0,fontSize:8,color:C.amberDk,fontFamily:'monospace',letterSpacing:'1px',fontWeight:700}}>RECEITUARIO</p>
              <p style={{margin:'2px 0 0',fontSize:11,color:C.textDk}}>{op.receituario_agronomo} — {op.receituario_crea}</p>
            </div>
          )}
          {op.observacoes && (
            <div style={{marginTop:8,padding:'7px 9px',background:C.bg,borderRadius:7,border:`1px solid ${C.borderSoft}`}}>
              <p style={{margin:0,fontSize:8,color:C.textDim,fontFamily:'monospace',letterSpacing:'1px'}}>OBSERVACOES</p>
              <p style={{margin:'2px 0 0',fontSize:11,color:C.textMid,lineHeight:1.4}}>{op.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
