import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { theme } from '../styles/theme'

const C = theme.normal
const CULTURA_ICONS = { soja:'🌱', milho:'🌽', algodao:'🌼', feijao:'🫘', sorgo:'🌾', cana:'🎋', cafe:'☕', outro:'🌿' }
const FASE_LABELS = { preparo:'Preparo', plantio:'Plantio', brotacao:'Brotação', vegetativo:'Vegetativo', floracao:'Floração', frutificacao:'Frutificação', maturacao:'Maturação', colheita:'Colheita', pos_colheita:'Pós-colheita', pousio:'Pousio' }

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

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const [{ data: f }, { data: ts }] = await Promise.all([
      supabase.from('fazendas').select('*').eq('id', id).single(),
      supabase.from('talhoes').select('*').eq('fazenda_id', id).eq('ativo', true).order('codigo')
    ])
    setFazenda(f)
    setTalhoes(ts || [])
    const nums = (ts || []).map(t => parseInt(t.codigo.replace(/\D/g,''))).filter(n => !isNaN(n))
    setForm(prev => ({ ...prev, codigo: 'T' + (nums.length === 0 ? 1 : Math.max(...nums) + 1) }))
    setLoading(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const { error } = await supabase.from('talhoes').insert({
      fazenda_id: id, codigo: form.codigo, cultura: form.cultura,
      area_ha: parseFloat(form.area_ha), fase: form.fase
    })
    if (error) { setErro(error.message); setSalvando(false); return }
    setShowNovo(false)
    carregar()
    setSalvando(false)
  }

  async function excluir(tid) {
    if (!confirm('Excluir este talhão?')) return
    await supabase.from('talhoes').update({ ativo: false }).eq('id', tid)
    carregar()
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bgSoft}}><p style={{color:C.textDim,fontFamily:'monospace'}}>CARREGANDO...</p></div>

  const total = talhoes.reduce((s,t) => s + Number(t.area_ha||0), 0)

  return (
    <div style={{minHeight:'100vh',background:C.bgSoft}}>
      <header style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:'14px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:800,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={() => navigate('/')} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:36,height:36,fontSize:16,cursor:'pointer',color:C.textDk}}>←</button>
          <div>
            <p style={{margin:0,fontSize:9,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>FAZENDA</p>
            <h1 style={{margin:'2px 0 0',fontSize:17,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>{fazenda?.nome}</h1>
          </div>
        </div>
      </header>
      <main style={{maxWidth:800,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{background:`linear-gradient(135deg,${C.greenLight},${C.amberLight})`,borderRadius:14,padding:'14px 16px',marginBottom:16,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <p style={{margin:0,fontSize:10,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>ÁREA TOTAL</p>
            <p style={{margin:'4px 0 0',fontSize:28,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif',lineHeight:1}}>{total.toFixed(2)} <span style={{fontSize:16}}>ha</span></p>
            <p style={{margin:'4px 0 0',fontSize:10,color:C.textMid}}>{fazenda?.municipio||'—'}{fazenda?.estado ? ' · '+fazenda.estado : ''}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{margin:0,fontSize:10,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>TALHÕES</p>
            <p style={{margin:'4px 0 0',fontSize:28,fontWeight:700,color:C.greenDp,fontFamily:'Georgia, serif',lineHeight:1}}>{talhoes.length}</p>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <p style={{margin:0,fontSize:10,color:C.textDim,fontFamily:'monospace',letterSpacing:'2px'}}>TALHÕES</p>
          <button onClick={() => setShowNovo(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'8px 13px',fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVO TALHÃO</button>
        </div>
        {talhoes.length === 0 ? (
          <div style={{background:C.bg,borderRadius:14,padding:'40px 20px',border:`1px dashed ${C.border}`,textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:8}}>🌾</div>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:C.textDk}}>Cadastre o primeiro talhão</p>
            <p style={{margin:'6px 0 16px',fontSize:12,color:C.textMid}}>Informe o código, cultura, área e fase.</p>
            <button onClick={() => setShowNovo(true)} style={{background:C.greenDp,color:C.bg,border:'none',borderRadius:10,padding:'10px 18px',fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>+ NOVO TALHÃO</button>
          </div>
        ) : talhoes.map(t => (
          <div key={t.id} style={{background:C.bg,borderRadius:12,padding:'12px 14px',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
            <div style={{width:44,height:44,borderRadius:10,background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{CULTURA_ICONS[t.cultura]}</div>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:14,fontWeight:700,color:C.textDk,fontFamily:'Georgia, serif'}}>{t.codigo}{t.nome?' · '+t.nome:''}</p>
              <p style={{margin:'2px 0 0',fontSize:11,color:C.textMid,fontFamily:'monospace'}}>{Number(t.area_ha).toFixed(2)} HA · {(FASE_LABELS[t.fase]||t.fase).toUpperCase()}</p>
            </div>
            <button onClick={() => excluir(t.id)} style={{background:'transparent',border:'none',color:C.textDim,fontSize:20,cursor:'pointer',padding:4}}>×</button>
          </div>
        ))}
      </main>
      {showNovo && (
        <div onClick={() => setShowNovo(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e => e.stopPropagation()} style={{background:C.bg,borderRadius:18,padding:'24px 22px',width:'100%',maxWidth:420}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{margin:0,fontSize:20,color:C.textDk,fontWeight:700,fontFamily:'Georgia, serif'}}>Novo Talhão</h2>
              <button onClick={() => setShowNovo(false)} style={{background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',color:C.textDk}}>✕</button>
            </div>
            <form onSubmit={salvar}>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:6,fontWeight:700}}>CÓDIGO *</label>
                <input required value={form.codigo} onChange={e => setForm(p=>({...p,codigo:e.target.value}))} placeholder="T1" style={{width:'100%',padding:'11px 14px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,color:C.textDk,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:6,fontWeight:700}}>ÁREA (ha) *</label>
                <input required type="number" step="0.01" value={form.area_ha} onChange={e => setForm(p=>({...p,area_ha:e.target.value}))} placeholder="28.5" style={{width:'100%',padding:'11px 14px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,color:C.textDk,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:6,fontWeight:700}}>CULTURA</label>
                <select value={form.cultura} onChange={e => setForm(p=>({...p,cultura:e.target.value}))} style={{width:'100%',padding:'11px 14px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,color:C.textDk,outline:'none'}}>
                  <option value="soja">🌱 Soja</option>
                  <option value="milho">🌽 Milho</option>
                  <option value="algodao">🌼 Algodão</option>
                  <option value="feijao">🫘 Feijão</option>
                  <option value="sorgo">🌾 Sorgo</option>
                  <option value="cana">🎋 Cana</option>
                  <option value="cafe">☕ Café</option>
                  <option value="outro">🌿 Outro</option>
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:9,fontFamily:'monospace',letterSpacing:'2px',color:C.textDim,marginBottom:6,fontWeight:700}}>FASE</label>
                <select value={form.fase} onChange={e => setForm(p=>({...p,fase:e.target.value}))} style={{width:'100%',padding:'11px 14px',background:C.bgSoft,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,color:C.textDk,outline:'none'}}>
                  {Object.entries(FASE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {erro && <div style={{background:C.redLight,color:C.redDk,borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:12}}>{erro}</div>}
              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={() => setShowNovo(false)} style={{flex:1,padding:'12px',background:C.bgLight,border:`1px solid ${C.border}`,borderRadius:10,color:C.textDk,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:'pointer'}}>CANCELAR</button>
                <button type="submit" disabled={salvando} style={{flex:2,padding:'12px',background:salvando?C.textDim:C.greenDp,color:C.bg,border:'none',borderRadius:10,fontSize:11,fontFamily:'monospace',fontWeight:700,cursor:salvando?'not-allowed':'pointer'}}>{salvando?'SALVANDO...':'SALVAR TALHÃO'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
