# `database/` — Trilha canônica de migrations TerraNexa

Esta é a **única trilha oficial** de schema. Toda tabela, função, view
e policy usada pelo app vive aqui. Anteriormente havia uma trilha
paralela em `supabase/migrations/` que era incompleta; ela foi removida
no commit que adicionou este README.

## Quando rodar

Use o **SQL Editor** do painel Supabase (Database → SQL Editor → New
query) e cole os arquivos **na ordem listada abaixo**, um por vez. Cada
um deve retornar "Success. No rows returned".

Quando o Supabase CLI for adotado (futuro), basta concatenar os
arquivos numa migration única com timestamp ou rodar `supabase db
push` com a estrutura atual via [override de trilha](https://supabase.com/docs/reference/cli/supabase-db-push).

## Ordem de execução

### 🟢 Setup inicial (rodar 1 vez, na criação do banco)

| # | Arquivo | O que faz |
|---|---|---|
| 0 | `000_preflight_check.sql` | Verifica extensions e schema base. Roda sozinho, idempotente. |
| 1 | `001A_core_existing_tables.sql` | `profiles`, `fazendas`, `talhoes`. |
| 2 | `001B_operational_tables.sql` | `equipes`, `insumos`, `estoque`. |
| 3 | `001C_orders_and_operations.sql` | `safras`, `operacoes`, `operacao_insumos`, `ordens_servico`, `os_talhoes`, `os_insumos`. |
| 4 | `001D_agronomic_modules.sql` | `pluviometros`, `chuva_registros`, `amostras_solo`, `monitoramentos`, `monitoramento_pontos`, `monitoramento_caminhamentos`, `armadilhas`, `relatorios`. |
| 5 | `001E1_profiles_helpers.sql` | Triggers de `auth.users` → `public.profiles` (cria profile no signup). |
| 6 | `001E2_os_functions.sql` | Funções de OS (próximo número, totais). |
| 7 | `001E3_catalog_views.sql` | Views úteis (`v_custo_por_categoria`, etc). |
| 8 | `001E_functions_and_views.sql` | Funções de permissão `usuario_dono_*` (usadas pelas policies). |
| 9 | `001F1_enable_rls.sql` | Habilita RLS em todas as tabelas. |
| 10 | `001F2_core_policies.sql` | Policies de fazendas / talhões / safras. |
| 11 | `001F3_operations_policies.sql` | Policies de operações / OS / insumos / estoque. |
| 12 | `001F4_agronomic_policies.sql` | Policies de pluviômetros / monitoramentos / amostras. |
| 13 | `001G_area_trigger.sql` | Trigger que mantém `fazendas.area_total_ha` em sincronia com soma de talhões. |
| 14 | `001H_maquinas.sql` | Tabela `maquinas` (frota da fazenda) + index + RLS + trigger updated_at. |
| 15 | `001I_produtividades.sql` | Tabela `produtividades` (histórico de colheitas por talhão/safra) + indexes + RLS. |
| 16 | `001J_centros_custo.sql` | Tabela `centros_custo` + trigger seed (34 CCs por fazenda) + FKs em operacoes/ordens_servico/insumos/maquinas. |
| 17 | `001K_pragas_doencas.sql` | Tabela `pragas_doencas` + seed de 40+ itens BR + colunas em monitoramento_pontos. |
| 18 | `002_storage_buckets.sql` | Buckets Storage: `mapas`, `comprovantes`, etc. |
| 19 | `003_vincular_dados_existentes.sql` | Backfill (executar **só uma vez** logo após criar seu usuário no app). |
| 20 | `004_final_check.sql` | Sanity check de RLS / tabelas. Roda no fim e reporta o que faltou. |

> 💡 Os arquivos `001_terranexa_schema.sql` e `001E_functions_and_views.sql`
> e `001F_security_policies.sql` (sem letras pós-`001`) são versões
> **consolidadas** dos arquivos `001A..001F4`. Você roda **OU** os
> consolidados **OU** os split, não os dois. A versão split é a
> recomendada porque deixa mais claro qual passo falhou em caso de erro.

### 🌱 Seed de exemplo (opcional)

`seeds/demo_data.sql` — cria uma fazenda **São José** com 4 talhões,
3 insumos e 1 operação de exemplo. Rodar **só depois** de criar seu
usuário no app pela tela de signup. Antes de colar no SQL Editor,
edite a constante `USER_EMAIL` no início do arquivo.

## Como verificar se rodou tudo

```sql
-- Toda tabela em public DEVE ter rowsecurity = true
select tablename, rowsecurity
from pg_tables where schemaname = 'public'
order by tablename;

-- O sanity check final reporta tabelas e policies criadas
\i 004_final_check.sql
```

Ou abra `004_final_check.sql` no SQL Editor e rode lá.

## Mudanças incrementais

Após o setup inicial, mudanças de schema devem ser adicionadas como
**novos arquivos** (`005_*.sql`, `006_*.sql`…) — nunca editar os
existentes em produção. Cada arquivo precisa ser idempotente
(`create table if not exists`, `drop trigger if exists` antes de
`create trigger`, etc).
