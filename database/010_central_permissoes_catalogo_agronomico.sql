-- =============================================================================
-- TERRANEXA - CENTRAL DE PERMISSOES E CATALOGO AGRONOMICO
-- Arquivo: 010_central_permissoes_catalogo_agronomico.sql
-- -----------------------------------------------------------------------------
-- Objetivo:
--  1. Permitir que a Central TerraNexa administre o relacionamento
--     praga/doenca -> cultura.
--  2. Sincronizar o catalogo-mae com os catalogos por fazenda apos mudancas.
--  3. Manter a edicao restrita aos papeis internos TerraNexa.
--
-- Rodar apos 007_catalogo_pragas_mae.sql, 008 e 009.
-- Idempotente: seguro para rodar novamente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS de administracao interna do catalogo-mae
-- -----------------------------------------------------------------------------

drop policy if exists catalogo_culturas_terranexa_admin_all on public.catalogo_culturas;
create policy catalogo_culturas_terranexa_admin_all on public.catalogo_culturas
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists catalogo_pragas_terranexa_admin_all on public.catalogo_pragas;
create policy catalogo_pragas_terranexa_admin_all on public.catalogo_pragas
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists catalogo_praga_culturas_terranexa_admin_all on public.catalogo_praga_culturas;
create policy catalogo_praga_culturas_terranexa_admin_all on public.catalogo_praga_culturas
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

grant select, insert, update, delete on public.catalogo_culturas to authenticated;
grant select, insert, update, delete on public.catalogo_pragas to authenticated;
grant select, insert, update, delete on public.catalogo_praga_culturas to authenticated;
grant select, update on public.fazenda_papeis to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Sincronizacao global para catalogos por fazenda
-- -----------------------------------------------------------------------------

create or replace function public.sincronizar_catalogo_pragas_todas_fazendas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  f record;
  v_total integer := 0;
begin
  if not terranexa_private.usuario_terranexa_admin() then
    raise exception 'acesso_negado';
  end if;

  for f in select id from public.fazendas loop
    perform public.sincronizar_pragas_doencas_catalogo(f.id);
    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

create or replace function public.definir_culturas_catalogo_praga(
  p_catalogo_praga_id uuid,
  p_culturas text[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invalid text[];
  v_total integer := 0;
begin
  if not terranexa_private.usuario_terranexa_admin() then
    raise exception 'acesso_negado';
  end if;

  if p_catalogo_praga_id is null then
    raise exception 'catalogo_praga_obrigatorio';
  end if;

  if not exists (
    select 1 from public.catalogo_pragas cp
    where cp.id = p_catalogo_praga_id
  ) then
    raise exception 'catalogo_praga_nao_encontrado';
  end if;

  select array_agg(c.cultura_id)
    into v_invalid
  from unnest(coalesce(p_culturas, array[]::text[])) as c(cultura_id)
  left join public.catalogo_culturas cc on cc.id = c.cultura_id
  where cc.id is null;

  if coalesce(array_length(v_invalid, 1), 0) > 0 then
    raise exception 'culturas_invalidas: %', array_to_string(v_invalid, ',');
  end if;

  delete from public.catalogo_praga_culturas
  where catalogo_praga_id = p_catalogo_praga_id;

  insert into public.catalogo_praga_culturas (catalogo_praga_id, cultura_id)
  select distinct p_catalogo_praga_id, c.cultura_id
  from unnest(coalesce(p_culturas, array[]::text[])) as c(cultura_id)
  where c.cultura_id is not null
    and c.cultura_id <> '';

  update public.catalogo_pragas
  set updated_at = now()
  where id = p_catalogo_praga_id;

  select public.sincronizar_catalogo_pragas_todas_fazendas()
    into v_total;

  return v_total;
end;
$$;

grant execute on function public.sincronizar_catalogo_pragas_todas_fazendas() to authenticated;
grant execute on function public.definir_culturas_catalogo_praga(uuid, text[]) to authenticated;
