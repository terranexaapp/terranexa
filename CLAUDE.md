# TerraNexa — Contexto para Claude Code

App agrícola **React/Vite + Supabase** para gestão de fazendas (monitoramento, OS, scouting/MIP, ciclos produtivos, rastreabilidade de insumos).

## Convenções de trabalho

- **Branch ativo:** `claude/modulos-gerenciais` (criado a partir de `main`). Sempre trabalhar nele, não fazer push direto em `main`.
- **Vercel:** auto-deploya o branch — `git push` → preview no Vercel pronto.
- **Plano de roadmap:** `docs/plano-modulos.md` e `PRIORIDADES.md` (na raiz).
- **Ambiente local:** `npm` NÃO está no PATH do PowerShell desta máquina. Não tentar `npm run build` direto pelo Claude — pedir pro usuário rodar em terminal separado se precisar testar build.

## Supabase

- **Project ref:** `wqnhzbwrsjwcvhnbzwtb`
- **DDL/migrations:** rodar via Management API — `POST https://api.supabase.com/v1/projects/{ref}/database/query` com Bearer token pessoal (gerado em https://supabase.com/dashboard/account/tokens). API rejeita SQL grande com comentários e múltiplos statements em uma só chamada → **rodar statement por statement**.
- **Token de acesso:** NUNCA commitar. Pedir ao usuário quando precisar rodar migration.

## RLS / schema gotchas

- Helper canônico de auth: `usuario_dono_talhao(uuid)` e `usuario_dono_fazenda(uuid)` — usar em todas as policies de monitoramento e dados agronômicos.
- Coluna de dono em `fazendas` é `proprietario_id` (NÃO `owner_id`).
- Tabela `fazenda_membros` ainda não existe — não tentar fazer JOIN com ela. Está planejada para a feature de convite por email.
- Função `touch_updated_at()` está disponível para triggers de `updated_at`.

## Arquitetura

- **Entidade central:** `ciclo_produtivo` (talhão + safra + cultura).
- **Context global:** `FarmAppContext` — `fazendaAtiva`, `cicloAtivo`, `talhaoAtivo`, `usuarioRole`.
- **Design system:** `src/styles/theme.js` — usar sempre `const C = theme.normal` em componentes.
- **Rotas:** `/` → `FazendasPage`, `/fazenda/:id` → `FazendaDetalhePage`, `/os` → `OSPage`, `/insumos` → `InsumosPage`, `/login` → `LoginPage`. `/signup` redireciona para `/login` (acesso restrito por convite).
- **Libs centrais:** `src/lib/monitoramentos.js`, `src/lib/os.js`, `src/lib/fazendas.js`, `src/lib/equipes.js`, `src/lib/pragasDoencas.js`, `src/lib/storage.js`, `src/lib/supabase.js`.

`FazendaDetalhePage.jsx` foi refatorado em `src/pages/FazendaDetalhe/`:
- `views.jsx` — DashboardView, MonitoramentoDashboardView, InterpolacaoView
- `monitoramentoOcorrencia.jsx` — nova tela de scouting com GPS contínuo + drafts + registro agrupado (substitui `MonitoramentoRegistroView`)
- `gerencial.jsx` — GerencialView (safras, equipe, estoque, insumos, máquinas, produtividade, centros de custo)
- `mapaPrincipal.jsx`, `panels.jsx`, `talhaoGeoModal.jsx`, `equipeManager.jsx`, `constants.js`, `styles.js`, `hooks.js`, `utils.js`, `maps.jsx`, `offline.js`, `DesktopIcon.jsx`

## Estado atual (2026-05-17)

**Head:** `c6bdfd2` — "feat(auth): novo login com background agronomico, remover signup publico"

### Fase 4 — Monitoramento (CONCLUÍDA)

Migration `001L` aplicada no Supabase:
- `monitoramento_pontos.tipo_registro text` (default `'ocorrencia'`)
- `monitoramento_pontos.dados_especificos jsonb` (campos específicos por tipo de praga)
- `monitoramento_pontos.ponto_grupo_id uuid` + index (agrupa várias ocorrências no mesmo ponto GPS)
- Tabela `monitoramento_caminhamentos` (trilha GPS do técnico) com RLS via `usuario_dono_talhao`
- `pragas_doencas` (catálogo) criada + populada com 40 itens nas fazendas existentes + trigger auto-seed para novas fazendas
- `pragas_doencas.foto_url text` para foto de cada praga

**Fluxo `monitoramentoOcorrencia.jsx`:**
1. Click em "Monitorar" → tela de categorias direto
2. GPS `watchPosition` começa imediatamente, acumula trilha em `trilhaRef`
3. User escolhe categoria → lista de pragas (filtrada por `tipo`) → form específico
4. "Salvar ocorrência" → adiciona ao array `drafts` (não grava no DB ainda)
5. User pode adicionar várias ocorrências (Praga + Daninha + Estádio…) ao mesmo ponto
6. "Registrar ponto (N)" → captura GPS uma vez, gera `ponto_grupo_id` UUID, grava todos os drafts compartilhando coords + grupo
7. Ao sair: salva `monitoramento_caminhamentos` se houve atividade

**Forms específicos por tipo de praga:**
- Lagarta: pequenas/médias/grandes por metro + dano (leve/moderada/severa) + ação sugerida
- Percevejo: adultos/ninfas por metro
- Daninha: desenvolvimento (Inicial/Vegetativo/Reprodutivo) + pressão (Alta/Média/Baixa)
- Estádio: dropdown VE→R8
- Plantio: lista de espaçamentos → CV (coef. variação) calculado
- Colheita: m² + gramas → sacos perdidos/ha calculado
- Outras: observações + foto

Câmera nativa via `<input capture="environment">` (não galeria).

### Login (CONCLUÍDO em c6bdfd2)

`src/pages/LoginPage.jsx` reescrito com:
- Background fullscreen (foto Unsplash de campo agrícola)
- Card glassmorphism dark (backdrop-filter blur)
- Tagline "O campo nas suas mãos" no desktop (some <900px)
- Logo SVG inline novo
- Toggle mostrar/ocultar senha
- Mensagem "Acesso restrito por convite" (link de cadastro removido)
- `/signup` redireciona para `/login` (rota pública removida)

### Pendente — Fase 5

1. **Convite por email** (próxima):
   - Tabela `fazenda_membros` (fazenda_id, usuario_id, role)
   - Edge Function `invite-user` usando `auth.admin.inviteUserByEmail` com service_role
   - UI "Convidar usuário" no `equipeManager.jsx` ou seção nova
   - Atualizar RLS de tabelas core para considerar membros (não só `proprietario_id`)

2. **BI / Relatórios:**
   - Relatórios: agronômico, financeiro, OS, estoque, scouting, PDF
   - Dashboard por safra/ciclo
   - Heatmap de monitoramentos no mapa
   - Calendário de OS e visitas
   - Custos por ciclo/ha

## Wire-up entre módulos importante

- **OSPage lê `location.state.fromMonitoramento`** (commit `85a9570`): se vier daquele state, pré-preenche o `NovaOSModal`:
  - `talhoesSel` = `[talhaoId]`
  - `form.observacoes` = `recomendacao`
  - `prioridade` mapeada de `severidade` (`nde`/`severa`→alta, `moderada`→media, `leve`→baixa)
  - `insumoSugeridoId` é adicionado a `insumosRec` automaticamente
  - Banner vermelho no header do modal com nome da praga + severidade
- Shape: `{ talhaoId, talhaoCodigo, fazendaId, insumoSugeridoId, recomendacao, severidade, pragaDoencaId, pragaNome }`
