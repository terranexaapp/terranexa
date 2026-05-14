create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists papel text not null default 'produtor';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.fazendas add column if not exists proprietario_id uuid references public.profiles(id) on delete set null;
alter table public.fazendas add column if not exists municipio text;
alter table public.fazendas add column if not exists estado text;
alter table public.fazendas add column if not exists endereco text;
alter table public.fazendas add column if not exists area_total_ha numeric(14, 2) not null default 0;
alter table public.fazendas add column if not exists ativa boolean not null default true;
alter table public.fazendas add column if not exists created_at timestamptz not null default now();
alter table public.fazendas add column if not exists updated_at timestamptz not null default now();

alter table public.talhoes add column if not exists nome text;
alter table public.talhoes add column if not exists cultura text;
alter table public.talhoes add column if not exists variedade text;
alter table public.talhoes add column if not exists fase text not null default 'preparo';
alter table public.talhoes add column if not exists saude text not null default 'boa';
alter table public.talhoes add column if not exists area_ha numeric(14, 2) not null default 0;
alter table public.talhoes add column if not exists geometria jsonb;
alter table public.talhoes add column if not exists arquivo_origem_bucket text;
alter table public.talhoes add column if not exists arquivo_origem_path text;
alter table public.talhoes add column if not exists arquivo_origem_nome text;
alter table public.talhoes add column if not exists ativo boolean not null default true;
alter table public.talhoes add column if not exists created_at timestamptz not null default now();
alter table public.talhoes add column if not exists updated_at timestamptz not null default now();

create index if not exists talhoes_fazenda_codigo_idx on public.talhoes(fazenda_id, codigo);
