-- =============================================================================
-- TERRANEXA - INFORMACOES EXTRAS DO CATALOGO PARA MONITORAMENTO
-- Arquivo: 011_catalogo_monitoramento_campos_extras.sql
-- -----------------------------------------------------------------------------
-- Objetivo:
--  1. Permitir que a Central TerraNexa cadastre orientacoes de monitoramento
--     para cada praga, doenca, daninha ou deficiencia.
--  2. Permitir campos extras configuraveis no registro de monitoramento.
--  3. Sincronizar esses dados do catalogo-mae para o catalogo por fazenda.
--
-- Rodar apos 007, 008, 009 e 010.
-- Idempotente: seguro para rodar novamente.
-- =============================================================================

alter table public.catalogo_pragas
  add column if not exists instrucoes_monitoramento text,
  add column if not exists campos_monitoramento jsonb not null default '[]'::jsonb;

alter table public.pragas_doencas
  add column if not exists instrucoes_monitoramento text,
  add column if not exists campos_monitoramento jsonb not null default '[]'::jsonb;

comment on column public.catalogo_pragas.instrucoes_monitoramento is
  'Orientacoes exibidas no formulario de monitoramento para este item.';
comment on column public.catalogo_pragas.campos_monitoramento is
  'Lista JSON de campos extras solicitados no monitoramento.';
comment on column public.pragas_doencas.instrucoes_monitoramento is
  'Copia sincronizada do catalogo-mae para uso no monitoramento da fazenda.';
comment on column public.pragas_doencas.campos_monitoramento is
  'Copia sincronizada dos campos extras do catalogo-mae.';

grant select, insert, update, delete on public.catalogo_pragas to authenticated;
grant select on public.pragas_doencas to authenticated;

create or replace function public.sincronizar_pragas_doencas_catalogo(p_fazenda_id uuid)
returns void
language plpgsql
as $$
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
    case when cp.tipo = 'doenca'
      then coalesce(string_agg(cpc.cultura_id, ',' order by cpc.cultura_id), 'multi')
      else 'multi'
    end as cultura_alvo,
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
$$;
