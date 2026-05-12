-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · GEOMETRIA E ÁREA AUTOMÁTICA
-- Migration: 004_geometria_e_area_automatica
-- ────────────────────────────────────────────────────────────────
-- Adiciona suporte a geometria GeoJSON em fazendas e melhora
-- o cálculo automático de área total da fazenda baseado na soma
-- das áreas dos talhões.
-- ════════════════════════════════════════════════════════════════

-- 1. Adicionar coluna de geometria em fazendas (centroide + bbox)
alter table public.fazendas
  add column if not exists geometria jsonb,
  add column if not exists endereco text;

-- 2. Trigger que atualiza area_total_ha da fazenda automaticamente
--    sempre que um talhão é criado, editado ou deletado
create or replace function public.atualizar_area_fazenda()
returns trigger as $$
declare
  v_fazenda_id uuid;
begin
  -- Pega o ID da fazenda afetada
  if (tg_op = 'DELETE') then
    v_fazenda_id := old.fazenda_id;
  else
    v_fazenda_id := new.fazenda_id;
  end if;

  -- Recalcula a soma das áreas dos talhões ativos
  update public.fazendas
  set area_total_ha = coalesce((
    select sum(area_ha)
    from public.talhoes
    where fazenda_id = v_fazenda_id and ativo = true
  ), 0),
  updated_at = now()
  where id = v_fazenda_id;

  if (tg_op = 'DELETE') then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql;

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

comment on column public.fazendas.geometria is 'GeoJSON Feature com bounds/centroide opcional da fazenda inteira';
comment on column public.talhoes.geometria is 'GeoJSON Feature com Polygon ou MultiPolygon do contorno do talhão';
