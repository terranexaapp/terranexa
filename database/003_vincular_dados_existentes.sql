-- TerraNexa - vincular dados ja existentes ao usuario correto
-- Troque o email abaixo pelo email usado para entrar no app.

alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists papel text not null default 'produtor';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.fazendas add column if not exists proprietario_id uuid references public.profiles(id) on delete set null;
alter table public.fazendas add column if not exists updated_at timestamptz not null default now();

do $$
declare
  v_user_id uuid;
begin
  select id
    into v_user_id
  from auth.users
  where lower(email) = lower('SEU_EMAIL_AQUI')
  order by created_at desc
  limit 1;

  if v_user_id is null then
    raise exception 'Usuario nao encontrado. Confira o email informado.';
  end if;

  insert into public.profiles (id, nome, email)
  select id, coalesce(raw_user_meta_data->>'nome', email), email
  from auth.users
  where id = v_user_id
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.profiles.nome, excluded.nome),
        updated_at = now();

  update public.fazendas
    set proprietario_id = v_user_id,
        updated_at = now()
  where proprietario_id is null;
end;
$$;

select id, nome, proprietario_id
from public.fazendas
order by created_at desc;
