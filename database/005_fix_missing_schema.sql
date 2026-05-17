-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · FIX DE MIGRATIONS PARCIAIS (005)
-- ────────────────────────────────────────────────────────────────
-- Patch idempotente que alinha o projeto remoto com o código do
-- app. Necessário porque 001H/001I/001J nunca foram rodadas no
-- Supabase (ou foram rodadas em versão antiga). Sintomas que isso
-- corrige:
--   - "null value in column \"data_inicio\" of relation \"safras\""
--   - "column operacoes.centro_custo_id does not exist"
--   - "column insumos.centro_custo_padrao_id does not exist"
--   - "column produtividades.fazenda_id does not exist"
--   - "column monitoramento_pontos.created_at does not exist"
--
-- O que faz:
--   1. safras.data_inicio (legado NOT NULL) → nullable
--   2. monitoramento_pontos: adiciona created_at
--   3. produtividades: dropa schema antigo (0 linhas) e recria
--      conforme 001I (com fazenda_id, quantidade_colhida, etc.)
--   4. Cria tabela maquinas (001H) + RLS
--   5. Cria tabela centros_custo (001J) + RLS + função de seed +
--      trigger AFTER INSERT em fazendas + backfill nas existentes
--   6. Adiciona FKs centro_custo_id em operacoes/ordens_servico e
--      centro_custo_padrao_id em insumos/maquinas
-- ════════════════════════════════════════════════════════════════

-- 1. safras: tornar coluna legada opcional
alter table public.safras alter column data_inicio drop not null;

-- 2. monitoramento_pontos: created_at usado pelo app
alter table public.monitoramento_pontos
  add column if not exists created_at timestamptz not null default now();

-- 3. produtividades: schema antigo incompatível, sem dados — recria
drop table if exists public.produtividades cascade;
create table public.produtividades (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  safra_id uuid references public.safras(id) on delete set null,
  data_colheita date not null,
  quantidade_colhida numeric(14, 2) not null default 0,
  unidade text not null default 'sacas',
  area_colhida_ha numeric(10, 2),
  preco_unitario numeric(12, 2),
  observacoes text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index produtividades_fazenda_idx on public.produtividades(fazenda_id);
create index produtividades_talhao_idx on public.produtividades(talhao_id);
create index produtividades_safra_idx on public.produtividades(safra_id);
create index produtividades_data_idx on public.produtividades(data_colheita desc);
create trigger trg_produtividades_updated_at
  before update on public.produtividades
  for each row execute function public.touch_updated_at();
alter table public.produtividades enable row level security;
create policy produtividades_owner_all on public.produtividades
  for all
  using (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

-- 4. maquinas (001H)
create table if not exists public.maquinas (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  tipo text,
  marca text,
  modelo text,
  ano integer,
  capacidade text,
  custo_hora numeric(12, 2) not null default 0,
  horimetro_atual numeric(12, 2) not null default 0,
  observacoes text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists maquinas_fazenda_idx on public.maquinas(fazenda_id);
create index if not exists maquinas_fazenda_ativa_idx on public.maquinas(fazenda_id, ativa);
drop trigger if exists trg_maquinas_updated_at on public.maquinas;
create trigger trg_maquinas_updated_at
  before update on public.maquinas
  for each row execute function public.touch_updated_at();
alter table public.maquinas enable row level security;
drop policy if exists maquinas_owner_all on public.maquinas;
create policy maquinas_owner_all on public.maquinas
  for all
  using (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

-- 5. centros_custo (001J)
create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fazenda_id, codigo)
);
create index if not exists centros_custo_fazenda_idx on public.centros_custo(fazenda_id);
create index if not exists centros_custo_fazenda_ativo_idx on public.centros_custo(fazenda_id, ativo);
drop trigger if exists trg_centros_custo_updated_at on public.centros_custo;
create trigger trg_centros_custo_updated_at
  before update on public.centros_custo
  for each row execute function public.touch_updated_at();
alter table public.centros_custo enable row level security;
drop policy if exists centros_custo_owner_all on public.centros_custo;
create policy centros_custo_owner_all on public.centros_custo
  for all
  using (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

-- 6. Função de seed dos 34 CCs padrão
create or replace function public.popular_centros_custo_padrao(p_fazenda_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.centros_custo (fazenda_id, codigo, nome, ordem)
  values
    (p_fazenda_id, 'DEFE', 'Defensivos', 10),
    (p_fazenda_id, 'FERT', 'Fertilizantes', 20),
    (p_fazenda_id, 'SEME', 'Sementes', 30),
    (p_fazenda_id, 'COMB', 'Combustível e óleo', 40),
    (p_fazenda_id, 'MOBR', 'Mão de obra', 50),
    (p_fazenda_id, 'MAQU', 'Máquinas e implementos', 60),
    (p_fazenda_id, 'BENF', 'Pátio e benfeitorias', 70),
    (p_fazenda_id, 'CALA', 'Calagem e correção de solo', 80),
    (p_fazenda_id, 'MICR', 'Micronutrientes e bioestimulantes', 90),
    (p_fazenda_id, 'ANAL', 'Análises laboratoriais', 100),
    (p_fazenda_id, 'IRRI', 'Irrigação', 110),
    (p_fazenda_id, 'EMBA', 'Embalagens e sacaria', 120),
    (p_fazenda_id, 'ARMA', 'Armazenagem e secagem', 130),
    (p_fazenda_id, 'FRET', 'Frete e transporte', 140),
    (p_fazenda_id, 'CLAS', 'Classificação e beneficiamento', 150),
    (p_fazenda_id, 'COMV', 'Comissões e corretagem', 160),
    (p_fazenda_id, 'ENER', 'Energia elétrica', 170),
    (p_fazenda_id, 'TELC', 'Telecomunicações', 180),
    (p_fazenda_id, 'TIIN', 'TI e software', 190),
    (p_fazenda_id, 'ADMI', 'Administrativo', 200),
    (p_fazenda_id, 'IMPO', 'Impostos e taxas', 210),
    (p_fazenda_id, 'FINA', 'Financeiro', 220),
    (p_fazenda_id, 'SEGS', 'Seguros', 230),
    (p_fazenda_id, 'ARRE', 'Arrendamento', 240),
    (p_fazenda_id, 'TREI', 'Treinamento e capacitação', 250),
    (p_fazenda_id, 'EPI',  'EPIs e segurança do trabalho', 260),
    (p_fazenda_id, 'BPES', 'Benefícios da equipe', 270),
    (p_fazenda_id, 'PECU', 'Pecuária', 280),
    (p_fazenda_id, 'PAST', 'Pastagem', 290),
    (p_fazenda_id, 'AGUA', 'Água e outorga', 300),
    (p_fazenda_id, 'AMBI', 'Ambiental e licenciamento', 310),
    (p_fazenda_id, 'MELH', 'Melhoramento e testes', 320),
    (p_fazenda_id, 'CONS', 'Consultoria', 330),
    (p_fazenda_id, 'OUTR', 'Outros', 999)
  on conflict (fazenda_id, codigo) do nothing;
end;
$$;

create or replace function public.trg_fn_centros_custo_seed()
returns trigger
language plpgsql
as $$
begin
  perform public.popular_centros_custo_padrao(new.id);
  return new;
end;
$$;

drop trigger if exists trg_centros_custo_seed on public.fazendas;
create trigger trg_centros_custo_seed
  after insert on public.fazendas
  for each row execute function public.trg_fn_centros_custo_seed();

-- 7. Backfill nas fazendas pré-existentes
do $$
declare
  f record;
begin
  for f in
    select id from public.fazendas
    where id not in (select distinct fazenda_id from public.centros_custo)
  loop
    perform public.popular_centros_custo_padrao(f.id);
  end loop;
end;
$$;

-- 8. FKs centro_custo nas tabelas de transação financeira
alter table public.operacoes
  add column if not exists centro_custo_id uuid
  references public.centros_custo(id) on delete restrict;
alter table public.ordens_servico
  add column if not exists centro_custo_id uuid
  references public.centros_custo(id) on delete restrict;
alter table public.insumos
  add column if not exists centro_custo_padrao_id uuid
  references public.centros_custo(id) on delete set null;
alter table public.maquinas
  add column if not exists centro_custo_padrao_id uuid
  references public.centros_custo(id) on delete set null;

create index if not exists operacoes_centro_custo_idx on public.operacoes(centro_custo_id);
create index if not exists ordens_servico_centro_custo_idx on public.ordens_servico(centro_custo_id);
create index if not exists insumos_centro_custo_padrao_idx on public.insumos(centro_custo_padrao_id);
create index if not exists maquinas_centro_custo_padrao_idx on public.maquinas(centro_custo_padrao_id);
