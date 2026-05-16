-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · ROW LEVEL SECURITY (RLS)
-- Migration: 002_rls_policies
-- ────────────────────────────────────────────────────────────────
-- Habilita RLS em todas as tabelas do schema 001 e define policies
-- garantindo que cada produtor enxergue apenas os próprios dados.
--
-- Helpers em SECURITY DEFINER evitam recursão e tornam as policies
-- mais legíveis (mantemos uma única fonte de verdade para a regra
-- "usuário é dono da fazenda/talhão/operação").
-- ════════════════════════════════════════════════════════════════

-- 1) HELPERS ────────────────────────────────────────────────────

create or replace function public.usuario_dono_fazenda(p_fazenda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fazendas f
    where f.id = p_fazenda_id and f.proprietario_id = auth.uid()
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
    where t.id = p_talhao_id and f.proprietario_id = auth.uid()
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
    where i.id = p_insumo_id and f.proprietario_id = auth.uid()
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
    join public.talhoes  t on t.id = o.talhao_id
    join public.fazendas f on f.id = t.fazenda_id
    where o.id = p_operacao_id and f.proprietario_id = auth.uid()
  );
$$;

-- 2) ENABLE RLS ─────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.fazendas         enable row level security;
alter table public.talhoes          enable row level security;
alter table public.safras           enable row level security;
alter table public.insumos          enable row level security;
alter table public.estoque          enable row level security;
alter table public.operacoes        enable row level security;
alter table public.operacao_insumos enable row level security;
alter table public.produtividades   enable row level security;
alter table public.ordens_servico   enable row level security;
alter table public.alertas          enable row level security;

-- 3) POLICIES ───────────────────────────────────────────────────

-- profiles: usuário só lê/escreve o próprio perfil
drop policy if exists profiles_self_all on public.profiles;
create policy profiles_self_all on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- fazendas: dono full access
drop policy if exists fazendas_owner_all on public.fazendas;
create policy fazendas_owner_all on public.fazendas
  for all
  using  (proprietario_id = auth.uid())
  with check (proprietario_id = auth.uid());

-- talhoes
drop policy if exists talhoes_owner_all on public.talhoes;
create policy talhoes_owner_all on public.talhoes
  for all
  using  (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

-- safras
drop policy if exists safras_owner_all on public.safras;
create policy safras_owner_all on public.safras
  for all
  using  (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

-- insumos
drop policy if exists insumos_owner_all on public.insumos;
create policy insumos_owner_all on public.insumos
  for all
  using  (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

-- estoque (ligação via insumo_id)
drop policy if exists estoque_owner_all on public.estoque;
create policy estoque_owner_all on public.estoque
  for all
  using  (public.usuario_dono_insumo(insumo_id))
  with check (public.usuario_dono_insumo(insumo_id));

-- operacoes (ligação via talhao_id)
drop policy if exists operacoes_owner_all on public.operacoes;
create policy operacoes_owner_all on public.operacoes
  for all
  using  (public.usuario_dono_talhao(talhao_id))
  with check (public.usuario_dono_talhao(talhao_id));

-- operacao_insumos (ligação via operacao_id)
drop policy if exists operacao_insumos_owner_all on public.operacao_insumos;
create policy operacao_insumos_owner_all on public.operacao_insumos
  for all
  using  (public.usuario_dono_operacao(operacao_id))
  with check (public.usuario_dono_operacao(operacao_id));

-- produtividades (ligação via talhao_id)
drop policy if exists produtividades_owner_all on public.produtividades;
create policy produtividades_owner_all on public.produtividades
  for all
  using  (public.usuario_dono_talhao(talhao_id))
  with check (public.usuario_dono_talhao(talhao_id));

-- ordens_servico
drop policy if exists ordens_servico_owner_all on public.ordens_servico;
create policy ordens_servico_owner_all on public.ordens_servico
  for all
  using  (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

-- alertas
drop policy if exists alertas_owner_all on public.alertas;
create policy alertas_owner_all on public.alertas
  for all
  using  (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));
