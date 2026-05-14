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
    join public.talhoes t on t.id = o.talhao_id
    join public.fazendas f on f.id = t.fazenda_id
    where o.id = p_operacao_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.usuario_dono_os(p_os_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ordens_servico os
    join public.fazendas f on f.id = os.fazenda_id
    where os.id = p_os_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.proximo_numero_os(p_fazenda_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo integer;
begin
  if not public.usuario_dono_fazenda(p_fazenda_id) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::integer), 0) + 1
    into proximo
  from public.ordens_servico
  where fazenda_id = p_fazenda_id;

  return 'OS-' || lpad(proximo::text, 4, '0');
end;
$$;

create or replace function public.fechar_os_v2(
  p_os_id uuid,
  p_talhao_id uuid,
  p_data_execucao date,
  p_custo_aplicacao numeric,
  p_observacoes text,
  p_receituario_agronomo text,
  p_receituario_crea text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_operacao_id uuid;
begin
  if not public.usuario_dono_os(p_os_id) or not public.usuario_dono_talhao(p_talhao_id) then
    raise exception 'Acesso negado';
  end if;

  select * into v_os from public.ordens_servico where id = p_os_id;

  insert into public.operacoes (
    talhao_id, categoria, tipo, data_operacao, custo_aplicacao,
    observacoes, receituario_agronomo, receituario_crea
  )
  values (
    p_talhao_id,
    coalesce(v_os.categoria, 'outros'),
    coalesce(v_os.operacao_recomendada, v_os.servico, v_os.operacao_mae, 'Operacao'),
    p_data_execucao,
    coalesce(p_custo_aplicacao, 0),
    p_observacoes,
    p_receituario_agronomo,
    p_receituario_crea
  )
  returning id into v_operacao_id;

  insert into public.operacao_insumos (
    operacao_id, insumo_id, dose, dose_unidade, quantidade_total, custo_total
  )
  select
    v_operacao_id,
    oi.insumo_id,
    coalesce(oi.dose_real, oi.dose_recomendada, 0),
    oi.dose_unidade,
    coalesce(oi.quantidade_real, 0),
    coalesce(oi.custo_real, 0)
  from public.os_insumos oi
  where oi.os_id = p_os_id;

  return v_operacao_id;
end;
$$;
