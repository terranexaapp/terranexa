export const FAZENDA_PERMISSAO_LABELS = {
  dashboard: 'Dashboard principal',
  mapa: 'Mapa principal',
  chuvas: 'Chuvas',
  solo: 'Solo',
  monitoramento: 'Monitoramento',
  monitoramento_registro: 'Registro de monitoramento',
  gerencial: 'Gerencial',
  talhoes: 'Talhoes',
  pluviometros: 'Pluviometria',
  safras: 'Safras',
  estoque: 'Estoque',
  equipe: 'Equipe',
  insumos: 'Insumos',
  maquinas: 'Maquinas',
  produtividade: 'Produtividade',
  membros: 'Membros',
  relatorios: 'Relatorios',
  operacoes_resumo: 'Resumo de campo',
  os_apontamento: 'Apontamento de OS',
  os_fechar: 'Fechar OS'
}

export const FAZENDA_PAPEIS = [
  {
    papel: 'gerente',
    label: 'Gerente',
    nivel_hierarquia: 90,
    resumo: 'Acesso total as informacoes da fazenda.',
    permissoes: {
      dashboard: true,
      mapa: true,
      chuvas: true,
      solo: true,
      monitoramento: true,
      monitoramento_registro: true,
      gerencial: true,
      talhoes: true,
      pluviometros: true,
      safras: true,
      estoque: true,
      equipe: true,
      insumos: true,
      maquinas: true,
      produtividade: true,
      membros: true,
      relatorios: true,
      operacoes_resumo: true,
      os_apontamento: true,
      os_fechar: true
    }
  },
  {
    papel: 'agronomo',
    label: 'Agronomo',
    nivel_hierarquia: 70,
    resumo: 'Acesso tecnico amplo, sem gestao administrativa sensivel.',
    permissoes: {
      dashboard: true,
      mapa: true,
      chuvas: true,
      solo: true,
      monitoramento: true,
      monitoramento_registro: true,
      gerencial: true,
      talhoes: true,
      pluviometros: true,
      safras: true,
      estoque: true,
      equipe: false,
      insumos: true,
      maquinas: false,
      produtividade: true,
      membros: false,
      relatorios: true,
      operacoes_resumo: true,
      os_apontamento: true,
      os_fechar: true
    }
  },
  {
    papel: 'tecnico',
    label: 'Tecnico',
    nivel_hierarquia: 50,
    resumo: 'Monitoramento, resumo, coleta de pluviometria e mapa principal.',
    permissoes: {
      dashboard: true,
      mapa: true,
      chuvas: true,
      solo: false,
      monitoramento: true,
      monitoramento_registro: true,
      gerencial: false,
      talhoes: false,
      pluviometros: true,
      safras: false,
      estoque: false,
      equipe: false,
      insumos: false,
      maquinas: false,
      produtividade: false,
      membros: false,
      relatorios: false,
      operacoes_resumo: true,
      os_apontamento: true,
      os_fechar: false
    }
  },
  {
    papel: 'coordenador_equipe',
    label: 'Coordenador de equipe',
    nivel_hierarquia: 40,
    resumo: 'Resumo de campo, ultimas operacoes e apontamento para fechar OS.',
    permissoes: {
      dashboard: false,
      mapa: true,
      chuvas: false,
      solo: false,
      monitoramento: false,
      monitoramento_registro: false,
      gerencial: false,
      talhoes: false,
      pluviometros: false,
      safras: false,
      estoque: false,
      equipe: false,
      insumos: false,
      maquinas: false,
      produtividade: false,
      membros: false,
      relatorios: false,
      operacoes_resumo: true,
      os_apontamento: true,
      os_fechar: true
    }
  },
  {
    papel: 'operador',
    label: 'Operador',
    nivel_hierarquia: 30,
    resumo: 'Acesso operacional basico mantido para convites antigos.',
    permissoes: {
      dashboard: false,
      mapa: true,
      chuvas: false,
      solo: false,
      monitoramento: true,
      monitoramento_registro: true,
      gerencial: false,
      talhoes: false,
      pluviometros: false,
      safras: false,
      estoque: false,
      equipe: false,
      insumos: false,
      maquinas: false,
      produtividade: false,
      membros: false,
      relatorios: false,
      operacoes_resumo: true,
      os_apontamento: true,
      os_fechar: false
    }
  }
]

export const FAZENDA_PAPEIS_BY_ID = FAZENDA_PAPEIS.reduce((acc, item) => {
  acc[item.papel] = item
  return acc
}, {})

export const PROPRIETARIO_PAPEL = {
  papel: 'proprietario',
  label: 'Proprietario',
  nivel_hierarquia: 100,
  resumo: 'Dono da fazenda e responsavel comercial.',
  permissoes: Object.keys(FAZENDA_PERMISSAO_LABELS).reduce((acc, key) => {
    acc[key] = true
    return acc
  }, {})
}

export function getFazendaPapelMeta(papel, fallback = null) {
  if (papel === 'proprietario') return PROPRIETARIO_PAPEL
  return FAZENDA_PAPEIS_BY_ID[papel] || fallback || {
    papel,
    label: papel || 'Sem papel',
    nivel_hierarquia: 0,
    resumo: 'Papel nao catalogado.',
    permissoes: {}
  }
}

export function resumirPermissoes(permissoes = {}, limit = 5) {
  const enabled = Object.entries(permissoes)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => FAZENDA_PERMISSAO_LABELS[key] || key)
  if (enabled.length <= limit) return enabled
  return [...enabled.slice(0, limit), `+${enabled.length - limit}`]
}
