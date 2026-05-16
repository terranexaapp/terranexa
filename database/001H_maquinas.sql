-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · MÁQUINAS E IMPLEMENTOS
-- Arquivo: 001H_maquinas.sql
-- ────────────────────────────────────────────────────────────────
-- Adiciona o módulo de máquinas/implementos da fazenda. Cada registro
-- é a frota disponível pra usar em ordens de serviço e custear
-- operações pelo `custo_hora`.
--
-- Rodar APÓS 001A..001G. Segue o mesmo padrão de tabelas operacionais
-- (RLS via usuario_dono_fazenda, soft-delete via flag `ativa`).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.maquinas (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  tipo text,                                  -- trator, colheitadeira, pulverizador, plantadeira, grade, arado, caminhao, outro
  marca text,
  modelo text,
  ano integer,
  capacidade text,                            -- livre: "75 HP", "5000 L", "8 ton", etc.
  custo_hora numeric(12, 2) not null default 0,
  horimetro_atual numeric(12, 2) not null default 0,
  observacoes text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maquinas_fazenda_idx on public.maquinas(fazenda_id);
create index if not exists maquinas_fazenda_ativa_idx on public.maquinas(fazenda_id, ativa);

-- Trigger de updated_at (a função touch_updated_at já existe em 001E)
drop trigger if exists trg_maquinas_updated_at on public.maquinas;
create trigger trg_maquinas_updated_at
  before update on public.maquinas
  for each row execute function public.touch_updated_at();

-- RLS: cada usuário só vê/edita máquinas das fazendas que possui
alter table public.maquinas enable row level security;

drop policy if exists maquinas_owner_all on public.maquinas;
create policy maquinas_owner_all on public.maquinas
  for all
  using (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

comment on table public.maquinas is
  'Frota de máquinas/implementos da fazenda. Atribuídas a OS e usadas em custeio por hora.';
comment on column public.maquinas.custo_hora is
  'Custo operacional R$/hora (combustível + manutenção + depreciação).';
comment on column public.maquinas.horimetro_atual is
  'Horas acumuladas no horímetro. Útil pra calcular consumo e manutenção preventiva.';
