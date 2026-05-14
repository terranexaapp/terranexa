-- TerraNexa - conferencia final da estrutura Supabase

select
  'fazendas' as item,
  count(*)::text as resultado
from public.fazendas
union all
select 'talhoes', count(*)::text from public.talhoes
union all
select 'safras', count(*)::text from public.safras
union all
select 'insumos', count(*)::text from public.insumos
union all
select 'ordens_servico', count(*)::text from public.ordens_servico
union all
select 'monitoramentos', count(*)::text from public.monitoramentos;

select
  id,
  nome,
  proprietario_id,
  case
    when proprietario_id is null then 'sem_dono'
    else 'vinculada'
  end as status
from public.fazendas
order by created_at desc;

select
  codigo,
  area_ha,
  cultura,
  ativo,
  case
    when geometria is null then 'sem_geometria'
    else 'com_geometria'
  end as geometria_status,
  arquivo_origem_bucket,
  arquivo_origem_path
from public.talhoes
order by codigo
limit 20;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'fazendas',
    'talhoes',
    'safras',
    'insumos',
    'estoque',
    'operacoes',
    'ordens_servico',
    'pluviometros',
    'chuva_registros',
    'amostras_solo',
    'monitoramentos',
    'relatorios'
  )
order by tablename;

select
  id as bucket_id,
  name,
  public
from storage.buckets
where id in ('mapas', 'monitoramentos', 'relatorios', 'receituarios')
order by id;
