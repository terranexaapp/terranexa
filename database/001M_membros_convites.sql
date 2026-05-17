-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · MEMBROS E CONVITES POR EMAIL
-- Arquivo: 001M_membros_convites.sql
-- ────────────────────────────────────────────────────────────────
-- Implementa acesso multi-usuário por convite:
--  1. Tabela `fazenda_membros` — convites pendentes e membros aceitos
--  2. Funções helper de acesso (membro, gerente, operador)
--  3. Função pública buscar_convite_info — detalhe sem autenticação
--  4. Função segura aceitar_convite — vincula user_id ao convite
--  5. Políticas RLS de leitura para membros em todas as tabelas
--  6. Políticas RLS de escrita para gerente em tabelas de gestão
--  7. Políticas RLS de escrita para operador em monitoramento e OS
--
-- Idempotente. Políticas em tabelas opcionais (001D, 001J em diante)
-- só são criadas se a tabela existir — seguro rodar parcialmente.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Tabela de membros e convites ─────────────────────────────

create table if not exists public.fazenda_membros (
  id            uuid        primary key default gen_random_uuid(),
  fazenda_id    uuid        not null references public.fazendas(id) on delete cascade,
  convidado_por uuid        references public.profiles(id) on delete set null,
  email         text        not null,
  papel         text        not null check (papel in ('gerente', 'operador')),
  status        text        not null default 'pendente'
                              check (status in ('pendente', 'aceito', 'revogado')),
  token         uuid        not null default gen_random_uuid(),
  user_id       uuid        references public.profiles(id) on delete set null,
  criado_em     timestamptz not null default now(),
  aceito_em     timestamptz,
  constraint fazenda_membros_unique_email unique (fazenda_id, email)
);

create index if not exists fazenda_membros_fazenda_idx  on public.fazenda_membros(fazenda_id);
create index if not exists fazenda_membros_token_idx    on public.fazenda_membros(token);
create index if not exists fazenda_membros_user_idx     on public.fazenda_membros(user_id);
create index if not exists fazenda_membros_email_idx    on public.fazenda_membros(lower(email));

-- ── 2. Funções helper de acesso ──────────────────────────────────

create or replace function public.usuario_membro_fazenda(
  p_fazenda_id uuid,
  p_papel      text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fazenda_membros
    where fazenda_id = p_fazenda_id
      and user_id    = auth.uid()
      and status     = 'aceito'
      and (p_papel is null or papel = p_papel)
  )
$$;

create or replace function public.usuario_acessa_fazenda(p_fazenda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.usuario_dono_fazenda(p_fazenda_id)
      or public.usuario_membro_fazenda(p_fazenda_id)
$$;

create or replace function public.usuario_gerente_fazenda(p_fazenda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.usuario_dono_fazenda(p_fazenda_id)
      or public.usuario_membro_fazenda(p_fazenda_id, 'gerente')
$$;

create or replace function public.usuario_acessa_talhao(p_talhao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.talhoes t
    where t.id = p_talhao_id
      and public.usuario_acessa_fazenda(t.fazenda_id)
  )
$$;

create or replace function public.usuario_gerente_talhao(p_talhao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.talhoes t
    where t.id = p_talhao_id
      and public.usuario_gerente_fazenda(t.fazenda_id)
  )
$$;

-- ── 3. Função pública para buscar info do convite ────────────────
-- Callable sem autenticação (security definer).

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
        'email',        fm.email
      )
      from public.fazenda_membros fm
      join public.fazendas f on f.id = fm.fazenda_id
      where fm.token = p_token
    ),
    null
  )
$$;

-- ── 4. Função segura para aceitar convite ────────────────────────

create or replace function public.aceitar_convite(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_user_email text;
  v_membro     record;
begin
  if v_user_id is null then
    return json_build_object('error', 'nao_autenticado');
  end if;

  select email into v_user_email
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

  update public.fazenda_membros
  set status    = 'aceito',
      user_id   = v_user_id,
      aceito_em = now()
  where token = p_token;

  return json_build_object(
    'ok',        true,
    'fazenda_id', v_membro.fazenda_id,
    'papel',      v_membro.papel
  );
end;
$$;

-- ── 5. RLS na tabela fazenda_membros ────────────────────────────

alter table public.fazenda_membros enable row level security;

drop policy if exists membros_owner_all on public.fazenda_membros;
create policy membros_owner_all on public.fazenda_membros
for all
using  (public.usuario_dono_fazenda(fazenda_id))
with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists membros_own_select on public.fazenda_membros;
create policy membros_own_select on public.fazenda_membros
for select
using (
  lower(email) = lower(auth.email())
  or user_id = auth.uid()
);

-- ── 6. Helper procedure para criar política só se tabela existir ─

create or replace function public._aplicar_policy_se_existe(
  p_tabela text,
  p_policy text,
  p_sql    text
)
returns void
language plpgsql
as $$
begin
  if to_regclass('public.' || p_tabela) is not null then
    execute format('drop policy if exists %I on public.%I', p_policy, p_tabela);
    execute p_sql;
  end if;
end;
$$;

-- ── 7. Políticas SELECT para membros (tabelas core) ──────────────

drop policy if exists fazendas_member_select on public.fazendas;
create policy fazendas_member_select on public.fazendas
for select
using (public.usuario_membro_fazenda(id));

drop policy if exists talhoes_member_select on public.talhoes;
create policy talhoes_member_select on public.talhoes
for select
using (public.usuario_membro_fazenda(fazenda_id));

drop policy if exists safras_member_select on public.safras;
create policy safras_member_select on public.safras
for select
using (public.usuario_membro_fazenda(fazenda_id));

drop policy if exists equipes_member_select on public.equipes;
create policy equipes_member_select on public.equipes
for select
using (public.usuario_membro_fazenda(fazenda_id));

drop policy if exists insumos_member_select on public.insumos;
create policy insumos_member_select on public.insumos
for select
using (public.usuario_membro_fazenda(fazenda_id));

drop policy if exists estoque_member_select on public.estoque;
create policy estoque_member_select on public.estoque
for select
using (
  exists (
    select 1 from public.insumos i
    where i.id = insumo_id
      and public.usuario_membro_fazenda(i.fazenda_id)
  )
);

drop policy if exists operacoes_member_select on public.operacoes;
create policy operacoes_member_select on public.operacoes
for select
using (public.usuario_acessa_talhao(talhao_id));

drop policy if exists operacao_insumos_member_select on public.operacao_insumos;
create policy operacao_insumos_member_select on public.operacao_insumos
for select
using (
  exists (
    select 1 from public.operacoes op
    where op.id = operacao_id
      and public.usuario_acessa_talhao(op.talhao_id)
  )
);

drop policy if exists ordens_servico_member_select on public.ordens_servico;
create policy ordens_servico_member_select on public.ordens_servico
for select
using (public.usuario_membro_fazenda(fazenda_id));

drop policy if exists os_talhoes_member_select on public.os_talhoes;
create policy os_talhoes_member_select on public.os_talhoes
for select
using (
  exists (
    select 1 from public.ordens_servico o
    where o.id = os_id
      and public.usuario_membro_fazenda(o.fazenda_id)
  )
);

drop policy if exists os_insumos_member_select on public.os_insumos;
create policy os_insumos_member_select on public.os_insumos
for select
using (
  exists (
    select 1 from public.ordens_servico o
    where o.id = os_id
      and public.usuario_membro_fazenda(o.fazenda_id)
  )
);

-- ── 8. Políticas SELECT para tabelas opcionais (001D, 001J+) ─────

select public._aplicar_policy_se_existe(
  'pluviometros', 'pluviometros_member_select',
  'create policy pluviometros_member_select on public.pluviometros
   for select using (public.usuario_membro_fazenda(fazenda_id))'
);

select public._aplicar_policy_se_existe(
  'chuva_registros', 'chuva_registros_member_select',
  'create policy chuva_registros_member_select on public.chuva_registros
   for select using (
     exists (select 1 from public.pluviometros p
             where p.id = pluviometro_id
               and public.usuario_membro_fazenda(p.fazenda_id))
   )'
);

select public._aplicar_policy_se_existe(
  'amostras_solo', 'amostras_solo_member_select',
  'create policy amostras_solo_member_select on public.amostras_solo
   for select using (public.usuario_acessa_talhao(talhao_id))'
);

select public._aplicar_policy_se_existe(
  'monitoramentos', 'monitoramentos_member_select',
  'create policy monitoramentos_member_select on public.monitoramentos
   for select using (public.usuario_acessa_talhao(talhao_id))'
);

select public._aplicar_policy_se_existe(
  'monitoramento_pontos', 'monitoramento_pontos_member_select',
  'create policy monitoramento_pontos_member_select on public.monitoramento_pontos
   for select using (
     exists (select 1 from public.monitoramentos m
             where m.id = monitoramento_id
               and public.usuario_acessa_talhao(m.talhao_id))
   )'
);

select public._aplicar_policy_se_existe(
  'monitoramento_caminhamentos', 'monitoramento_caminhamentos_member_select',
  'create policy monitoramento_caminhamentos_member_select on public.monitoramento_caminhamentos
   for select using (
     exists (select 1 from public.monitoramentos m
             where m.id = monitoramento_id
               and public.usuario_acessa_talhao(m.talhao_id))
   )'
);

select public._aplicar_policy_se_existe(
  'armadilhas', 'armadilhas_member_select',
  'create policy armadilhas_member_select on public.armadilhas
   for select using (talhao_id is null or public.usuario_acessa_talhao(talhao_id))'
);

select public._aplicar_policy_se_existe(
  'relatorios', 'relatorios_member_select',
  'create policy relatorios_member_select on public.relatorios
   for select using (public.usuario_membro_fazenda(fazenda_id))'
);

select public._aplicar_policy_se_existe(
  'centros_custo', 'centros_custo_member_select',
  'create policy centros_custo_member_select on public.centros_custo
   for select using (public.usuario_membro_fazenda(fazenda_id))'
);

select public._aplicar_policy_se_existe(
  'maquinas', 'maquinas_member_select',
  'create policy maquinas_member_select on public.maquinas
   for select using (public.usuario_membro_fazenda(fazenda_id))'
);

select public._aplicar_policy_se_existe(
  'produtividades', 'produtividades_member_select',
  'create policy produtividades_member_select on public.produtividades
   for select using (public.usuario_acessa_talhao(talhao_id))'
);

-- ── 9. Políticas WRITE para gerente (tabelas core) ───────────────

drop policy if exists talhoes_gerente_write on public.talhoes;
create policy talhoes_gerente_write on public.talhoes
for all
using  (public.usuario_membro_fazenda(fazenda_id, 'gerente'))
with check (public.usuario_membro_fazenda(fazenda_id, 'gerente'));

drop policy if exists safras_gerente_write on public.safras;
create policy safras_gerente_write on public.safras
for all
using  (public.usuario_membro_fazenda(fazenda_id, 'gerente'))
with check (public.usuario_membro_fazenda(fazenda_id, 'gerente'));

drop policy if exists equipes_gerente_write on public.equipes;
create policy equipes_gerente_write on public.equipes
for all
using  (public.usuario_membro_fazenda(fazenda_id, 'gerente'))
with check (public.usuario_membro_fazenda(fazenda_id, 'gerente'));

drop policy if exists insumos_gerente_write on public.insumos;
create policy insumos_gerente_write on public.insumos
for all
using  (public.usuario_membro_fazenda(fazenda_id, 'gerente'))
with check (public.usuario_membro_fazenda(fazenda_id, 'gerente'));

drop policy if exists estoque_gerente_write on public.estoque;
create policy estoque_gerente_write on public.estoque
for all
using (
  exists (select 1 from public.insumos i
          where i.id = insumo_id
            and public.usuario_membro_fazenda(i.fazenda_id, 'gerente'))
)
with check (
  exists (select 1 from public.insumos i
          where i.id = insumo_id
            and public.usuario_membro_fazenda(i.fazenda_id, 'gerente'))
);

drop policy if exists ordens_servico_gerente_write on public.ordens_servico;
create policy ordens_servico_gerente_write on public.ordens_servico
for all
using  (public.usuario_membro_fazenda(fazenda_id, 'gerente'))
with check (public.usuario_membro_fazenda(fazenda_id, 'gerente'));

drop policy if exists os_talhoes_gerente_write on public.os_talhoes;
create policy os_talhoes_gerente_write on public.os_talhoes
for all
using (
  exists (select 1 from public.ordens_servico o
          where o.id = os_id
            and public.usuario_membro_fazenda(o.fazenda_id, 'gerente'))
)
with check (
  exists (select 1 from public.ordens_servico o
          where o.id = os_id
            and public.usuario_membro_fazenda(o.fazenda_id, 'gerente'))
);

drop policy if exists os_insumos_gerente_write on public.os_insumos;
create policy os_insumos_gerente_write on public.os_insumos
for all
using (
  exists (select 1 from public.ordens_servico o
          where o.id = os_id
            and public.usuario_membro_fazenda(o.fazenda_id, 'gerente'))
)
with check (
  exists (select 1 from public.ordens_servico o
          where o.id = os_id
            and public.usuario_membro_fazenda(o.fazenda_id, 'gerente'))
);

drop policy if exists operacoes_gerente_write on public.operacoes;
create policy operacoes_gerente_write on public.operacoes
for all
using  (public.usuario_gerente_talhao(talhao_id))
with check (public.usuario_gerente_talhao(talhao_id));

drop policy if exists operacao_insumos_gerente_write on public.operacao_insumos;
create policy operacao_insumos_gerente_write on public.operacao_insumos
for all
using (
  exists (select 1 from public.operacoes op
          where op.id = operacao_id
            and public.usuario_gerente_talhao(op.talhao_id))
)
with check (
  exists (select 1 from public.operacoes op
          where op.id = operacao_id
            and public.usuario_gerente_talhao(op.talhao_id))
);

-- ── 10. Políticas WRITE para tabelas opcionais ───────────────────

select public._aplicar_policy_se_existe(
  'pluviometros', 'pluviometros_gerente_write',
  'create policy pluviometros_gerente_write on public.pluviometros
   for all
   using (public.usuario_membro_fazenda(fazenda_id, ''gerente''))
   with check (public.usuario_membro_fazenda(fazenda_id, ''gerente''))'
);

select public._aplicar_policy_se_existe(
  'centros_custo', 'centros_custo_gerente_write',
  'create policy centros_custo_gerente_write on public.centros_custo
   for all
   using (public.usuario_membro_fazenda(fazenda_id, ''gerente''))
   with check (public.usuario_membro_fazenda(fazenda_id, ''gerente''))'
);

select public._aplicar_policy_se_existe(
  'maquinas', 'maquinas_gerente_write',
  'create policy maquinas_gerente_write on public.maquinas
   for all
   using (public.usuario_membro_fazenda(fazenda_id, ''gerente''))
   with check (public.usuario_membro_fazenda(fazenda_id, ''gerente''))'
);

select public._aplicar_policy_se_existe(
  'produtividades', 'produtividades_gerente_write',
  'create policy produtividades_gerente_write on public.produtividades
   for all
   using (public.usuario_gerente_talhao(talhao_id))
   with check (public.usuario_gerente_talhao(talhao_id))'
);

-- Monitoramentos: TODOS os membros (gerente + operador) podem escrever
select public._aplicar_policy_se_existe(
  'monitoramentos', 'monitoramentos_member_write',
  'create policy monitoramentos_member_write on public.monitoramentos
   for all
   using (public.usuario_acessa_talhao(talhao_id))
   with check (public.usuario_acessa_talhao(talhao_id))'
);

select public._aplicar_policy_se_existe(
  'monitoramento_pontos', 'monitoramento_pontos_member_write',
  'create policy monitoramento_pontos_member_write on public.monitoramento_pontos
   for all
   using (
     exists (select 1 from public.monitoramentos m
             where m.id = monitoramento_id
               and public.usuario_acessa_talhao(m.talhao_id))
   )
   with check (
     exists (select 1 from public.monitoramentos m
             where m.id = monitoramento_id
               and public.usuario_acessa_talhao(m.talhao_id))
   )'
);

select public._aplicar_policy_se_existe(
  'monitoramento_caminhamentos', 'monitoramento_caminhamentos_member_write',
  'create policy monitoramento_caminhamentos_member_write on public.monitoramento_caminhamentos
   for all
   using (
     exists (select 1 from public.monitoramentos m
             where m.id = monitoramento_id
               and public.usuario_acessa_talhao(m.talhao_id))
   )
   with check (
     exists (select 1 from public.monitoramentos m
             where m.id = monitoramento_id
               and public.usuario_acessa_talhao(m.talhao_id))
   )'
);

-- ── 11. Limpeza do helper ────────────────────────────────────────

drop function if exists public._aplicar_policy_se_existe(text, text, text);
