create table if not exists public.operacoes (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  safra_id uuid references public.safras(id) on delete set null,
  categoria text,
  tipo text,
  data_operacao date,
  custo_aplicacao numeric(14, 2) not null default 0,
  observacoes text,
  receituario_agronomo text,
  receituario_crea text,
  receituario_emissao date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operacao_insumos (
  id uuid primary key default gen_random_uuid(),
  operacao_id uuid not null references public.operacoes(id) on delete cascade,
  insumo_id uuid references public.insumos(id) on delete set null,
  dose numeric(14, 4) not null default 0,
  dose_unidade text,
  quantidade_total numeric(14, 4) not null default 0,
  custo_total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  talhao_id uuid references public.talhoes(id) on delete set null,
  numero text,
  status text not null default 'pendente',
  prioridade text not null default 'media',
  prazo date,
  data_execucao date,
  categoria text,
  operacao_mae text,
  servico text,
  operacao_recomendada text,
  cultura_alvo text,
  vazao_lha numeric(14, 2),
  bico text,
  area_parcial_ha numeric(14, 2),
  area_percentual numeric(7, 2),
  observacoes text,
  observacoes_execucao text,
  custo_aplicacao_real numeric(14, 2) not null default 0,
  receituario_agronomo text,
  receituario_crea text,
  equipe_id uuid references public.equipes(id) on delete set null,
  criada_por_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.os_talhoes (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  talhao_id uuid not null references public.talhoes(id) on delete cascade
);

create table if not exists public.os_insumos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  insumo_id uuid references public.insumos(id) on delete set null,
  dose_recomendada numeric(14, 4) not null default 0,
  dose_unidade text,
  dose_real numeric(14, 4) not null default 0,
  quantidade_real numeric(14, 4) not null default 0,
  custo_real numeric(14, 2) not null default 0
);

alter table public.operacoes add column if not exists safra_id uuid references public.safras(id) on delete set null;
alter table public.operacoes add column if not exists categoria text;
alter table public.operacoes add column if not exists tipo text;
alter table public.operacoes add column if not exists data_operacao date;
alter table public.operacoes add column if not exists custo_aplicacao numeric(14, 2) not null default 0;
alter table public.operacoes add column if not exists observacoes text;
alter table public.operacoes add column if not exists receituario_agronomo text;
alter table public.operacoes add column if not exists receituario_crea text;
alter table public.operacoes add column if not exists receituario_emissao date;
alter table public.operacoes add column if not exists created_at timestamptz not null default now();
alter table public.operacoes add column if not exists updated_at timestamptz not null default now();

alter table public.operacao_insumos add column if not exists insumo_id uuid references public.insumos(id) on delete set null;
alter table public.operacao_insumos add column if not exists dose numeric(14, 4) not null default 0;
alter table public.operacao_insumos add column if not exists dose_unidade text;
alter table public.operacao_insumos add column if not exists quantidade_total numeric(14, 4) not null default 0;
alter table public.operacao_insumos add column if not exists custo_total numeric(14, 2) not null default 0;
alter table public.operacao_insumos add column if not exists created_at timestamptz not null default now();

alter table public.ordens_servico add column if not exists numero text;
alter table public.ordens_servico add column if not exists status text not null default 'pendente';
alter table public.ordens_servico add column if not exists prioridade text not null default 'media';
alter table public.ordens_servico add column if not exists prazo date;
alter table public.ordens_servico add column if not exists data_execucao date;
alter table public.ordens_servico add column if not exists categoria text;
alter table public.ordens_servico add column if not exists operacao_mae text;
alter table public.ordens_servico add column if not exists servico text;
alter table public.ordens_servico add column if not exists operacao_recomendada text;
alter table public.ordens_servico add column if not exists cultura_alvo text;
alter table public.ordens_servico add column if not exists vazao_lha numeric(14, 2);
alter table public.ordens_servico add column if not exists bico text;
alter table public.ordens_servico add column if not exists area_parcial_ha numeric(14, 2);
alter table public.ordens_servico add column if not exists area_percentual numeric(7, 2);
alter table public.ordens_servico add column if not exists observacoes text;
alter table public.ordens_servico add column if not exists observacoes_execucao text;
alter table public.ordens_servico add column if not exists custo_aplicacao_real numeric(14, 2) not null default 0;
alter table public.ordens_servico add column if not exists receituario_agronomo text;
alter table public.ordens_servico add column if not exists receituario_crea text;
alter table public.ordens_servico add column if not exists equipe_id uuid references public.equipes(id) on delete set null;
alter table public.ordens_servico add column if not exists criada_por_id uuid references public.profiles(id) on delete set null;
alter table public.ordens_servico add column if not exists created_at timestamptz not null default now();
alter table public.ordens_servico add column if not exists updated_at timestamptz not null default now();

alter table public.os_insumos add column if not exists insumo_id uuid references public.insumos(id) on delete set null;
alter table public.os_insumos add column if not exists dose_recomendada numeric(14, 4) not null default 0;
alter table public.os_insumos add column if not exists dose_unidade text;
alter table public.os_insumos add column if not exists dose_real numeric(14, 4) not null default 0;
alter table public.os_insumos add column if not exists quantidade_real numeric(14, 4) not null default 0;
alter table public.os_insumos add column if not exists custo_real numeric(14, 2) not null default 0;

create index if not exists operacoes_talhao_data_idx on public.operacoes(talhao_id, data_operacao desc);
create index if not exists ordens_servico_fazenda_idx on public.ordens_servico(fazenda_id, created_at desc);
