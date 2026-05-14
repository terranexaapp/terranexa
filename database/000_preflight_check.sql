-- TerraNexa - checagem antes de aplicar a estrutura oficial
-- Execute no Supabase SQL Editor antes do 001_terranexa_schema.sql.

select
  table_name,
  case
    when table_name is not null then 'existe'
    else 'nao existe'
  end as status
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'fazendas',
    'talhoes',
    'safras',
    'insumos',
    'estoque',
    'operacoes',
    'ordens_servico',
    'monitoramentos'
  )
order by table_name;

select 'fazendas' as tabela, count(*) as registros from public.fazendas
union all
select 'talhoes' as tabela, count(*) as registros from public.talhoes
union all
select 'insumos' as tabela, count(*) as registros from public.insumos
union all
select 'ordens_servico' as tabela, count(*) as registros from public.ordens_servico;

select
  id,
  nome,
  proprietario_id,
  case
    when proprietario_id is null then 'precisa_vincular_usuario'
    else 'ok'
  end as status_permissao
from public.fazendas
order by created_at desc;

select
  id,
  email,
  created_at
from auth.users
order by created_at desc;
