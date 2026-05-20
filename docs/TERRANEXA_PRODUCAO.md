# Diretrizes de Produção TerraNexa

Este documento define como o TerraNexa deve ser trabalhado no Codex quando a intenção for evoluir, corrigir ou publicar o app.

## Fonte de Verdade

- A fonte oficial do TerraNexa é o GitHub: `https://github.com/terranexaapp/terranexa.git`.
- Não trabalhar em cópias paralelas como fonte final do app.
- Não usar zips, exports, snapshots, `terranexaapp-current`, protótipos antigos ou pastas locais como referência final sem confirmar contra o Git.
- O repositório local do Codex é apenas área temporária de operação: ler, editar, testar, commitar e enviar ao Git.
- Toda entrega concluída deve terminar versionada no Git. Se não houver commit/push, a sessão deve registrar claramente que a entrega ainda não está concluída.

## Início de Cada Sessão

Antes de propor ou alterar qualquer coisa:

1. Ler `AGENTS.md`.
2. Ler este arquivo.
3. Ler `docs/TERRANEXA_SESSION_STATE.md`.
4. Ler `docs/ultima_atualização.md`.
5. Ler `CODEX.md` e `CLAUDE.md` quando existirem.
6. Verificar o estado real do Git: branch, remoto, alterações pendentes e relação com `origin/main`.
7. Abrir os arquivos reais envolvidos na solicitação antes de decidir a solução.

## Execução

- Manter as mesmas diretrizes já registradas no projeto: arquitetura profissional, segurança, Supabase com RLS, produção Vercel, responsividade mobile e histórico entre sessões.
- Preferir mudanças pequenas, claras e rastreáveis.
- Corrigir causa raiz, não apenas sintoma.
- Não inventar arquivos, rotas, tabelas, dependências, schemas ou fluxos sem verificar o repositório real.
- Não remover funcionalidades existentes sem avisar.
- Não expor tokens, senhas, cookies, service role keys ou qualquer dado sensível.
- Quando houver alteração de código, validar com build/lint/teste aplicável antes de considerar pronto.
- Quando houver alteração de banco, documentar migration, impacto e como aplicar em produção.
- Quando houver alteração de deploy/Vercel, explicar impacto antes de finalizar.

## Layout e Mudanças Visuais

Qualquer decisão visual deve ser alinhada com o usuário antes de virar entrega final, incluindo:

- Layout de telas.
- Cores e identidade visual.
- Espaçamentos, cards, menus, navegação, botões e fluxo visual.
- Mudanças perceptíveis no comportamento da interface.
- Redesigns, simplificações visuais ou reorganização de informações.

Correções objetivas de bug visual podem ser feitas quando solicitadas, mas ainda devem ser relatadas ao final com impacto esperado.

## Produção

- Considerar que tudo que sobe para a branch principal pode ir para produção.
- O objetivo padrão é deixar o app pronto para produção na Vercel.
- Não finalizar tarefa relevante com estado local solto.
- Antes de push/merge de algo que muda comportamento, layout, banco, autenticação, API ou deploy, informar impacto esperado.
- Se o ambiente impedir push, build, lint ou validação, registrar o bloqueio em `docs/ultima_atualização.md` e `docs/TERRANEXA_SESSION_STATE.md`.

## Agente `@terranexa_produção`

Quando o usuário chamar `@terranexa_produção`, o agente deve:

1. Carregar estas diretrizes.
2. Tratar GitHub como fonte de verdade.
3. Preservar produção Vercel como destino padrão.
4. Consultar o usuário antes de decisões visuais.
5. Registrar o estado final da sessão.
6. Informar arquivos alterados, validações feitas e pendências.

Arquivo do agente: `.codex/agents/terranexa_produção.toml`.

## Fechamento de Cada Sessão

Ao terminar uma sessão relevante:

1. Atualizar `docs/TERRANEXA_SESSION_STATE.md` com o histórico detalhado.
2. Atualizar `docs/ultima_atualização.md` com o resumo curto de retomada.
3. Informar se houve build, lint, teste, commit, push e impacto em produção.
4. Listar pendências reais, sem esconder bloqueios.
5. Deixar claro de onde a próxima sessão deve continuar.
