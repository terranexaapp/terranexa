-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · GEOMETRIA E ÁREA AUTOMÁTICA
-- Arquivo: 001G_area_trigger.sql
-- ────────────────────────────────────────────────────────────────
-- Adiciona suporte a geometria GeoJSON em fazendas (opcional) e
-- trigger que recalcula `area_total_ha` automaticamente sempre que
-- um talhão é criado, editado ou desativado.
--
-- Rodar APÓS 001A..001E (precisa das tabelas e funções base).
-- Antes de rodar 001F* (RLS) também é seguro — o trigger é SECURITY
-- INVOKER por padrão e respeita as policies do usuário.
-- ════════════════════════════════════════════════════════════════

-- 1. Coluna de geometria em fazendas (opcional; útil pra bbox/centroide)
alter table public.fazendas
  add column if not exists geometria jsonb;

comment on column public.fazendas.geometria is
  'GeoJSON Feature com bounds/centroide opcional da fazenda inteira';
comment on column public.talhoes.geometria is
  'GeoJSON Feature com Polygon ou MultiPolygon do contorno do talhão';

-- 2. Trigger que mantém fazendas.area_total_ha = soma dos talhões ativos
create or replace function public.atualizar_area_fazenda()
returns trigger
language plpgsql
as $$
declare
  v_fazenda_id uuid;
begin
  if (tg_op = 'DELETE') then
    v_fazenda_id := old.fazenda_id;
  else
    v_fazenda_id := new.fazenda_id;
  end if;

  update public.fazendas
  set area_total_ha = coalesce(
        (select sum(area_ha) from public.talhoes
         where fazenda_id = v_fazenda_id and ativo = true),
        0
      ),
      updated_at = now()
  where id = v_fazenda_id;

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_atualizar_area_fazenda_insert on public.talhoes;
drop trigger if exists trg_atualizar_area_fazenda_update on public.talhoes;
drop trigger if exists trg_atualizar_area_fazenda_delete on public.talhoes;

create trigger trg_atualizar_area_fazenda_insert
  after insert on public.talhoes
  for each row execute function public.atualizar_area_fazenda();

create trigger trg_atualizar_area_fazenda_update
  after update of area_ha, ativo, fazenda_id on public.talhoes
  for each row execute function public.atualizar_area_fazenda();

create trigger trg_atualizar_area_fazenda_delete
  after delete on public.talhoes
  for each row execute function public.atualizar_area_fazenda();
