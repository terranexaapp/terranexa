create table if not exists public.safras (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  cultura text,
  inicio date,
  fim date,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  responsavel text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome text not null,
  classe text not null default 'outro',
  unidade text not null default 'un',
  custo_unitario numeric(14, 2) not null default 0,
  carencia_dias integer not null default 0,
  fornecedor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null unique references public.insumos(id) on delete cascade,
  quantidade_atual numeric(14, 2) not null default 0,
  quantidade_inicial numeric(14, 2) not null default 0,
  quantidade_minima numeric(14, 2) not null default 0,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.safras add column if not exists cultura text;
alter table public.safras add column if not exists inicio date;
alter table public.safras add column if not exists fim date;
alter table public.safras add column if not exists ativa boolean not null default true;
alter table public.safras add column if not exists created_at timestamptz not null default now();
alter table public.safras add column if not exists updated_at timestamptz not null default now();

alter table public.equipes add column if not exists responsavel text;
alter table public.equipes add column if not exists ativa boolean not null default true;
alter table public.equipes add column if not exists created_at timestamptz not null default now();
alter table public.equipes add column if not exists updated_at timestamptz not null default now();

alter table public.insumos add column if not exists classe text not null default 'outro';
alter table public.insumos add column if not exists unidade text not null default 'un';
alter table public.insumos add column if not exists custo_unitario numeric(14, 2) not null default 0;
alter table public.insumos add column if not exists carencia_dias integer not null default 0;
alter table public.insumos add column if not exists fornecedor text;
alter table public.insumos add column if not exists ativo boolean not null default true;
alter table public.insumos add column if not exists created_at timestamptz not null default now();
alter table public.insumos add column if not exists updated_at timestamptz not null default now();

alter table public.estoque add column if not exists quantidade_atual numeric(14, 2) not null default 0;
alter table public.estoque add column if not exists quantidade_inicial numeric(14, 2) not null default 0;
alter table public.estoque add column if not exists quantidade_minima numeric(14, 2) not null default 0;
alter table public.estoque add column if not exists status text;
alter table public.estoque add column if not exists created_at timestamptz not null default now();
alter table public.estoque add column if not exists updated_at timestamptz not null default now();
