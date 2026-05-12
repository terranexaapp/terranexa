-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · SEED DE DADOS DE EXEMPLO
-- Migration: 003_seed_demo_data
-- ATENÇÃO: Edite USER_EMAIL para o e-mail que você usou no cadastro
-- ════════════════════════════════════════════════════════════════

do $$
declare
  v_user_id uuid;
  v_fazenda_id uuid;
  v_safra_id uuid;
  v_t1 uuid;
  v_roundup uuid; v_oleo uuid;
  v_op_id uuid;
  USER_EMAIL text := 'COLOQUE_SEU_EMAIL_AQUI@exemplo.com';
begin
  select id into v_user_id from auth.users where email = USER_EMAIL limit 1;

  if v_user_id is null then
    raise notice 'Usuário não encontrado. Cadastre-se primeiro pelo app.';
    return;
  end if;

  insert into public.fazendas (proprietario_id, nome, municipio, estado, area_total_ha)
  values (v_user_id, 'Fazenda São José', 'Petrolina', 'PE', 142.0)
  returning id into v_fazenda_id;

  insert into public.safras (fazenda_id, nome, data_inicio, ativa)
  values (v_fazenda_id, 'Safra 2024/25', '2024-10-01', true)
  returning id into v_safra_id;

  insert into public.talhoes (fazenda_id, codigo, cultura, area_ha, fase, saude)
  values
    (v_fazenda_id, 'T1', 'soja',    28, 'floracao',   92),
    (v_fazenda_id, 'T2', 'milho',   15, 'vegetativo', 78),
    (v_fazenda_id, 'T3', 'algodao', 22, 'brotacao',   85),
    (v_fazenda_id, 'T4', 'feijao',   8, 'colheita',   96);

  select id into v_t1 from public.talhoes where fazenda_id = v_fazenda_id and codigo = 'T1';

  insert into public.insumos (fazenda_id, nome, classe, unidade, custo_unitario, carencia_dias)
  values (v_fazenda_id, 'Roundup WG 720', 'herbicida', 'kg', 14.00, 0)
  returning id into v_roundup;
  insert into public.estoque (insumo_id, quantidade_atual, quantidade_inicial, quantidade_minima)
  values (v_roundup, 120, 120, 30);

  insert into public.insumos (fazenda_id, nome, classe, unidade, custo_unitario, carencia_dias)
  values (v_fazenda_id, 'Óleo Mineral', 'adjuvante', 'L', 12.00, 0)
  returning id into v_oleo;
  insert into public.estoque (insumo_id, quantidade_atual, quantidade_inicial, quantidade_minima)
  values (v_oleo, 40, 40, 10);

  insert into public.operacoes (talhao_id, safra_id, categoria, tipo, data_operacao, custo_aplicacao)
  values (v_t1, v_safra_id, 'dessecacao_pre_plantio', 'Dessecação Pré-Plantio', '2024-10-12', 400)
  returning id into v_op_id;

  insert into public.operacao_insumos (operacao_id, insumo_id, dose, dose_unidade, quantidade_total, custo_total)
  values
    (v_op_id, v_roundup, 2.5, 'kg/ha', 70, 980),
    (v_op_id, v_oleo,    0.2, 'L/ha',  5.6, 67.2);

  insert into public.ordens_servico (fazenda_id, talhao_id, numero, operacao_recomendada, categoria, prioridade)
  values (v_fazenda_id, v_t1, 'OS-001', 'Aplicação Fungicida Aéreo', 'fungicida_aereo', 'alta');

  raise notice '✓ Seed concluído! Fazenda São José criada.';
end $$;
