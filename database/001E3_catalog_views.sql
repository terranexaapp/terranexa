create or replace function public.popular_catalogo_base(p_fazenda_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inseridos integer;
begin
  if not public.usuario_dono_fazenda(p_fazenda_id) then
    raise exception 'Acesso negado';
  end if;

  insert into public.insumos (fazenda_id, nome, classe, unidade, custo_unitario, carencia_dias, fornecedor)
  values
    (p_fazenda_id, 'Glifosato', 'herbicida', 'L', 0, 0, null),
    (p_fazenda_id, '2,4-D', 'herbicida', 'L', 0, 0, null),
    (p_fazenda_id, 'Fungicida multissitio', 'fungicida', 'kg', 0, 0, null),
    (p_fazenda_id, 'Inseticida fisiologico', 'inseticida', 'L', 0, 0, null),
    (p_fazenda_id, 'Adjuvante', 'adjuvante', 'L', 0, 0, null),
    (p_fazenda_id, 'Fertilizante NPK', 'fertilizante', 'kg', 0, 0, null)
  on conflict do nothing;

  get diagnostics inseridos = row_count;

  insert into public.estoque (insumo_id)
  select i.id
  from public.insumos i
  left join public.estoque e on e.insumo_id = i.id
  where i.fazenda_id = p_fazenda_id
    and e.id is null;

  return inseridos;
end;
$$;

create or replace view public.v_custo_por_categoria as
with custo_operacao as (
  select
    o.id,
    o.talhao_id,
    o.categoria,
    coalesce(o.custo_aplicacao, 0) + coalesce(sum(oi.custo_total), 0) as custo_total
  from public.operacoes o
  left join public.operacao_insumos oi on oi.operacao_id = o.id
  group by o.id
)
select
  talhao_id,
  categoria,
  count(*)::integer as qtd_operacoes,
  sum(custo_total)::numeric(14, 2) as custo_total
from custo_operacao
group by talhao_id, categoria;
