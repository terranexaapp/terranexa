-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · CENTROS DE CUSTO (conceito transversal)
-- Arquivo: 001J_centros_custo.sql
-- ────────────────────────────────────────────────────────────────
-- Centro de Custo NÃO é um módulo separado — é uma categorização
-- aplicada a toda transação financeira (operação, OS, compra de
-- insumo, manutenção de máquina). Permite agregar gasto por
-- "Defensivos", "Combustível", "Mão de obra", etc.
--
-- O que esta migration faz:
--  1. Cria a tabela `centros_custo` (catálogo por fazenda)
--  2. Trigger AFTER INSERT em `fazendas` que popula 34 CCs padrão
--     automaticamente toda vez que uma fazenda é criada
--  3. Backfill: popula CCs em fazendas que já existem
--  4. Adiciona FK `centro_custo_id` em `operacoes` e `ordens_servico`
--     (transação concreta — restringe deleção do CC em uso)
--  5. Adiciona FK `centro_custo_padrao_id` em `insumos` e `maquinas`
--     (sugestão default — set null se CC for deletado)
--  6. RLS + indexes
--
-- Rodar APÓS 001A..001I.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Tabela catálogo ──────────────────────────────────────────
create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  codigo text not null,                       -- 'DEFE', 'FERT', 'MAQU', etc (único por fazenda)
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

comment on table public.centros_custo is
  'Catálogo de centros de custo por fazenda. Aplicado em operações, OS, insumos e máquinas.';

-- ── 2. Função que popula os 34 CCs padrão ───────────────────────
create or replace function public.popular_centros_custo_padrao(p_fazenda_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.centros_custo (fazenda_id, codigo, nome, ordem)
  values
    -- Base operacional
    (p_fazenda_id, 'DEFE', 'Defensivos', 10),
    (p_fazenda_id, 'FERT', 'Fertilizantes', 20),
    (p_fazenda_id, 'SEME', 'Sementes', 30),
    (p_fazenda_id, 'COMB', 'Combustível e óleo', 40),
    (p_fazenda_id, 'MOBR', 'Mão de obra', 50),
    (p_fazenda_id, 'MAQU', 'Máquinas e implementos', 60),
    (p_fazenda_id, 'BENF', 'Pátio e benfeitorias', 70),
    -- Operacionais agrícolas
    (p_fazenda_id, 'CALA', 'Calagem e correção de solo', 80),
    (p_fazenda_id, 'MICR', 'Micronutrientes e bioestimulantes', 90),
    (p_fazenda_id, 'ANAL', 'Análises laboratoriais', 100),
    (p_fazenda_id, 'IRRI', 'Irrigação', 110),
    (p_fazenda_id, 'EMBA', 'Embalagens e sacaria', 120),
    (p_fazenda_id, 'ARMA', 'Armazenagem e secagem', 130),
    -- Logística e comercial
    (p_fazenda_id, 'FRET', 'Frete e transporte', 140),
    (p_fazenda_id, 'CLAS', 'Classificação e beneficiamento', 150),
    (p_fazenda_id, 'COMV', 'Comissões e corretagem', 160),
    -- Estrutura e administrativo
    (p_fazenda_id, 'ENER', 'Energia elétrica', 170),
    (p_fazenda_id, 'TELC', 'Telecomunicações', 180),
    (p_fazenda_id, 'TIIN', 'TI e software', 190),
    (p_fazenda_id, 'ADMI', 'Administrativo', 200),
    -- Tributário e financeiro
    (p_fazenda_id, 'IMPO', 'Impostos e taxas', 210),
    (p_fazenda_id, 'FINA', 'Financeiro', 220),
    (p_fazenda_id, 'SEGS', 'Seguros', 230),
    (p_fazenda_id, 'ARRE', 'Arrendamento', 240),
    -- Pessoal
    (p_fazenda_id, 'TREI', 'Treinamento e capacitação', 250),
    (p_fazenda_id, 'EPI',  'EPIs e segurança do trabalho', 260),
    (p_fazenda_id, 'BPES', 'Benefícios da equipe', 270),
    -- Pecuária
    (p_fazenda_id, 'PECU', 'Pecuária', 280),
    (p_fazenda_id, 'PAST', 'Pastagem', 290),
    -- Recursos naturais
    (p_fazenda_id, 'AGUA', 'Água e outorga', 300),
    (p_fazenda_id, 'AMBI', 'Ambiental e licenciamento', 310),
    -- Pesquisa e consultoria
    (p_fazenda_id, 'MELH', 'Melhoramento e testes', 320),
    (p_fazenda_id, 'CONS', 'Consultoria', 330),
    -- Genérico
    (p_fazenda_id, 'OUTR', 'Outros', 999)
  on conflict (fazenda_id, codigo) do nothing;
end;
$$;

-- ── 3. Trigger que popula CCs ao criar fazenda ──────────────────
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

-- ── 4. Backfill: popular CCs em fazendas pré-existentes ─────────
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

-- ── 5. FK nas tabelas de transação financeira ───────────────────
-- operacoes e ordens_servico: restrict (não pode deletar CC em uso)
alter table public.operacoes
  add column if not exists centro_custo_id uuid
  references public.centros_custo(id) on delete restrict;

alter table public.ordens_servico
  add column if not exists centro_custo_id uuid
  references public.centros_custo(id) on delete restrict;

create index if not exists operacoes_centro_custo_idx
  on public.operacoes(centro_custo_id);
create index if not exists ordens_servico_centro_custo_idx
  on public.ordens_servico(centro_custo_id);

-- insumos e maquinas: set null (default é sugestão; CC pode sumir)
alter table public.insumos
  add column if not exists centro_custo_padrao_id uuid
  references public.centros_custo(id) on delete set null;

alter table public.maquinas
  add column if not exists centro_custo_padrao_id uuid
  references public.centros_custo(id) on delete set null;

create index if not exists insumos_centro_custo_padrao_idx
  on public.insumos(centro_custo_padrao_id);
create index if not exists maquinas_centro_custo_padrao_idx
  on public.maquinas(centro_custo_padrao_id);

comment on column public.operacoes.centro_custo_id is
  'Centro de custo onde essa operação é registrada (obrigatório em registros novos).';
comment on column public.ordens_servico.centro_custo_id is
  'Centro de custo onde essa OS é registrada (obrigatório em registros novos).';
comment on column public.insumos.centro_custo_padrao_id is
  'Centro de custo sugerido como default quando este insumo for usado em operações.';
comment on column public.maquinas.centro_custo_padrao_id is
  'Centro de custo sugerido como default para custos da máquina (manutenção, combustível).';
