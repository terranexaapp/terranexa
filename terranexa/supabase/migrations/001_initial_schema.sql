-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · SCHEMA INICIAL
-- Migration: 001_initial_schema
-- ════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ENUMS
create type perfil_usuario as enum ('produtor', 'agronomo', 'gerente');

create type cultura_tipo as enum (
  'soja', 'milho', 'algodao', 'feijao', 'sorgo', 'cana', 'cafe', 'outro'
);

create type fase_cultivo as enum (
  'preparo', 'plantio', 'brotacao', 'vegetativo', 'floracao',
  'frutificacao', 'maturacao', 'colheita', 'pos_colheita', 'pousio'
);

create type operacao_categoria as enum (
  'plantio', 'colheita',
  'adubacao_plantio', 'adubacao_cobertura',
  'dessecacao_pre_plantio', 'dessecacao_pre_colheita', 'dessecacao_pos_colheita',
  'pre_emergente', 'pos_emergente',
  'fungicida_terrestre', 'fungicida_aereo',
  'inseticida_terrestre', 'inseticida_aereo',
  'micronutriente', 'biologico'
);

create type insumo_classe as enum (
  'herbicida', 'fungicida', 'inseticida', 'fertilizante',
  'micronutriente', 'biologico', 'semente', 'adjuvante', 'outro'
);

create type estoque_status as enum ('ok', 'baixo', 'critico', 'vazio');
create type os_status as enum ('pendente', 'andamento', 'concluida', 'cancelada');
create type os_prioridade as enum ('baixa', 'media', 'alta');

-- 1. PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  iniciais text generated always as (upper(substring(nome, 1, 1) || coalesce(substring(split_part(nome, ' ', 2), 1, 1), ''))) stored,
  telefone text,
  perfil perfil_usuario not null default 'produtor',
  cor text default '#5AAE38',
  alto_contraste boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. FAZENDAS
create table public.fazendas (
  id uuid primary key default uuid_generate_v4(),
  proprietario_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  municipio text,
  estado text,
  area_total_ha numeric(10, 2) default 0,
  latitude double precision,
  longitude double precision,
  ativa boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_fazendas_proprietario on public.fazendas(proprietario_id);

-- 3. TALHÕES
create table public.talhoes (
  id uuid primary key default uuid_generate_v4(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  codigo text not null,
  nome text,
  cultura cultura_tipo not null,
  area_ha numeric(10, 2) not null,
  fase fase_cultivo default 'preparo',
  saude integer default 100 check (saude between 0 and 100),
  geometria jsonb,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(fazenda_id, codigo)
);
create index idx_talhoes_fazenda on public.talhoes(fazenda_id);

-- 4. SAFRAS
create table public.safras (
  id uuid primary key default uuid_generate_v4(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  data_inicio date not null,
  data_fim date,
  ativa boolean default true,
  created_at timestamptz default now()
);
create index idx_safras_fazenda on public.safras(fazenda_id);

-- 5. INSUMOS
create table public.insumos (
  id uuid primary key default uuid_generate_v4(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  classe insumo_classe not null,
  unidade text not null,
  custo_unitario numeric(10, 4) not null default 0,
  carencia_dias integer default 0,
  validade date,
  fornecedor text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_insumos_fazenda on public.insumos(fazenda_id);

-- 6. ESTOQUE
create table public.estoque (
  id uuid primary key default uuid_generate_v4(),
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  quantidade_atual numeric(12, 3) not null default 0,
  quantidade_inicial numeric(12, 3) not null default 0,
  quantidade_minima numeric(12, 3) default 0,
  status estoque_status generated always as (
    case
      when quantidade_atual <= 0 then 'vazio'::estoque_status
      when quantidade_minima > 0 and quantidade_atual <= quantidade_minima * 0.5 then 'critico'::estoque_status
      when quantidade_minima > 0 and quantidade_atual <= quantidade_minima then 'baixo'::estoque_status
      else 'ok'::estoque_status
    end
  ) stored,
  updated_at timestamptz default now(),
  unique(insumo_id)
);

-- 7. OPERAÇÕES
create table public.operacoes (
  id uuid primary key default uuid_generate_v4(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  safra_id uuid references public.safras(id) on delete set null,
  executor_id uuid references public.profiles(id) on delete set null,
  categoria operacao_categoria not null,
  tipo text not null,
  data_operacao date not null,
  custo_aplicacao numeric(10, 2) default 0,
  observacoes text,
  receituario_agronomo text,
  receituario_crea text,
  receituario_emissao date,
  receituario_arquivo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_operacoes_talhao on public.operacoes(talhao_id);
create index idx_operacoes_data on public.operacoes(data_operacao desc);
create index idx_operacoes_categoria on public.operacoes(categoria);

-- 8. OPERAÇÃO_INSUMOS
create table public.operacao_insumos (
  id uuid primary key default uuid_generate_v4(),
  operacao_id uuid not null references public.operacoes(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete restrict,
  dose numeric(10, 4) not null,
  dose_unidade text not null,
  quantidade_total numeric(12, 3) not null,
  custo_total numeric(10, 2) not null,
  created_at timestamptz default now()
);
create index idx_op_insumos_operacao on public.operacao_insumos(operacao_id);

-- 9. PRODUTIVIDADES
create table public.produtividades (
  id uuid primary key default uuid_generate_v4(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  safra_id uuid not null references public.safras(id) on delete cascade,
  total_colhido numeric(12, 2) not null,
  unidade text not null default 'sacas',
  produtividade_por_ha numeric(10, 2),
  data_colheita date not null,
  observacoes text,
  created_at timestamptz default now(),
  unique(talhao_id, safra_id)
);

-- 10. OS
create table public.ordens_servico (
  id uuid primary key default uuid_generate_v4(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  numero text not null,
  operacao_recomendada text not null,
  categoria operacao_categoria,
  prioridade os_prioridade not null default 'media',
  status os_status not null default 'pendente',
  prazo date,
  observacoes text,
  criada_por_id uuid references public.profiles(id) on delete set null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  operacao_executada_id uuid references public.operacoes(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(fazenda_id, numero)
);
create index idx_os_fazenda on public.ordens_servico(fazenda_id);
create index idx_os_status on public.ordens_servico(status);

-- 11. ALERTAS
create table public.alertas (
  id uuid primary key default uuid_generate_v4(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  talhao_id uuid references public.talhoes(id) on delete cascade,
  tipo text not null,
  severidade text not null default 'media',
  titulo text not null,
  mensagem text not null,
  lido boolean default false,
  created_at timestamptz default now()
);
create index idx_alertas_fazenda on public.alertas(fazenda_id);

-- TRIGGERS
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger fazendas_updated_at before update on public.fazendas for each row execute function public.set_updated_at();
create trigger talhoes_updated_at before update on public.talhoes for each row execute function public.set_updated_at();
create trigger insumos_updated_at before update on public.insumos for each row execute function public.set_updated_at();
create trigger operacoes_updated_at before update on public.operacoes for each row execute function public.set_updated_at();
create trigger os_updated_at before update on public.ordens_servico for each row execute function public.set_updated_at();

-- Auto-criar profile ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'perfil')::perfil_usuario, 'produtor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Debitar estoque ao registrar operação_insumo
create or replace function public.debitar_estoque()
returns trigger as $$
begin
  update public.estoque
  set quantidade_atual = quantidade_atual - new.quantidade_total,
      updated_at = now()
  where insumo_id = new.insumo_id;
  return new;
end;
$$ language plpgsql;

create trigger debitar_estoque_apos_operacao
  after insert on public.operacao_insumos
  for each row execute function public.debitar_estoque();

-- VIEWS
create or replace view public.v_talhao_resumo as
select
  t.id as talhao_id, t.codigo, t.nome, t.cultura, t.area_ha, t.fase, t.saude, t.fazenda_id,
  count(distinct o.id) as total_operacoes,
  coalesce(sum(oi.custo_total), 0) as custo_insumos_total,
  coalesce(sum(o.custo_aplicacao), 0) as custo_aplicacao_total,
  coalesce(sum(oi.custo_total), 0) + coalesce(sum(o.custo_aplicacao), 0) as custo_total
from public.talhoes t
left join public.operacoes o on o.talhao_id = t.id
left join public.operacao_insumos oi on oi.operacao_id = o.id
group by t.id;
