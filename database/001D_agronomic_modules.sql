create table if not exists public.pluviometros (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  talhao_id uuid references public.talhoes(id) on delete set null,
  nome text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chuva_registros (
  id uuid primary key default gen_random_uuid(),
  pluviometro_id uuid not null references public.pluviometros(id) on delete cascade,
  medido_em date not null,
  chuva_mm numeric(10, 2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.amostras_solo (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  coletado_em date not null,
  camada text not null default '0-20 cm',
  parametro text not null,
  valor numeric(14, 4),
  unidade text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  arquivo_origem_bucket text,
  arquivo_origem_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.monitoramentos (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes(id) on delete cascade,
  tecnico_id uuid references public.profiles(id) on delete set null,
  visitado_em timestamptz not null default now(),
  dano text not null default 'sem_dano_economico',
  severidade text not null default 'baixa',
  observacoes text,
  status text not null default 'realizado',
  created_at timestamptz not null default now()
);

create table if not exists public.monitoramento_pontos (
  id uuid primary key default gen_random_uuid(),
  monitoramento_id uuid not null references public.monitoramentos(id) on delete cascade,
  tipo text not null default 'ponto',
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  precisao_m numeric(10, 2),
  foto_bucket text,
  foto_path text,
  observacoes text,
  registrado_em timestamptz not null default now()
);

create table if not exists public.monitoramento_caminhamentos (
  id uuid primary key default gen_random_uuid(),
  monitoramento_id uuid not null references public.monitoramentos(id) on delete cascade,
  trilha jsonb not null default '[]'::jsonb,
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.armadilhas (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid references public.talhoes(id) on delete set null,
  nome text not null,
  alvo text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.relatorios (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'agronomico',
  status text not null default 'rascunho',
  arquivo_bucket text,
  arquivo_path text,
  periodo_inicio date,
  periodo_fim date,
  gerado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pluviometros_fazenda_idx on public.pluviometros(fazenda_id);
create index if not exists chuva_registros_pluviometro_data_idx on public.chuva_registros(pluviometro_id, medido_em desc);
create index if not exists amostras_solo_talhao_data_idx on public.amostras_solo(talhao_id, coletado_em desc);
create index if not exists monitoramentos_talhao_data_idx on public.monitoramentos(talhao_id, visitado_em desc);
create index if not exists armadilhas_talhao_idx on public.armadilhas(talhao_id);
create index if not exists relatorios_fazenda_idx on public.relatorios(fazenda_id, created_at desc);
