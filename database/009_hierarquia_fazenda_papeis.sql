-- =============================================================================
-- TERRANEXA - HIERARQUIA DE USUARIOS POR FAZENDA
-- Arquivo: 009_hierarquia_fazenda_papeis.sql
-- -----------------------------------------------------------------------------
-- Objetivo:
--  1. Ampliar os papeis de membros por fazenda.
--  2. Registrar uma matriz de permissoes por papel.
--  3. Liberar a Central TerraNexa para auditar e vincular usuarios a fazendas.
--  4. Preparar helpers para futuras policies/telas baseadas em permissao.
--
-- Rodar apos 001M_membros_convites.sql e 008_comercial_aprovacoes_auditoria.sql.
-- Idempotente: seguro para rodar novamente.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Catalogo de papeis por fazenda
-- -----------------------------------------------------------------------------

create table if not exists public.fazenda_papeis (
  papel text primary key,
  label text not null,
  nivel_hierarquia integer not null default 0,
  descricao text,
  permissoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.fazenda_papeis (papel, label, nivel_hierarquia, descricao, permissoes, ativo)
values
  (
    'gerente',
    'Gerente',
    90,
    'Acesso total as informacoes da fazenda.',
    '{
      "dashboard": true,
      "mapa": true,
      "chuvas": true,
      "solo": true,
      "monitoramento": true,
      "monitoramento_registro": true,
      "gerencial": true,
      "talhoes": true,
      "pluviometros": true,
      "safras": true,
      "estoque": true,
      "equipe": true,
      "insumos": true,
      "maquinas": true,
      "produtividade": true,
      "membros": true,
      "relatorios": true,
      "operacoes_resumo": true,
      "os_apontamento": true,
      "os_fechar": true
    }'::jsonb,
    true
  ),
  (
    'agronomo',
    'Agronomo',
    70,
    'Acesso tecnico amplo, sem gestao administrativa sensivel.',
    '{
      "dashboard": true,
      "mapa": true,
      "chuvas": true,
      "solo": true,
      "monitoramento": true,
      "monitoramento_registro": true,
      "gerencial": true,
      "talhoes": true,
      "pluviometros": true,
      "safras": true,
      "estoque": true,
      "equipe": false,
      "insumos": true,
      "maquinas": false,
      "produtividade": true,
      "membros": false,
      "relatorios": true,
      "operacoes_resumo": true,
      "os_apontamento": true,
      "os_fechar": true
    }'::jsonb,
    true
  ),
  (
    'tecnico',
    'Tecnico',
    50,
    'Monitoramento, resumo, coleta de pluviometria e mapa principal.',
    '{
      "dashboard": true,
      "mapa": true,
      "chuvas": false,
      "solo": false,
      "monitoramento": true,
      "monitoramento_registro": true,
      "gerencial": false,
      "talhoes": false,
      "pluviometros": true,
      "safras": false,
      "estoque": false,
      "equipe": false,
      "insumos": false,
      "maquinas": false,
      "produtividade": false,
      "membros": false,
      "relatorios": false,
      "operacoes_resumo": true,
      "os_apontamento": false,
      "os_fechar": false
    }'::jsonb,
    true
  ),
  (
    'coordenador_equipe',
    'Coordenador de equipe',
    40,
    'Resumo de campo, ultimas operacoes e apontamento para fechar OS.',
    '{
      "dashboard": false,
      "mapa": true,
      "chuvas": false,
      "solo": false,
      "monitoramento": true,
      "monitoramento_registro": true,
      "gerencial": false,
      "talhoes": false,
      "pluviometros": false,
      "safras": false,
      "estoque": false,
      "equipe": false,
      "insumos": false,
      "maquinas": false,
      "produtividade": false,
      "membros": false,
      "relatorios": false,
      "operacoes_resumo": true,
      "os_apontamento": false,
      "os_fechar": true
    }'::jsonb,
    true
  ),
  (
    'operador',
    'Operador',
    30,
    'Acesso operacional basico mantido para convites antigos.',
    '{
      "dashboard": false,
      "mapa": true,
      "chuvas": false,
      "solo": false,
      "monitoramento": true,
      "monitoramento_registro": true,
      "gerencial": false,
      "talhoes": false,
      "pluviometros": false,
      "safras": false,
      "estoque": false,
      "equipe": false,
      "insumos": false,
      "maquinas": false,
      "produtividade": false,
      "membros": false,
      "relatorios": false,
      "operacoes_resumo": true,
      "os_apontamento": false,
      "os_fechar": false
    }'::jsonb,
    true
  )
on conflict (papel) do update set
  label = excluded.label,
  nivel_hierarquia = excluded.nivel_hierarquia,
  descricao = excluded.descricao,
  permissoes = excluded.permissoes,
  ativo = excluded.ativo,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. Expansao da tabela fazenda_membros
-- -----------------------------------------------------------------------------

alter table public.fazenda_membros
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  v_constraint text;
begin
  select conname
    into v_constraint
  from pg_constraint
  where conrelid = 'public.fazenda_membros'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%papel%'
  limit 1;

  if v_constraint is not null then
    execute format('alter table public.fazenda_membros drop constraint %I', v_constraint);
  end if;

  alter table public.fazenda_membros
    add constraint fazenda_membros_papel_check
    check (papel in ('gerente', 'agronomo', 'tecnico', 'coordenador_equipe', 'operador'));
end;
$$;

create index if not exists fazenda_membros_papel_idx on public.fazenda_membros(papel);
create index if not exists fazenda_membros_status_papel_idx on public.fazenda_membros(status, papel);

drop trigger if exists trg_fazenda_membros_updated_at on public.fazenda_membros;
create trigger trg_fazenda_membros_updated_at
  before update on public.fazenda_membros
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_fazenda_papeis_updated_at on public.fazenda_papeis;
create trigger trg_fazenda_papeis_updated_at
  before update on public.fazenda_papeis
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Helpers de papel e permissao por fazenda
-- -----------------------------------------------------------------------------

create or replace function public.usuario_papel_fazenda(p_fazenda_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
      from public.fazendas f
      where f.id = p_fazenda_id
        and f.proprietario_id = auth.uid()
    ) then 'proprietario'
    else (
      select fm.papel
      from public.fazenda_membros fm
      where fm.fazenda_id = p_fazenda_id
        and fm.user_id = auth.uid()
        and fm.status = 'aceito'
      order by fm.aceito_em desc nulls last, fm.criado_em desc
      limit 1
    )
  end;
$$;

create or replace function public.usuario_tem_permissao_fazenda(
  p_fazenda_id uuid,
  p_permissao text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.usuario_dono_fazenda(p_fazenda_id) then true
    when terranexa_private.usuario_terranexa_admin() then true
    else coalesce(
      (
        select (fp.permissoes ->> p_permissao)::boolean
        from public.fazenda_membros fm
        join public.fazenda_papeis fp on fp.papel = fm.papel
        where fm.fazenda_id = p_fazenda_id
          and fm.user_id = auth.uid()
          and fm.status = 'aceito'
          and fp.ativo
        order by fp.nivel_hierarquia desc
        limit 1
      ),
      false
    )
  end;
$$;

grant execute on function public.usuario_papel_fazenda(uuid) to authenticated;
grant execute on function public.usuario_tem_permissao_fazenda(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. RLS para Central TerraNexa
-- -----------------------------------------------------------------------------

alter table public.fazenda_papeis enable row level security;

drop policy if exists fazenda_papeis_select_authenticated on public.fazenda_papeis;
create policy fazenda_papeis_select_authenticated on public.fazenda_papeis
for select
using (auth.role() = 'authenticated');

drop policy if exists fazenda_papeis_terranexa_admin_all on public.fazenda_papeis;
create policy fazenda_papeis_terranexa_admin_all on public.fazenda_papeis
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

drop policy if exists fazenda_membros_terranexa_admin_all on public.fazenda_membros;
create policy fazenda_membros_terranexa_admin_all on public.fazenda_membros
for all
using (terranexa_private.usuario_terranexa_admin())
with check (terranexa_private.usuario_terranexa_admin());

grant select on public.fazenda_papeis to authenticated;
grant select, insert, update on public.fazenda_membros to authenticated;
