import { supabase } from './supabase'
import { FAZENDA_PAPEIS, PROPRIETARIO_PAPEL, getFazendaPapelMeta, usaMenuCampoEnxuto } from './fazendaPapeis'

export const VIEW_PERMISSAO = {
  mapa: 'mapa',
  dashboard: 'dashboard',
  chuvas: 'chuvas',
  solo: 'solo',
  monitoramento: 'monitoramento',
  'monitoramento-inbox': 'monitoramento',
  'monitoramento-registro': 'monitoramento_registro',
  gerencial: 'gerencial',
  relatorios: 'relatorios'
}

export const MANAGER_PERMISSAO = {
  talhoes: 'talhoes',
  pluviometros: 'pluviometros',
  estoque: 'estoque',
  equipe: 'equipe',
  insumos: 'insumos',
  safras: 'safras',
  maquinas: 'maquinas',
  produtividade: 'produtividade',
  membros: 'membros',
  configuracao: 'membros'
}

function acessoFromMeta(papelMeta, vinculo = null) {
  return {
    papel: papelMeta.papel,
    label: papelMeta.label,
    papelMeta,
    permissoes: papelMeta.permissoes || {},
    vinculo
  }
}

async function buscarPapelMetaBanco(papel) {
  const { data, error } = await supabase
    .from('fazenda_papeis')
    .select('papel, label, nivel_hierarquia, descricao, permissoes, ativo')
    .eq('papel', papel)
    .eq('ativo', true)
    .maybeSingle()

  if (error || !data) return getFazendaPapelMeta(papel)
  return {
    papel: data.papel,
    label: data.label,
    nivel_hierarquia: data.nivel_hierarquia,
    resumo: data.descricao,
    permissoes: data.permissoes || {}
  }
}

export async function buscarMeuAcessoFazenda(fazendaId, fazenda) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return acessoFromMeta(getFazendaPapelMeta('operador'))

  if (fazenda?.proprietario_id === user.id) {
    return acessoFromMeta(PROPRIETARIO_PAPEL)
  }

  const { data, error } = await supabase
    .from('fazenda_membros')
    .select('id, papel, status, email, user_id')
    .eq('fazenda_id', fazendaId)
    .eq('user_id', user.id)
    .eq('status', 'aceito')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return acessoFromMeta(await buscarPapelMetaBanco('operador'))
  return acessoFromMeta(await buscarPapelMetaBanco(data.papel), data)
}

export function temPermissao(acesso, permissao) {
  if (!permissao) return true
  return Boolean(acesso?.permissoes?.[permissao])
}

export function managerPermitido(activeManager, acesso) {
  const permissao = MANAGER_PERMISSAO[activeManager]
  return temPermissao(acesso, permissao)
}

export function viewPermitida(activeView, acesso) {
  if (activeView === 'gerencial') {
    return temPermissao(acesso, 'gerencial') || listarManagersPermitidos(acesso).length > 0
  }
  if (activeView === 'monitoramento-registro') {
    return temPermissao(acesso, 'monitoramento_registro')
  }
  return temPermissao(acesso, VIEW_PERMISSAO[activeView])
}

export function listarManagersPermitidos(acesso) {
  return Object.keys(MANAGER_PERMISSAO).filter(manager => managerPermitido(manager, acesso))
}

export function filtrarNavItems(items, acesso) {
  const hiddenForFieldMenu = usaMenuCampoEnxuto(acesso) ? new Set(['chuvas', 'solo']) : null
  return items.filter(item => viewPermitida(item.id, acesso) && !hiddenForFieldMenu?.has(item.id))
}

export function filtrarDesktopNavGroups(groups, acesso) {
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.manager) return managerPermitido(item.manager, acesso)
        return viewPermitida(item.view, acesso)
      })
    }))
    .filter(group => group.items.length > 0)
}

export function primeiroDestinoPermitido(acesso) {
  if (temPermissao(acesso, 'mapa')) return { view: 'mapa', manager: null }
  if (temPermissao(acesso, 'dashboard')) return { view: 'dashboard', manager: null }
  const manager = listarManagersPermitidos(acesso)[0]
  if (manager) return { view: 'gerencial', manager }
  const papelFallback = FAZENDA_PAPEIS[0]
  return { view: papelFallback?.permissoes?.mapa ? 'mapa' : 'dashboard', manager: null }
}
