-- =============================================================================
-- TERRANEXA - CORRECAO RLS DO CATALOGO AGRONOMICO
-- Arquivo: 013_corrigir_rls_catalogo_culturas.sql
-- -----------------------------------------------------------------------------
-- Objetivo:
--  1. Consolidar as policies de escrita do catalogo-mae para usuarios internos.
--  2. Recriar a RPC de culturas com execucao protegida e grants completos.
--  3. Evitar erro de RLS em public.catalogo_praga_culturas ao editar culturas.
--
-- Rodar apos 007, 008, 009, 010, 011 e 012.
-- Idempotente: seguro para rodar novamente.
-- =============================================================================

create schema if not exists terranexa_private;
revoke all on schema terranexa_private from public;
grant usage on schema terranexa_private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. Policies e grants do catalogo-mae
-- -----------------------------------------------------------------------------

alter table public.catalogo_culturas enable row level security;
alter table public.catalogo_pragas enable row level security;
alter table public.catalogo_praga_culturas enable row level security;

drop policy if exists catalogo_culturas_terranexa_admin_all on public.catalogo_culturas;
create policy catalogo_culturas_terranexa_admin_all on public.catalogo_culturas
for all
to authenticated
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists catalogo_pragas_terranexa_admin_all on public.catalogo_pragas;
create policy catalogo_pragas_terranexa_admin_all on public.catalogo_pragas
for all
to authenticated
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists catalogo_praga_culturas_terranexa_admin_all on public.catalogo_praga_culturas;
create policy catalogo_praga_culturas_terranexa_admin_all on public.catalogo_praga_culturas
for all
to authenticated
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

grant select, insert, update, delete on public.catalogo_culturas to authenticated, service_role;
grant select, insert, update, delete on public.catalogo_pragas to authenticated, service_role;
grant select, insert, update, delete on public.catalogo_praga_culturas to authenticated, service_role;
grant select, insert, update, delete on public.pragas_doencas to authenticated, service_role;
grant select on public.fazendas to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Sincronizacao do catalogo central para as fazendas
-- -----------------------------------------------------------------------------

create or replace function public.sincronizar_pragas_doencas_catalogo(p_fazenda_id uuid)
returns void
language plpgsql
set search_path = ''
as $tn_sync_farm$
begin
  insert into public.pragas_doencas (
    fazenda_id,
    catalogo_praga_id,
    codigo,
    nome_comum,
    nome_cientifico,
    tipo,
    cultura_alvo,
    sintomas,
    nivel_dano_economico,
    foto_url,
    instrucoes_monitoramento,
    campos_monitoramento,
    ativo
  )
  select
    p_fazenda_id,
    cp.id,
    cp.codigo,
    cp.nome_comum,
    cp.nome_cientifico,
    cp.tipo,
    coalesce(string_agg(cpc.cultura_id, ',' order by cpc.cultura_id), 'multi') as cultura_alvo,
    cp.sintomas,
    cp.nivel_dano_economico,
    cp.foto_url,
    cp.instrucoes_monitoramento,
    cp.campos_monitoramento,
    true
  from public.catalogo_pragas cp
  left join public.catalogo_praga_culturas cpc on cpc.catalogo_praga_id = cp.id
  where cp.ativo = true
  group by cp.id
  on conflict (fazenda_id, codigo) do update
  set catalogo_praga_id = excluded.catalogo_praga_id,
      nome_comum = excluded.nome_comum,
      nome_cientifico = excluded.nome_cientifico,
      tipo = excluded.tipo,
      cultura_alvo = excluded.cultura_alvo,
      sintomas = excluded.sintomas,
      nivel_dano_economico = excluded.nivel_dano_economico,
      foto_url = coalesce(public.pragas_doencas.foto_url, excluded.foto_url),
      instrucoes_monitoramento = excluded.instrucoes_monitoramento,
      campos_monitoramento = excluded.campos_monitoramento,
      updated_at = now();
end;
$tn_sync_farm$;

create or replace function terranexa_private.sincronizar_catalogo_pragas_todas_fazendas()
returns integer
language plpgsql
security definer
set search_path = ''
as $tn_sync_all$
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
$tn_sync_all$;

create or replace function public.sincronizar_catalogo_pragas_todas_fazendas()
returns integer
language sql
security invoker
set search_path = ''
as $tn_sync_all_public$
  select terranexa_private.sincronizar_catalogo_pragas_todas_fazendas();
$tn_sync_all_public$;

-- -----------------------------------------------------------------------------
-- 3. RPC protegida para trocar culturas do item do catalogo
-- -----------------------------------------------------------------------------

create or replace function terranexa_private.definir_culturas_catalogo_praga(
  p_catalogo_praga_id uuid,
  p_culturas text[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $tn_set_cultures$
declare
  v_invalidas text;
  v_total integer := 0;
begin
  if not terranexa_private.usuario_terranexa_admin() then
    raise exception 'acesso_negado';
  end if;

  if p_catalogo_praga_id is null then
    raise exception 'catalogo_praga_obrigatorio';
  end if;

  if not exists (
    select 1
    from public.catalogo_pragas cp
    where cp.id = p_catalogo_praga_id
  ) then
    raise exception 'catalogo_praga_nao_encontrado';
  end if;

  select string_agg(c.cultura_id, ',' order by c.cultura_id)
    into v_invalidas
  from unnest(coalesce(p_culturas, array[]::text[])) as c(cultura_id)
  left join public.catalogo_culturas cc on cc.id = c.cultura_id
  where c.cultura_id is not null
    and c.cultura_id <> ''
    and cc.id is null;

  if v_invalidas is not null then
    raise exception 'culturas_invalidas: %', v_invalidas;
  end if;

  delete from public.catalogo_praga_culturas
  where catalogo_praga_id = p_catalogo_praga_id;

  insert into public.catalogo_praga_culturas (catalogo_praga_id, cultura_id)
  select distinct p_catalogo_praga_id, c.cultura_id
  from unnest(coalesce(p_culturas, array[]::text[])) as c(cultura_id)
  join public.catalogo_culturas cc on cc.id = c.cultura_id
  where c.cultura_id is not null
    and c.cultura_id <> '';

  update public.catalogo_pragas
  set updated_at = now()
  where id = p_catalogo_praga_id;

  select terranexa_private.sincronizar_catalogo_pragas_todas_fazendas()
    into v_total;

  return v_total;
end;
$tn_set_cultures$;

create or replace function public.definir_culturas_catalogo_praga(
  p_catalogo_praga_id uuid,
  p_culturas text[]
)
returns integer
language sql
security invoker
set search_path = ''
as $tn_set_cultures_public$
  select terranexa_private.definir_culturas_catalogo_praga(p_catalogo_praga_id, p_culturas);
$tn_set_cultures_public$;

-- -----------------------------------------------------------------------------
-- 4. Grants e reload do schema cache
-- -----------------------------------------------------------------------------

revoke all on function public.sincronizar_catalogo_pragas_todas_fazendas() from public;
revoke all on function public.definir_culturas_catalogo_praga(uuid, text[]) from public;
revoke all on function public.sincronizar_pragas_doencas_catalogo(uuid) from public;
revoke all on function terranexa_private.sincronizar_catalogo_pragas_todas_fazendas() from public;
revoke all on function terranexa_private.definir_culturas_catalogo_praga(uuid, text[]) from public;

grant execute on function public.sincronizar_catalogo_pragas_todas_fazendas() to authenticated, service_role;
grant execute on function public.definir_culturas_catalogo_praga(uuid, text[]) to authenticated, service_role;
grant execute on function public.sincronizar_pragas_doencas_catalogo(uuid) to authenticated, service_role;
grant execute on function terranexa_private.sincronizar_catalogo_pragas_todas_fazendas() to authenticated, service_role;
grant execute on function terranexa_private.definir_culturas_catalogo_praga(uuid, text[]) to authenticated, service_role;

comment on function public.definir_culturas_catalogo_praga(uuid, text[]) is
  'Define as culturas vinculadas a um item do catalogo-mae e sincroniza os catalogos por fazenda.';

comment on function public.sincronizar_catalogo_pragas_todas_fazendas() is
  'Sincroniza o catalogo-mae de pragas/doencas/daninhas para todas as fazendas.';

comment on function public.sincronizar_pragas_doencas_catalogo(uuid) is
  'Sincroniza o catalogo-mae para uma fazenda respeitando culturas de todos os tipos agronomicos.';

notify pgrst, 'reload schema';
