-- TerraNexa - nomes operacionais, mobile leve e convites com nome
-- Execute no SQL Editor do Supabase antes/junto do deploy desta versao.

alter table public.fazenda_membros
  add column if not exists nome text;

alter table public.monitoramentos
  add column if not exists tecnico_nome text;

alter table public.ordens_servico
  add column if not exists criada_por_nome text,
  add column if not exists fechada_por_id uuid,
  add column if not exists fechada_por_nome text;

alter table public.operacoes
  add column if not exists executada_por_id uuid,
  add column if not exists executada_por_nome text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ordens_servico_fechada_por_id_fkey'
  ) then
    alter table public.ordens_servico
      add constraint ordens_servico_fechada_por_id_fkey
      foreign key (fechada_por_id) references public.profiles(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operacoes_executada_por_id_fkey'
  ) then
    alter table public.operacoes
      add constraint operacoes_executada_por_id_fkey
      foreign key (executada_por_id) references public.profiles(id) on delete set null;
  end if;
end;
$$;

update public.fazenda_papeis
set permissoes = permissoes || jsonb_build_object(
      'chuvas', false,
      'solo', false,
      'monitoramento', true,
      'monitoramento_registro', true,
      'os_apontamento', false
    ),
    updated_at = now()
where papel in ('tecnico', 'operador', 'coordenador_equipe');

update public.profiles p
set nome = nullif(u.raw_user_meta_data ->> 'nome', ''),
    updated_at = now()
from auth.users u
where u.id = p.id
  and nullif(u.raw_user_meta_data ->> 'nome', '') is not null
  and (
    p.nome is null
    or p.nome = ''
    or lower(p.nome) = lower(coalesce(p.email, u.email, ''))
  );

update public.fazenda_membros fm
set nome = coalesce(nullif(p.nome, ''), p.email)
from public.profiles p
where fm.user_id = p.id
  and (fm.nome is null or fm.nome = '')
  and coalesce(nullif(p.nome, ''), p.email) is not null
  and lower(coalesce(nullif(p.nome, ''), p.email)) <> lower(fm.email);

update public.fazenda_membros fm
set nome = coalesce(nullif(p.nome, ''), p.email)
from public.profiles p
where lower(p.email) = lower(fm.email)
  and (fm.nome is null or fm.nome = '')
  and coalesce(nullif(p.nome, ''), p.email) is not null
  and lower(coalesce(nullif(p.nome, ''), p.email)) <> lower(fm.email);

update public.monitoramentos m
set tecnico_nome = coalesce(nullif(p.nome, ''), p.email)
from public.profiles p
where m.tecnico_id = p.id
  and (m.tecnico_nome is null or m.tecnico_nome = '');

update public.ordens_servico os
set criada_por_nome = coalesce(nullif(p.nome, ''), p.email)
from public.profiles p
where os.criada_por_id = p.id
  and (os.criada_por_nome is null or os.criada_por_nome = '');

update public.operacoes op
set executada_por_nome = coalesce(nullif(p.nome, ''), p.email)
from public.profiles p
where op.executada_por_id = p.id
  and (op.executada_por_nome is null or op.executada_por_nome = '');

create or replace function public.buscar_convite_info(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select json_build_object(
        'fazenda_nome', f.nome,
        'fazenda_id',   fm.fazenda_id,
        'papel',        fm.papel,
        'status',       fm.status,
        'email',        fm.email,
        'nome',         fm.nome
      )
      from public.fazenda_membros fm
      join public.fazendas f on f.id = fm.fazenda_id
      where fm.token = p_token
    ),
    null
  )
$$;

create or replace function public.aceitar_convite(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_user_email     text;
  v_user_meta_nome text;
  v_membro         record;
  v_nome_final     text;
begin
  if v_user_id is null then
    return json_build_object('error', 'nao_autenticado');
  end if;

  select email, raw_user_meta_data ->> 'nome'
    into v_user_email, v_user_meta_nome
  from auth.users
  where id = v_user_id;

  select * into v_membro
  from public.fazenda_membros
  where token = p_token
    and status = 'pendente'
  for update;

  if not found then
    return json_build_object('error', 'convite_invalido');
  end if;

  if lower(v_membro.email) <> lower(v_user_email) then
    return json_build_object('error', 'email_diferente', 'convite_email', v_membro.email);
  end if;

  v_nome_final := coalesce(nullif(v_membro.nome, ''), nullif(v_user_meta_nome, ''), v_user_email);

  insert into public.profiles (id, nome, email)
  values (v_user_id, v_nome_final, v_user_email)
  on conflict (id) do update
    set email = excluded.email,
        nome = case
          when nullif(v_nome_final, '') is not null then v_nome_final
          when public.profiles.nome is null or public.profiles.nome = '' then excluded.nome
          when lower(public.profiles.nome) = lower(excluded.email) then excluded.nome
          else public.profiles.nome
        end,
        updated_at = now();

  update public.fazenda_membros
  set status    = 'aceito',
      user_id   = v_user_id,
      nome      = v_nome_final,
      aceito_em = now()
  where token = p_token;

  return json_build_object(
    'ok',         true,
    'fazenda_id', v_membro.fazenda_id,
    'papel',      v_membro.papel
  );
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
  v_executor_id uuid := auth.uid();
  v_executor_nome text;
begin
  select * into v_os from public.ordens_servico where id = p_os_id;

  if not found then
    raise exception 'Ordem de servico nao encontrada';
  end if;

  if not public.usuario_tem_permissao_fazenda(v_os.fazenda_id, 'os_fechar')
     or not public.usuario_acessa_talhao(p_talhao_id) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(nullif(p.nome, ''), p.email)
    into v_executor_nome
  from public.profiles p
  where p.id = v_executor_id;

  insert into public.operacoes (
    talhao_id, categoria, tipo, data_operacao, custo_aplicacao,
    observacoes, receituario_agronomo, receituario_crea,
    executada_por_id, executada_por_nome
  )
  values (
    p_talhao_id,
    coalesce(v_os.categoria, 'outros'),
    coalesce(v_os.operacao_recomendada, v_os.servico, v_os.operacao_mae, 'Operacao'),
    p_data_execucao,
    coalesce(p_custo_aplicacao, 0),
    p_observacoes,
    p_receituario_agronomo,
    p_receituario_crea,
    v_executor_id,
    v_executor_nome
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
