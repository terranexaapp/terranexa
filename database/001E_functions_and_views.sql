create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email)
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.profiles.nome, excluded.nome),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','fazendas','safras','talhoes','equipes','insumos','estoque','operacoes','ordens_servico']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end;
$$;

create or replace function public.usuario_dono_fazenda(p_fazenda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fazendas f
    where f.id = p_fazenda_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.usuario_dono_talhao(p_talhao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.talhoes t
    join public.fazendas f on f.id = t.fazenda_id
    where t.id = p_talhao_id
      and f.proprietario_id = auth.uid()
  );
$$;

create or replace function public.usuario_dono_insumo(p_insumo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.insumos i
    join public.fazendas f on f.id = i.fazenda_id
    where i.id = p_insumo_id
      and f.proprietario_id = auth.uid()
  );
$$;

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

create or replace function public.popular_catalogo_base(p_fazenda_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inseridos integer;
begin
  if not public.usuario_dono_fazenda(p_fazenda_id) then
    raise exception 'Acesso negado';
  end if;

  insert into public.insumos (fazenda_id, nome, classe, unidade, custo_unitario, carencia_dias, fornecedor)
  values
    (p_fazenda_id, 'Glifosato', 'herbicida', 'L', 0, 0, null),
    (p_fazenda_id, '2,4-D', 'herbicida', 'L', 0, 0, null),
    (p_fazenda_id, 'Fungicida multissitio', 'fungicida', 'kg', 0, 0, null),
    (p_fazenda_id, 'Inseticida fisiologico', 'inseticida', 'L', 0, 0, null),
    (p_fazenda_id, 'Adjuvante', 'adjuvante', 'L', 0, 0, null),
    (p_fazenda_id, 'Fertilizante NPK', 'fertilizante', 'kg', 0, 0, null)
  on conflict do nothing;

  get diagnostics inseridos = row_count;

  insert into public.estoque (insumo_id)
  select i.id
  from public.insumos i
  left join public.estoque e on e.insumo_id = i.id
  where i.fazenda_id = p_fazenda_id
    and e.id is null;

  return inseridos;
end;
$$;

create or replace view public.v_custo_por_categoria as
with custo_operacao as (
  select
    o.id,
    o.talhao_id,
    o.categoria,
    coalesce(o.custo_aplicacao, 0) + coalesce(sum(oi.custo_total), 0) as custo_total
  from public.operacoes o
  left join public.operacao_insumos oi on oi.operacao_id = o.id
  group by o.id
)
select
  talhao_id,
  categoria,
  count(*)::integer as qtd_operacoes,
  sum(custo_total)::numeric(14, 2) as custo_total
from custo_operacao
group by talhao_id, categoria;
