-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · PRODUTIVIDADES (histórico de colheitas)
-- Arquivo: 001I_produtividades.sql
-- ────────────────────────────────────────────────────────────────
-- Registros de colheita por talhão e safra. Permite calcular produti-
-- vidade (saca/ha, ton/ha), receita estimada e comparar safras.
--
-- Rodar APÓS 001A..001H. Padrão de tabela operacional (RLS por
-- usuario_dono_fazenda, soft-delete via flag `ativa`).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.produtividades (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  safra_id uuid references public.safras(id) on delete set null,
  data_colheita date not null,
  quantidade_colhida numeric(14, 2) not null default 0,
  unidade text not null default 'sacas',            -- 'sacas', 'kg', 'ton', 'l', 'arrobas', 'outro'
  area_colhida_ha numeric(10, 2),                   -- pode ser <= area do talhão (colheita parcial)
  preco_unitario numeric(12, 2),                    -- preço de venda por unidade (opcional)
  observacoes text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists produtividades_fazenda_idx on public.produtividades(fazenda_id);
create index if not exists produtividades_talhao_idx on public.produtividades(talhao_id);
create index if not exists produtividades_safra_idx on public.produtividades(safra_id);
create index if not exists produtividades_data_idx on public.produtividades(data_colheita desc);

-- Trigger de updated_at
drop trigger if exists trg_produtividades_updated_at on public.produtividades;
create trigger trg_produtividades_updated_at
  before update on public.produtividades
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.produtividades enable row level security;

drop policy if exists produtividades_owner_all on public.produtividades;
create policy produtividades_owner_all on public.produtividades
  for all
  using (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

comment on table public.produtividades is
  'Histórico de colheitas por talhão e safra. Permite calcular produtividade por hectare e comparar resultados.';
comment on column public.produtividades.area_colhida_ha is
  'Área efetivamente colhida em hectares. Pode ser menor que a área do talhão em casos de colheita parcial. Se nula, usa-se a area_ha do talhão.';
comment on column public.produtividades.preco_unitario is
  'Preço de venda por unidade (R$). Opcional. Receita estimada = quantidade_colhida * preco_unitario.';
