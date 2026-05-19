-- =============================================================================
-- TERRANEXA - CONTROLE COMERCIAL, APROVACOES E AUDITORIA
-- Arquivo: 008_comercial_aprovacoes_auditoria.sql
-- -----------------------------------------------------------------------------
-- Objetivo:
--  1. Criar a camada comercial por conta, separada de usuario individual.
--  2. Controlar hectares contratados, tolerancia e hectares ativos.
--  3. Gerar solicitacoes de liberacao quando uma area exceder o contrato.
--  4. Guardar evidencias, revisoes e eventos de auditoria para a equipe TerraNexa.
--
-- Rodar apos os arquivos core e preferencialmente apos 001M_membros_convites.sql.
-- Idempotente: seguro para rodar novamente.
-- =============================================================================

create extension if not exists pgcrypto;

create schema if not exists terranexa_private;
revoke all on schema terranexa_private from public;
grant usage on schema terranexa_private to authenticated;

-- -----------------------------------------------------------------------------
-- 1. Conta comercial e contrato
-- -----------------------------------------------------------------------------

create table if not exists public.contas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  documento_tipo text check (documento_tipo is null or documento_tipo in ('cpf', 'cnpj', 'car', 'matricula', 'outro')),
  origem_proprietario_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pendente_comercial'
    check (status in ('pendente_comercial', 'ativa', 'bloqueada', 'cancelada')),
  plano_nome text not null default 'Pendente de contrato',
  hectares_contratados numeric(14, 2) not null default 0 check (hectares_contratados >= 0),
  hectares_tolerancia numeric(14, 2) not null default 0 check (hectares_tolerancia >= 0),
  controle_hectares_ativo boolean not null default false,
  observacoes_comerciais text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contas_origem_proprietario_uidx
  on public.contas(origem_proprietario_id)
  where origem_proprietario_id is not null;

create table if not exists public.conta_membros (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  papel text not null default 'operador'
    check (papel in ('proprietario', 'admin', 'gerente', 'operador', 'consultor', 'analista_terranexa')),
  status text not null default 'ativo'
    check (status in ('ativo', 'pendente', 'removido')),
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conta_id, user_id)
);

create index if not exists conta_membros_conta_idx on public.conta_membros(conta_id);
create index if not exists conta_membros_user_idx on public.conta_membros(user_id);

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas(id) on delete cascade,
  plano_nome text not null,
  hectares_contratados numeric(14, 2) not null default 0 check (hectares_contratados >= 0),
  hectares_tolerancia numeric(14, 2) not null default 0 check (hectares_tolerancia >= 0),
  status text not null default 'ativa'
    check (status in ('ativa', 'pendente', 'suspensa', 'cancelada', 'encerrada')),
  inicio_em timestamptz not null default now(),
  fim_em timestamptz,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assinaturas_conta_status_idx on public.assinaturas(conta_id, status);

-- -----------------------------------------------------------------------------
-- 2. Ligacao da conta comercial com fazendas e talhoes
-- -----------------------------------------------------------------------------

alter table public.fazendas
  add column if not exists conta_id uuid references public.contas(id) on delete set null;

alter table public.fazendas
  add column if not exists status_liberacao text not null default 'ativa';

alter table public.fazendas
  add column if not exists bloqueio_comercial_motivo text;

alter table public.fazendas
  add column if not exists validado_por uuid references public.profiles(id) on delete set null;

alter table public.fazendas
  add column if not exists validado_em timestamptz;

alter table public.talhoes
  add column if not exists liberacao_status text not null default 'ativo';

alter table public.talhoes
  add column if not exists bloqueio_comercial_motivo text;

alter table public.talhoes
  add column if not exists liberacao_solicitada_em timestamptz;

alter table public.talhoes
  add column if not exists liberacao_validada_por uuid references public.profiles(id) on delete set null;

alter table public.talhoes
  add column if not exists liberacao_validada_em timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fazendas_status_liberacao_check'
      and conrelid = 'public.fazendas'::regclass
  ) then
    alter table public.fazendas
      add constraint fazendas_status_liberacao_check
      check (status_liberacao in ('rascunho', 'pendente_validacao', 'ativa', 'bloqueada', 'rejeitada'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'talhoes_liberacao_status_check'
      and conrelid = 'public.talhoes'::regclass
  ) then
    alter table public.talhoes
      add constraint talhoes_liberacao_status_check
      check (liberacao_status in ('rascunho', 'pendente_validacao', 'ativo', 'aprovado_manual', 'bloqueado', 'rejeitado'));
  end if;
end;
$$;

create index if not exists fazendas_conta_idx on public.fazendas(conta_id);
create index if not exists talhoes_liberacao_status_idx on public.talhoes(liberacao_status);

-- -----------------------------------------------------------------------------
-- 3. Fila de liberacao, evidencias, revisoes e auditoria
-- -----------------------------------------------------------------------------

create table if not exists public.solicitacoes_liberacao (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas(id) on delete cascade,
  fazenda_id uuid references public.fazendas(id) on delete set null,
  talhao_id uuid references public.talhoes(id) on delete set null,
  tipo text not null
    check (tipo in ('nova_fazenda', 'novo_talhao', 'aumento_area', 'aumento_limite', 'transferencia_titularidade', 'convite_admin')),
  status text not null default 'pendente_validacao'
    check (status in ('rascunho', 'pendente_validacao', 'em_analise', 'aguardando_documentos', 'aprovado', 'aprovado_parcial', 'rejeitado', 'cancelado', 'bloqueado_por_risco')),
  risco_nivel text not null default 'baixo'
    check (risco_nivel in ('baixo', 'medio', 'alto')),
  area_solicitada_ha numeric(14, 2) not null default 0,
  hectares_contratados_snapshot numeric(14, 2) not null default 0,
  hectares_ativos_snapshot numeric(14, 2) not null default 0,
  hectares_pos_solicitacao numeric(14, 2) not null default 0,
  motivo text,
  sinais_risco jsonb not null default '{}'::jsonb,
  criado_por uuid references public.profiles(id) on delete set null,
  atribuido_para uuid references public.profiles(id) on delete set null,
  decidido_por uuid references public.profiles(id) on delete set null,
  decidido_em timestamptz,
  decisao_observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solicitacoes_liberacao_conta_status_idx
  on public.solicitacoes_liberacao(conta_id, status, created_at desc);
create index if not exists solicitacoes_liberacao_fazenda_idx
  on public.solicitacoes_liberacao(fazenda_id);
create index if not exists solicitacoes_liberacao_talhao_idx
  on public.solicitacoes_liberacao(talhao_id);

create table if not exists public.solicitacao_evidencias (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes_liberacao(id) on delete cascade,
  tipo_documento text not null default 'outro'
    check (tipo_documento in ('car', 'matricula', 'contrato', 'inscricao_estadual', 'cnpj', 'cpf', 'mapa', 'outro')),
  arquivo_bucket text,
  arquivo_path text,
  descricao text,
  enviado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists solicitacao_evidencias_solicitacao_idx
  on public.solicitacao_evidencias(solicitacao_id);

create table if not exists public.solicitacao_revisoes (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes_liberacao(id) on delete cascade,
  acao text not null
    check (acao in ('comentario', 'pedir_documento', 'iniciar_analise', 'aprovar', 'aprovar_parcial', 'rejeitar', 'bloquear', 'cancelar', 'reabrir')),
  status_anterior text,
  status_novo text,
  observacao text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists solicitacao_revisoes_solicitacao_idx
  on public.solicitacao_revisoes(solicitacao_id, created_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid references public.contas(id) on delete set null,
  fazenda_id uuid references public.fazendas(id) on delete set null,
  talhao_id uuid references public.talhoes(id) on delete set null,
  solicitacao_id uuid references public.solicitacoes_liberacao(id) on delete set null,
  ator_id uuid references public.profiles(id) on delete set null,
  ator_tipo text not null default 'usuario'
    check (ator_tipo in ('usuario', 'sistema', 'terranexa')),
  evento text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_conta_created_idx
  on public.audit_events(conta_id, created_at desc);
create index if not exists audit_events_solicitacao_idx
  on public.audit_events(solicitacao_id);

-- -----------------------------------------------------------------------------
-- 4. Backfill de contas para dados existentes
-- -----------------------------------------------------------------------------

with proprietarios as (
  select
    p.id as user_id,
    coalesce(nullif(p.nome, ''), p.email, 'Conta ' || p.id::text) as nome,
    coalesce(sum(t.area_ha) filter (where f.ativa = true and t.ativo = true), 0)::numeric(14, 2) as hectares_ativos
  from public.profiles p
  join public.fazendas f on f.proprietario_id = p.id
  left join public.talhoes t on t.fazenda_id = f.id
  group by p.id, p.nome, p.email
)
insert into public.contas (
  nome,
  origem_proprietario_id,
  status,
  plano_nome,
  hectares_contratados,
  hectares_tolerancia,
  controle_hectares_ativo
)
select
  nome,
  user_id,
  'ativa',
  'Legado - validar comercial',
  hectares_ativos,
  0,
  false
from proprietarios p
where not exists (
  select 1 from public.contas c
  where c.origem_proprietario_id = p.user_id
);

insert into public.conta_membros (conta_id, user_id, papel, status)
select c.id, c.origem_proprietario_id, 'proprietario', 'ativo'
from public.contas c
where c.origem_proprietario_id is not null
  and not exists (
    select 1 from public.conta_membros cm
    where cm.conta_id = c.id
      and cm.user_id = c.origem_proprietario_id
  );

update public.fazendas f
set conta_id = c.id
from public.contas c
where f.conta_id is null
  and f.proprietario_id = c.origem_proprietario_id;

insert into public.assinaturas (
  conta_id,
  plano_nome,
  hectares_contratados,
  hectares_tolerancia,
  status,
  inicio_em
)
select
  c.id,
  c.plano_nome,
  c.hectares_contratados,
  c.hectares_tolerancia,
  'ativa',
  now()
from public.contas c
where not exists (
  select 1 from public.assinaturas a
  where a.conta_id = c.id
    and a.status = 'ativa'
);

-- -----------------------------------------------------------------------------
-- 5. Helpers privados para RLS e calculos comerciais
-- -----------------------------------------------------------------------------

create or replace function terranexa_private.usuario_terranexa_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.papel in ('terranexa_admin', 'comercial', 'suporte')
  );
$$;

create or replace function terranexa_private.usuario_membro_conta(
  p_conta_id uuid,
  p_papeis text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select terranexa_private.usuario_terranexa_admin()
      or exists (
        select 1
        from public.conta_membros cm
        where cm.conta_id = p_conta_id
          and cm.user_id = auth.uid()
          and cm.status = 'ativo'
          and (p_papeis is null or cm.papel = any(p_papeis))
      );
$$;

create or replace function terranexa_private.hectares_ativos_conta(p_conta_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(t.area_ha), 0)::numeric(14, 2)
  from public.fazendas f
  join public.talhoes t on t.fazenda_id = f.id
  where f.conta_id = p_conta_id
    and f.ativa = true
    and t.ativo = true
    and coalesce(t.liberacao_status, 'ativo') in ('ativo', 'aprovado_manual');
$$;

create or replace function terranexa_private.limite_hectares_conta(p_conta_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select a.hectares_contratados + a.hectares_tolerancia
      from public.assinaturas a
      where a.conta_id = p_conta_id
        and a.status = 'ativa'
      order by a.inicio_em desc
      limit 1
    ),
    (
      select c.hectares_contratados + c.hectares_tolerancia
      from public.contas c
      where c.id = p_conta_id
    ),
    0
  )::numeric(14, 2);
$$;

create or replace function terranexa_private.registrar_audit_event(
  p_evento text,
  p_conta_id uuid default null,
  p_fazenda_id uuid default null,
  p_talhao_id uuid default null,
  p_solicitacao_id uuid default null,
  p_ator_tipo text default 'usuario',
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.audit_events (
    conta_id,
    fazenda_id,
    talhao_id,
    solicitacao_id,
    ator_id,
    ator_tipo,
    evento,
    payload
  )
  values (
    p_conta_id,
    p_fazenda_id,
    p_talhao_id,
    p_solicitacao_id,
    auth.uid(),
    p_ator_tipo,
    p_evento,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function terranexa_private.usuario_terranexa_admin() to authenticated;
grant execute on function terranexa_private.usuario_membro_conta(uuid, text[]) to authenticated;
grant execute on function terranexa_private.hectares_ativos_conta(uuid) to authenticated;
grant execute on function terranexa_private.limite_hectares_conta(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Triggers comerciais
-- -----------------------------------------------------------------------------

create or replace function terranexa_private.garantir_conta_fazenda()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_id uuid;
  v_nome text;
begin
  if new.conta_id is not null or new.proprietario_id is null then
    return new;
  end if;

  select c.id into v_conta_id
  from public.contas c
  where c.origem_proprietario_id = new.proprietario_id
  limit 1;

  if v_conta_id is null then
    select coalesce(nullif(p.nome, ''), p.email, 'Conta ' || new.proprietario_id::text)
    into v_nome
    from public.profiles p
    where p.id = new.proprietario_id;

    insert into public.contas (
      nome,
      origem_proprietario_id,
      status,
      plano_nome,
      hectares_contratados,
      hectares_tolerancia,
      controle_hectares_ativo
    )
    values (
      coalesce(v_nome, 'Conta TerraNexa'),
      new.proprietario_id,
      'pendente_comercial',
      'Pendente de contrato',
      0,
      0,
      true
    )
    returning id into v_conta_id;

    insert into public.conta_membros (conta_id, user_id, papel, status)
    values (v_conta_id, new.proprietario_id, 'proprietario', 'ativo')
    on conflict (conta_id, user_id) do nothing;
  end if;

  new.conta_id := v_conta_id;
  return new;
end;
$$;

drop trigger if exists trg_garantir_conta_fazenda on public.fazendas;
create trigger trg_garantir_conta_fazenda
  before insert or update of proprietario_id, conta_id on public.fazendas
  for each row execute function terranexa_private.garantir_conta_fazenda();

create or replace function terranexa_private.avaliar_limite_talhao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_id uuid;
  v_controle boolean;
  v_limite numeric(14, 2);
  v_area_atual numeric(14, 2);
  v_area_final numeric(14, 2);
begin
  if new.ativo is distinct from true then
    return new;
  end if;

  if coalesce(new.liberacao_status, 'ativo') = 'aprovado_manual' then
    return new;
  end if;

  select f.conta_id into v_conta_id
  from public.fazendas f
  where f.id = new.fazenda_id
    and f.ativa = true;

  if v_conta_id is null then
    return new;
  end if;

  select c.controle_hectares_ativo into v_controle
  from public.contas c
  where c.id = v_conta_id;

  if not coalesce(v_controle, false) then
    if new.liberacao_status is null then
      new.liberacao_status := 'ativo';
    end if;
    return new;
  end if;

  v_limite := terranexa_private.limite_hectares_conta(v_conta_id);

  select coalesce(sum(t.area_ha), 0)::numeric(14, 2)
  into v_area_atual
  from public.fazendas f
  join public.talhoes t on t.fazenda_id = f.id
  where f.conta_id = v_conta_id
    and f.ativa = true
    and t.ativo = true
    and t.id <> new.id
    and coalesce(t.liberacao_status, 'ativo') in ('ativo', 'aprovado_manual');

  v_area_final := v_area_atual + coalesce(new.area_ha, 0);

  if v_area_final > v_limite then
    new.ativo := false;
    new.liberacao_status := 'pendente_validacao';
    new.liberacao_solicitada_em := coalesce(new.liberacao_solicitada_em, now());
    new.bloqueio_comercial_motivo := format(
      'Limite comercial excedido: %s ha usados + %s ha solicitados > %s ha liberados.',
      v_area_atual,
      coalesce(new.area_ha, 0),
      v_limite
    );
  else
    if new.liberacao_status is null or new.liberacao_status = 'pendente_validacao' then
      new.liberacao_status := 'ativo';
    end if;
    new.bloqueio_comercial_motivo := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_avaliar_limite_talhao on public.talhoes;
create trigger trg_avaliar_limite_talhao
  before insert or update of fazenda_id, area_ha, ativo, liberacao_status on public.talhoes
  for each row execute function terranexa_private.avaliar_limite_talhao();

create or replace function terranexa_private.criar_solicitacao_talhao_pendente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_id uuid;
  v_limite numeric(14, 2);
  v_hectares_ativos numeric(14, 2);
  v_solicitacao_id uuid;
begin
  if new.liberacao_status <> 'pendente_validacao' then
    return new;
  end if;

  select f.conta_id into v_conta_id
  from public.fazendas f
  where f.id = new.fazenda_id;

  if v_conta_id is null then
    return new;
  end if;

  v_limite := terranexa_private.limite_hectares_conta(v_conta_id);
  v_hectares_ativos := terranexa_private.hectares_ativos_conta(v_conta_id);

  select sl.id into v_solicitacao_id
  from public.solicitacoes_liberacao sl
  where sl.talhao_id = new.id
    and sl.status in ('pendente_validacao', 'em_analise', 'aguardando_documentos')
  order by sl.created_at desc
  limit 1;

  if v_solicitacao_id is null then
    insert into public.solicitacoes_liberacao (
      conta_id,
      fazenda_id,
      talhao_id,
      tipo,
      status,
      risco_nivel,
      area_solicitada_ha,
      hectares_contratados_snapshot,
      hectares_ativos_snapshot,
      hectares_pos_solicitacao,
      motivo,
      sinais_risco,
      criado_por
    )
    values (
      v_conta_id,
      new.fazenda_id,
      new.id,
      'novo_talhao',
      'pendente_validacao',
      case
        when v_hectares_ativos + coalesce(new.area_ha, 0) > v_limite * 1.20 then 'alto'
        when v_hectares_ativos + coalesce(new.area_ha, 0) > v_limite then 'medio'
        else 'baixo'
      end,
      coalesce(new.area_ha, 0),
      v_limite,
      v_hectares_ativos,
      v_hectares_ativos + coalesce(new.area_ha, 0),
      coalesce(new.bloqueio_comercial_motivo, 'Talhao pendente de validacao comercial.'),
      jsonb_build_object(
        'motivo', 'limite_hectares',
        'area_talhao_ha', coalesce(new.area_ha, 0),
        'hectares_ativos_ha', v_hectares_ativos,
        'limite_ha', v_limite
      ),
      auth.uid()
    )
    returning id into v_solicitacao_id;
  else
    update public.solicitacoes_liberacao
    set
      area_solicitada_ha = coalesce(new.area_ha, 0),
      hectares_contratados_snapshot = v_limite,
      hectares_ativos_snapshot = v_hectares_ativos,
      hectares_pos_solicitacao = v_hectares_ativos + coalesce(new.area_ha, 0),
      motivo = coalesce(new.bloqueio_comercial_motivo, motivo),
      updated_at = now()
    where id = v_solicitacao_id;
  end if;

  perform terranexa_private.registrar_audit_event(
    'talhao_liberacao_pendente',
    v_conta_id,
    new.fazenda_id,
    new.id,
    v_solicitacao_id,
    'sistema',
    jsonb_build_object(
      'area_talhao_ha', coalesce(new.area_ha, 0),
      'hectares_ativos_ha', v_hectares_ativos,
      'limite_ha', v_limite,
      'bloqueio_motivo', new.bloqueio_comercial_motivo
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_criar_solicitacao_talhao_pendente on public.talhoes;
create trigger trg_criar_solicitacao_talhao_pendente
  after insert or update of fazenda_id, area_ha, ativo, liberacao_status on public.talhoes
  for each row execute function terranexa_private.criar_solicitacao_talhao_pendente();

-- -----------------------------------------------------------------------------
-- 7. RLS e grants
-- -----------------------------------------------------------------------------

alter table public.contas enable row level security;
alter table public.conta_membros enable row level security;
alter table public.assinaturas enable row level security;
alter table public.solicitacoes_liberacao enable row level security;
alter table public.solicitacao_evidencias enable row level security;
alter table public.solicitacao_revisoes enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists profiles_terranexa_admin_select on public.profiles;
create policy profiles_terranexa_admin_select on public.profiles
for select
using (terranexa_private.usuario_terranexa_admin());

drop policy if exists fazendas_terranexa_admin_all on public.fazendas;
create policy fazendas_terranexa_admin_all on public.fazendas
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists talhoes_terranexa_admin_all on public.talhoes;
create policy talhoes_terranexa_admin_all on public.talhoes
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists contas_select_membros on public.contas;
create policy contas_select_membros on public.contas
for select
using (terranexa_private.usuario_membro_conta(id));

drop policy if exists contas_admin_terranexa_write on public.contas;
create policy contas_admin_terranexa_write on public.contas
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists conta_membros_select_membros on public.conta_membros;
create policy conta_membros_select_membros on public.conta_membros
for select
using (terranexa_private.usuario_membro_conta(conta_id));

drop policy if exists conta_membros_admin_write on public.conta_membros;
create policy conta_membros_admin_write on public.conta_membros
for all
using (
  terranexa_private.usuario_membro_conta(conta_id, array['proprietario', 'admin'])
)
with check (
  terranexa_private.usuario_membro_conta(conta_id, array['proprietario', 'admin'])
);

drop policy if exists assinaturas_select_membros on public.assinaturas;
create policy assinaturas_select_membros on public.assinaturas
for select
using (terranexa_private.usuario_membro_conta(conta_id));

drop policy if exists assinaturas_admin_terranexa_write on public.assinaturas;
create policy assinaturas_admin_terranexa_write on public.assinaturas
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists solicitacoes_select_membros on public.solicitacoes_liberacao;
create policy solicitacoes_select_membros on public.solicitacoes_liberacao
for select
using (terranexa_private.usuario_membro_conta(conta_id));

drop policy if exists solicitacoes_membros_insert on public.solicitacoes_liberacao;
create policy solicitacoes_membros_insert on public.solicitacoes_liberacao
for insert
with check (
  terranexa_private.usuario_membro_conta(conta_id, array['proprietario', 'admin', 'gerente'])
);

drop policy if exists solicitacoes_admin_terranexa_update on public.solicitacoes_liberacao;
create policy solicitacoes_admin_terranexa_update on public.solicitacoes_liberacao
for update
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists evidencias_select_membros on public.solicitacao_evidencias;
create policy evidencias_select_membros on public.solicitacao_evidencias
for select
using (
  exists (
    select 1 from public.solicitacoes_liberacao sl
    where sl.id = solicitacao_id
      and terranexa_private.usuario_membro_conta(sl.conta_id)
  )
);

drop policy if exists evidencias_membros_insert on public.solicitacao_evidencias;
create policy evidencias_membros_insert on public.solicitacao_evidencias
for insert
with check (
  exists (
    select 1 from public.solicitacoes_liberacao sl
    where sl.id = solicitacao_id
      and terranexa_private.usuario_membro_conta(sl.conta_id)
  )
);

drop policy if exists revisoes_select_membros on public.solicitacao_revisoes;
create policy revisoes_select_membros on public.solicitacao_revisoes
for select
using (
  exists (
    select 1 from public.solicitacoes_liberacao sl
    where sl.id = solicitacao_id
      and terranexa_private.usuario_membro_conta(sl.conta_id)
  )
);

drop policy if exists revisoes_membros_insert on public.solicitacao_revisoes;
create policy revisoes_membros_insert on public.solicitacao_revisoes
for insert
with check (
  exists (
    select 1 from public.solicitacoes_liberacao sl
    where sl.id = solicitacao_id
      and terranexa_private.usuario_membro_conta(sl.conta_id)
  )
);

drop policy if exists audit_events_select_membros on public.audit_events;
create policy audit_events_select_membros on public.audit_events
for select
using (
  conta_id is not null
  and terranexa_private.usuario_membro_conta(conta_id)
);

grant select on public.contas to authenticated;
grant select, insert, update, delete on public.conta_membros to authenticated;
grant select, insert, update on public.assinaturas to authenticated;
grant select, insert, update on public.solicitacoes_liberacao to authenticated;
grant select, insert on public.solicitacao_evidencias to authenticated;
grant select, insert on public.solicitacao_revisoes to authenticated;
grant select on public.audit_events to authenticated;
grant select on public.profiles to authenticated;
grant select, update on public.fazendas to authenticated;
grant select, update on public.talhoes to authenticated;

-- -----------------------------------------------------------------------------
-- 8. View operacional para a futura Central TerraNexa
-- -----------------------------------------------------------------------------

create or replace view public.v_contas_hectares
with (security_invoker = true)
as
select
  c.id as conta_id,
  c.nome,
  c.status,
  c.plano_nome,
  c.hectares_contratados,
  c.hectares_tolerancia,
  c.controle_hectares_ativo,
  terranexa_private.hectares_ativos_conta(c.id) as hectares_ativos,
  terranexa_private.limite_hectares_conta(c.id) as hectares_liberados,
  greatest(
    terranexa_private.limite_hectares_conta(c.id) - terranexa_private.hectares_ativos_conta(c.id),
    0
  ) as hectares_disponiveis,
  case
    when terranexa_private.hectares_ativos_conta(c.id) > terranexa_private.limite_hectares_conta(c.id) then 'excedido'
    when terranexa_private.limite_hectares_conta(c.id) = 0 then 'sem_contrato'
    when terranexa_private.hectares_ativos_conta(c.id) >= terranexa_private.limite_hectares_conta(c.id) * 0.90 then 'atencao'
    else 'ok'
  end as status_uso
from public.contas c;

grant select on public.v_contas_hectares to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Triggers de updated_at
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'contas',
    'conta_membros',
    'assinaturas',
    'solicitacoes_liberacao'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      t,
      t
    );
  end loop;
end;
$$;
