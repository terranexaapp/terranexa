import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { theme } from '../styles/theme'
import { Logo } from '../components/Logo'
import { ErrorPanel } from '../components/ErrorPanel'

const C = theme.normal

async function listarFazendas() {
  const { data, error } = await supabase
    .from('fazendas')
    .select(
      'id, nome, municipio, estado, area_total_ha, ativa, talhoes:talhoes(id, codigo, cultura, area_ha, fase, saude, ativo)'
    )
    .eq('ativa', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function criarFazenda({ nome, municipio, estado, endereco }) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase
    .from('fazendas')
    .insert({ proprietario_id: user.id, nome, municipio, estado, endereco })
    .select()
    .single()
  if (error) throw error
  return data
}

export function FazendasPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [fazendas, setFazendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [showNova, setShowNova] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    try {
      setLoading(true)
      setErro(null)
      setFazendas(await listarFazendas())
    } catch (e) {
      console.error(e)
      setErro(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #f7fbef 0%, #eef8e7 46%, #fff5dc 100%)' }}>
      <header
        style={{
          background: 'rgba(255,255,255,0.84)',
          borderBottom: `1px solid ${C.border}`,
          padding: '14px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(14px)'
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={32} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.greenDp,
                  fontFamily: 'Georgia, serif',
                  lineHeight: 1
                }}
              >
                Terra<span style={{ color: C.amber }}>Nexa</span>
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 8,
                  color: C.textDim,
                  fontFamily: 'monospace',
                  letterSpacing: '2px'
                }}
              >
                {profile?.nome?.toUpperCase() || 'PRODUTOR'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              background: C.bgLight,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '7px 12px',
              color: C.textDk,
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '1px',
              cursor: 'pointer'
            }}
          >
            SAIR
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: C.textDim, fontFamily: 'monospace', letterSpacing: '2px' }}>
              MINHAS PROPRIEDADES
            </p>
            <h1
              style={{
                margin: '4px 0 0',
                fontSize: 24,
                color: C.textDk,
                fontWeight: 700,
                fontFamily: 'Georgia, serif'
              }}
            >
              Fazendas
            </h1>
          </div>
          <button
            onClick={() => setShowNova(true)}
            style={{
              background: C.greenDp,
              color: C.bg,
              border: 'none',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '1.5px',
              cursor: 'pointer'
            }}
          >
            + NOVA FAZENDA
          </button>
        </div>
        {loading ? (
          <p style={{ color: C.textDim, textAlign: 'center', padding: 40, fontFamily: 'monospace', fontSize: 11 }}>
            CARREGANDO...
          </p>
        ) : erro ? (
          <ErrorPanel error={erro} onRetry={carregar} />
        ) : fazendas.length === 0 ? (
          <div
            style={{
              background: C.bg,
              borderRadius: 16,
              padding: '60px 24px',
              border: `1px dashed ${C.border}`,
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
            <h2 style={{ margin: 0, fontSize: 18, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
              Cadastre sua primeira fazenda
            </h2>
            <p style={{ margin: '8px 0 20px', color: C.textMid, fontSize: 13 }}>
              Adicione fazendas, talhões e registre operações.
            </p>
            <button
              onClick={() => setShowNova(true)}
              style={{
                background: C.greenDp,
                color: C.bg,
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '2px',
                cursor: 'pointer'
              }}
            >
              + CADASTRAR FAZENDA
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fazendas.map(f => (
              <div
                key={f.id}
                onClick={() => navigate(`/fazenda/${f.id}`)}
                style={{
                  background: C.bg,
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: `1px solid ${C.border}`,
                  cursor: 'pointer'
                }}
              >
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textDk, fontFamily: 'Georgia, serif' }}>
                  {f.nome}
                </p>
                <p style={{ margin: '2px 0 8px', fontSize: 11, color: C.textMid }}>
                  {f.municipio || '—'}
                  {f.estado ? ` · ${f.estado}` : ''}
                </p>
                <div style={{ display: 'flex', gap: 14, paddingTop: 10, borderTop: `1px solid ${C.borderSoft}` }}>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 8,
                        color: C.textDim,
                        fontFamily: 'monospace',
                        letterSpacing: '1.5px'
                      }}
                    >
                      ÁREA TOTAL
                    </p>
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.greenDp,
                        fontFamily: 'Georgia, serif'
                      }}
                    >
                      {Number(f.area_total_ha || 0).toFixed(2)} ha
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 8,
                        color: C.textDim,
                        fontFamily: 'monospace',
                        letterSpacing: '1.5px'
                      }}
                    >
                      TALHÕES
                    </p>
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.amber,
                        fontFamily: 'Georgia, serif'
                      }}
                    >
                      {(f.talhoes || []).filter(t => t.ativo).length}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {showNova && (
        <NovaFazendaModal
          onClose={() => setShowNova(false)}
          onCreated={nova => {
            setShowNova(false)
            navigate(`/fazenda/${nova.id}`)
          }}
        />
      )}
    </div>
  )
}

function NovaFazendaModal({ onClose, onCreated }) {
  const [nome, setNome] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [estado, setEstado] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      onCreated(await criarFazenda({ nome, municipio, estado }))
    } catch (err) {
      setError(err.message || 'Erro ao criar fazenda')
    } finally {
      setLoading(false)
    }
  }

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
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.bg, borderRadius: 18, padding: '24px 22px', width: '100%', maxWidth: 420 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: C.textDk, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
            Nova Fazenda
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
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {[
            ['NOME DA FAZENDA *', nome, setNome, 'Fazenda São José', true],
            ['MUNICÍPIO', municipio, setMunicipio, 'Petrolina', false]
          ].map(([label, val, setter, ph, req]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  color: C.textDim,
                  marginBottom: 6,
                  fontWeight: 700
                }}
              >
                {label}
              </label>
              <input
                required={req}
                value={val}
                onChange={e => setter(e.target.value)}
                placeholder={ph}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: C.bgSoft,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  color: C.textDk,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                fontFamily: 'monospace',
                letterSpacing: '2px',
                color: C.textDim,
                marginBottom: 6,
                fontWeight: 700
              }}
            >
              UF
            </label>
            <input
              value={estado}
              maxLength={2}
              onChange={e => setEstado(e.target.value.toUpperCase())}
              placeholder="PE"
              style={{
                width: '100%',
                padding: '11px 14px',
                background: C.bgSoft,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                fontSize: 14,
                color: C.textDk,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {error && (
            <div
              style={{
                background: C.redLight,
                color: C.redDk,
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 14,
                fontSize: 12
              }}
            >
              {error}
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
                letterSpacing: '2px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'CRIANDO...' : 'CRIAR FAZENDA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
