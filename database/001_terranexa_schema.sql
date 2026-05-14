create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  papel text not null default 'produtor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists papel text not null default 'produtor';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.fazendas (
  id uuid primary key default gen_random_uuid(),
  proprietario_id uuid references public.profiles(id) on delete set null,
  nome text not null,
  municipio text,
  estado text,
  endereco text,
  area_total_ha numeric(14, 2) not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fazendas add column if not exists proprietario_id uuid references public.profiles(id) on delete set null;
alter table public.fazendas add column if not exists municipio text;
alter table public.fazendas add column if not exists estado text;
alter table public.fazendas add column if not exists endereco text;
alter table public.fazendas add column if not exists area_total_ha numeric(14, 2) not null default 0;
alter table public.fazendas add column if not exists ativa boolean not null default true;
alter table public.fazendas add column if not exists updated_at timestamptz not null default now();

create table if not exists public.safras (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  cultura text,
  inicio date,
  fim date,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.talhoes (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  codigo text not null,
  nome text,
  cultura text,
  variedade text,
  fase text not null default 'preparo',
  saude text not null default 'boa',
  area_ha numeric(14, 2) not null default 0,
  geometria jsonb,
  arquivo_origem_bucket text,
  arquivo_origem_path text,
  arquivo_origem_nome text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fazenda_id, codigo)
);

alter table public.talhoes add column if not exists nome text;
alter table public.talhoes add column if not exists cultura text;
alter table public.talhoes add column if not exists variedade text;
alter table public.talhoes add column if not exists fase text not null default 'preparo';
alter table public.talhoes add column if not exists saude text not null default 'boa';
alter table public.talhoes add column if not exists area_ha numeric(14, 2) not null default 0;
alter table public.talhoes add column if not exists geometria jsonb;
alter table public.talhoes add column if not exists arquivo_origem_bucket text;
alter table public.talhoes add column if not exists arquivo_origem_path text;
alter table public.talhoes add column if not exists arquivo_origem_nome text;
alter table public.talhoes add column if not exists ativo boolean not null default true;
alter table public.talhoes add column if not exists updated_at timestamptz not null default now();

create index if not exists talhoes_fazenda_codigo_idx on public.talhoes(fazenda_id, codigo);

create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  responsavel text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  classe text not null default 'outro',
  unidade text not null default 'un',
  custo_unitario numeric(14, 2) not null default 0,
  carencia_dias integer not null default 0,
  fornecedor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fazenda_id, nome)
);

create table if not exists public.estoque (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null unique references public.insumos(id) on delete cascade,
  quantidade_atual numeric(14, 2) not null default 0,
  quantidade_inicial numeric(14, 2) not null default 0,
  quantidade_minima numeric(14, 2) not null default 0,
  status text generated always as (
    case
      when quantidade_atual <= 0 then 'vazio'
      when quantidade_atual <= quantidade_minima then 'critico'
      when quantidade_minima > 0 and quantidade_atual <= quantidade_minima * 1.5 then 'baixo'
      else 'ok'
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operacoes (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  safra_id uuid references public.safras(id) on delete set null,
  categoria text not null,
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

create index if not exists operacoes_talhao_data_idx on public.operacoes(talhao_id, data_operacao desc);

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
  numero text not null,
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
  updated_at timestamptz not null default now(),
  unique (fazenda_id, numero)
);

create table if not exists public.os_talhoes (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  unique (os_id, talhao_id)
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

create table if not exists public.pluviometros (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  talhao_id uuid references public.talhoes(id) on delete set null,
  nome text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chuva_registros (
  id uuid primary key default gen_random_uuid(),
  pluviometro_id uuid not null references public.pluviometros(id) on delete cascade,
  medido_em date not null,
  chuva_mm numeric(10, 2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.amostras_solo (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  coletado_em date not null,
  camada text not null default '0-20 cm',
  parametro text not null,
  valor numeric(14, 4),
  unidade text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  arquivo_origem_bucket text,
  arquivo_origem_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.monitoramentos (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  tecnico_id uuid references public.profiles(id) on delete set null,
  visitado_em timestamptz not null default now(),
  dano text not null default 'sem_dano_economico',
  severidade text not null default 'baixa',
  observacoes text,
  status text not null default 'realizado',
  created_at timestamptz not null default now()
);

create table if not exists public.monitoramento_pontos (
  id uuid primary key default gen_random_uuid(),
  monitoramento_id uuid not null references public.monitoramentos(id) on delete cascade,
  tipo text not null default 'ponto',
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  precisao_m numeric(10, 2),
  foto_bucket text,
  foto_path text,
  observacoes text,
  registrado_em timestamptz not null default now()
);

create table if not exists public.monitoramento_caminhamentos (
  id uuid primary key default gen_random_uuid(),
  monitoramento_id uuid not null references public.monitoramentos(id) on delete cascade,
  trilha jsonb not null default '[]'::jsonb,
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.armadilhas (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid references public.talhoes(id) on delete set null,
  nome text not null,
  alvo text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.relatorios (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'agronomico',
  status text not null default 'rascunho',
  arquivo_bucket text,
  arquivo_path text,
  periodo_inicio date,
  periodo_fim date,
  gerado_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.safras add column if not exists cultura text;
alter table public.safras add column if not exists inicio date;
alter table public.safras add column if not exists fim date;
alter table public.safras add column if not exists ativa boolean not null default true;
alter table public.safras add column if not exists created_at timestamptz not null default now();
alter table public.safras add column if not exists updated_at timestamptz not null default now();

alter table public.equipes add column if not exists responsavel text;
alter table public.equipes add column if not exists ativa boolean not null default true;
alter table public.equipes add column if not exists created_at timestamptz not null default now();
alter table public.equipes add column if not exists updated_at timestamptz not null default now();

alter table public.insumos add column if not exists classe text not null default 'outro';
alter table public.insumos add column if not exists unidade text not null default 'un';
alter table public.insumos add column if not exists custo_unitario numeric(14, 2) not null default 0;
alter table public.insumos add column if not exists carencia_dias integer not null default 0;
alter table public.insumos add column if not exists fornecedor text;
alter table public.insumos add column if not exists ativo boolean not null default true;
alter table public.insumos add column if not exists created_at timestamptz not null default now();
alter table public.insumos add column if not exists updated_at timestamptz not null default now();

alter table public.estoque add column if not exists quantidade_atual numeric(14, 2) not null default 0;
alter table public.estoque add column if not exists quantidade_inicial numeric(14, 2) not null default 0;
alter table public.estoque add column if not exists quantidade_minima numeric(14, 2) not null default 0;
alter table public.estoque add column if not exists status text;
alter table public.estoque add column if not exists created_at timestamptz not null default now();
alter table public.estoque add column if not exists updated_at timestamptz not null default now();

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email)
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.profiles.nome, excluded.nome),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','fazendas','safras','talhoes','equipes','insumos','estoque','operacoes','ordens_servico']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end;
$$;

create or replace function public.usuario_dono_fazenda(p_fazenda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fazendas f
    where f.id = p_fazenda_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.usuario_dono_talhao(p_talhao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.talhoes t
    join public.fazendas f on f.id = t.fazenda_id
    where t.id = p_talhao_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.usuario_dono_insumo(p_insumo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.insumos i
    join public.fazendas f on f.id = i.fazenda_id
    where i.id = p_insumo_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.usuario_dono_operacao(p_operacao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.operacoes o
    join public.talhoes t on t.id = o.talhao_id
    join public.fazendas f on f.id = t.fazenda_id
    where o.id = p_operacao_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.usuario_dono_os(p_os_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ordens_servico os
    join public.fazendas f on f.id = os.fazenda_id
    where os.id = p_os_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.proximo_numero_os(p_fazenda_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo integer;
begin
  if not public.usuario_dono_fazenda(p_fazenda_id) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::integer), 0) + 1
    into proximo
  from public.ordens_servico
  where fazenda_id = p_fazenda_id;

  return 'OS-' || lpad(proximo::text, 4, '0');
end;
$$;

create or replace function public.fechar_os_v2(
  p_os_id uuid,
  p_talhao_id uuid,
  p_data_execucao date,
  p_custo_aplicacao numeric,
  p_observacoes text,
  p_receituario_agronomo text,
  p_receituario_crea text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_operacao_id uuid;
begin
  if not public.usuario_dono_os(p_os_id) or not public.usuario_dono_talhao(p_talhao_id) then
    raise exception 'Acesso negado';
  end if;

  select * into v_os from public.ordens_servico where id = p_os_id;

  insert into public.operacoes (
    talhao_id, categoria, tipo, data_operacao, custo_aplicacao,
    observacoes, receituario_agronomo, receituario_crea
  )
  values (
    p_talhao_id,
    coalesce(v_os.categoria, 'outros'),
    coalesce(v_os.operacao_recomendada, v_os.servico, v_os.operacao_mae, 'Operacao'),
    p_data_execucao,
    coalesce(p_custo_aplicacao, 0),
    p_observacoes,
    p_receituario_agronomo,
    p_receituario_crea
  )
  returning id into v_operacao_id;

  insert into public.operacao_insumos (
    operacao_id, insumo_id, dose, dose_unidade, quantidade_total, custo_total
  )
  select
    v_operacao_id,
    oi.insumo_id,
    coalesce(oi.dose_real, oi.dose_recomendada, 0),
    oi.dose_unidade,
    coalesce(oi.quantidade_real, 0),
    coalesce(oi.custo_real, 0)
  from public.os_insumos oi
  where oi.os_id = p_os_id;

  return v_operacao_id;
end;
$$;

create or replace function public.popular_catalogo_base(p_fazenda_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inseridos integer;
begin
  if not public.usuario_dono_fazenda(p_fazenda_id) then
    raise exception 'Acesso negado';
  end if;

  insert into public.insumos (fazenda_id, nome, classe, unidade, custo_unitario, carencia_dias, fornecedor)
  values
    (p_fazenda_id, 'Glifosato', 'herbicida', 'L', 0, 0, null),
    (p_fazenda_id, '2,4-D', 'herbicida', 'L', 0, 0, null),
    (p_fazenda_id, 'Fungicida multissitio', 'fungicida', 'kg', 0, 0, null),
    (p_fazenda_id, 'Inseticida fisiologico', 'inseticida', 'L', 0, 0, null),
    (p_fazenda_id, 'Adjuvante', 'adjuvante', 'L', 0, 0, null),
    (p_fazenda_id, 'Fertilizante NPK', 'fertilizante', 'kg', 0, 0, null)
  on conflict (fazenda_id, nome) do nothing;

  get diagnostics inseridos = row_count;

  insert into public.estoque (insumo_id)
  select i.id
  from public.insumos i
  left join public.estoque e on e.insumo_id = i.id
  where i.fazenda_id = p_fazenda_id
    and e.id is null;

  return inseridos;
end;
$$;

create or replace view public.v_custo_por_categoria as
with custo_operacao as (
  select
    o.id,
    o.talhao_id,
    o.categoria,
    coalesce(o.custo_aplicacao, 0) + coalesce(sum(oi.custo_total), 0) as custo_total
  from public.operacoes o
  left join public.operacao_insumos oi on oi.operacao_id = o.id
  group by o.id
)
select
  talhao_id,
  categoria,
  count(*)::integer as qtd_operacoes,
  sum(custo_total)::numeric(14, 2) as custo_total
from custo_operacao
group by talhao_id, categoria;

alter table public.profiles enable row level security;
alter table public.fazendas enable row level security;
alter table public.safras enable row level security;
alter table public.talhoes enable row level security;
alter table public.equipes enable row level security;
alter table public.insumos enable row level security;
alter table public.estoque enable row level security;
alter table public.operacoes enable row level security;
alter table public.operacao_insumos enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.os_talhoes enable row level security;
alter table public.os_insumos enable row level security;
alter table public.pluviometros enable row level security;
alter table public.chuva_registros enable row level security;
alter table public.amostras_solo enable row level security;
alter table public.monitoramentos enable row level security;
alter table public.monitoramento_pontos enable row level security;
alter table public.monitoramento_caminhamentos enable row level security;
alter table public.armadilhas enable row level security;
alter table public.relatorios enable row level security;

drop policy if exists profiles_own_all on public.profiles;
create policy profiles_own_all on public.profiles
for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists fazendas_owner_all on public.fazendas;
create policy fazendas_owner_all on public.fazendas
for all using (proprietario_id = auth.uid()) with check (proprietario_id = auth.uid());

drop policy if exists safras_owner_all on public.safras;
create policy safras_owner_all on public.safras
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists talhoes_owner_all on public.talhoes;
create policy talhoes_owner_all on public.talhoes
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists equipes_owner_all on public.equipes;
create policy equipes_owner_all on public.equipes
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists insumos_owner_all on public.insumos;
create policy insumos_owner_all on public.insumos
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists estoque_owner_all on public.estoque;
create policy estoque_owner_all on public.estoque
for all using (public.usuario_dono_insumo(insumo_id)) with check (public.usuario_dono_insumo(insumo_id));

drop policy if exists operacoes_owner_all on public.operacoes;
create policy operacoes_owner_all on public.operacoes
for all using (public.usuario_dono_talhao(talhao_id)) with check (public.usuario_dono_talhao(talhao_id));

drop policy if exists operacao_insumos_owner_all on public.operacao_insumos;
create policy operacao_insumos_owner_all on public.operacao_insumos
for all using (public.usuario_dono_operacao(operacao_id)) with check (public.usuario_dono_operacao(operacao_id));

drop policy if exists ordens_servico_owner_all on public.ordens_servico;
create policy ordens_servico_owner_all on public.ordens_servico
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists os_talhoes_owner_all on public.os_talhoes;
create policy os_talhoes_owner_all on public.os_talhoes
for all using (public.usuario_dono_os(os_id)) with check (public.usuario_dono_os(os_id) and public.usuario_dono_talhao(talhao_id));

drop policy if exists os_insumos_owner_all on public.os_insumos;
create policy os_insumos_owner_all on public.os_insumos
for all using (public.usuario_dono_os(os_id)) with check (public.usuario_dono_os(os_id));

drop policy if exists pluviometros_owner_all on public.pluviometros;
create policy pluviometros_owner_all on public.pluviometros
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists chuva_registros_owner_all on public.chuva_registros;
create policy chuva_registros_owner_all on public.chuva_registros
for all using (
  exists (
    select 1 from public.pluviometros p
    where p.id = pluviometro_id and public.usuario_dono_fazenda(p.fazenda_id)
  )
) with check (
  exists (
    select 1 from public.pluviometros p
    where p.id = pluviometro_id and public.usuario_dono_fazenda(p.fazenda_id)
  )
);

drop policy if exists amostras_solo_owner_all on public.amostras_solo;
create policy amostras_solo_owner_all on public.amostras_solo
for all using (public.usuario_dono_talhao(talhao_id)) with check (public.usuario_dono_talhao(talhao_id));

drop policy if exists monitoramentos_owner_all on public.monitoramentos;
create policy monitoramentos_owner_all on public.monitoramentos
for all using (public.usuario_dono_talhao(talhao_id)) with check (public.usuario_dono_talhao(talhao_id));

drop policy if exists monitoramento_pontos_owner_all on public.monitoramento_pontos;
create policy monitoramento_pontos_owner_all on public.monitoramento_pontos
for all using (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
) with check (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
);

drop policy if exists monitoramento_caminhamentos_owner_all on public.monitoramento_caminhamentos;
create policy monitoramento_caminhamentos_owner_all on public.monitoramento_caminhamentos
for all using (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
) with check (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
);

drop policy if exists armadilhas_owner_all on public.armadilhas;
create policy armadilhas_owner_all on public.armadilhas
for all using (talhao_id is null or public.usuario_dono_talhao(talhao_id))
with check (talhao_id is null or public.usuario_dono_talhao(talhao_id));

drop policy if exists relatorios_owner_all on public.relatorios;
create policy relatorios_owner_all on public.relatorios
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));
