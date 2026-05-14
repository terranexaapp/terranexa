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
    select 1
    from public.fazendas f
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
