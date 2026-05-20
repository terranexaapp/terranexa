# TerraNexa Session State

## Sessao de 2026-05-20 - diretrizes de producao e agente terranexa_producao

### O que foi solicitado

- Criar um MD registrando como devemos trabalhar com o app TerraNexa no Codex.
- Registrar que a fonte de verdade deve ser o Git/GitHub, nao copias locais ou snapshots.
- Manter as mesmas diretrizes de execucao ja registradas nos historicos e documentos do projeto.
- Registrar que tudo sobe para producao e que decisoes de layout ou mudanca visual devem ser informadas para decisao conjunta.
- Criar o agente `@terranexa_produção`.
- Criar o arquivo `ultima_atualização` para servir como parametro de retomada apos cada sessao.

### O que foi alterado

- Criado `docs/TERRANEXA_PRODUCAO.md` com as regras de trabalho em producao, Git, Vercel, decisao visual e fechamento de sessao.
- Criado `.codex/agents/terranexa_produção.toml` com as instrucoes do agente de producao.
- Criado `docs/ultima_atualização.md` com o resumo curto de onde paramos.
- Atualizado `AGENTS.md` para incluir modo producao/Git, agente de producao e atualizacao obrigatoria do arquivo de ultima atualizacao.
- Atualizado este arquivo com o registro da sessao.

### Arquivos modificados

- `AGENTS.md`
- `docs/TERRANEXA_PRODUCAO.md`
- `docs/TERRANEXA_SESSION_STATE.md`
- `docs/ultima_atualização.md`
- `.codex/agents/terranexa_produção.toml`

### Decisoes tecnicas tomadas

- O GitHub `https://github.com/terranexaapp/terranexa.git` foi registrado como fonte oficial.
- O workspace local do Codex foi definido apenas como area temporaria para ler, editar, testar, commitar e enviar ao Git.
- O arquivo `docs/TERRANEXA_SESSION_STATE.md` continua como historico detalhado.
- O arquivo `docs/ultima_atualização.md` passa a ser o resumo curto de retomada.
- O agente `@terranexa_produção` deve carregar `AGENTS.md`, `docs/TERRANEXA_PRODUCAO.md`, `docs/TERRANEXA_SESSION_STATE.md`, `docs/ultima_atualização.md`, `CODEX.md` e `CLAUDE.md` quando existirem.

### Pendencias

- Confirmar se o nome com acento `terranexa_produção` sera reconhecido exatamente pelo seletor de agentes do Codex; se houver limitacao tecnica, manter o conteudo e criar um alias ASCII `terranexa_producao`.

### Como testar

- Abrir `AGENTS.md` e confirmar a secao "Modo produção e Git".
- Abrir `docs/TERRANEXA_PRODUCAO.md` e confirmar as regras operacionais.
- Abrir `.codex/agents/terranexa_produção.toml` e confirmar que o nome do agente esta como `terranexa_produção`.
- Abrir `docs/ultima_atualização.md` e confirmar que o ponto de retomada esta claro.

### Status do deploy/build

- Mudanca apenas documental/configuracao de agente.
- Build/lint nao sao necessarios para esta alteracao.
- Impacto esperado na Vercel: nenhum impacto funcional direto.

## Sessao de 2026-05-19 - convite de tecnico e RPC de culturas

### O que foi solicitado

- Corrigir o fluxo de convite por e-mail para tecnico: o e-mail chega, mas o link "Conecte-se" abre a tela de login; o esperado e abrir a tela para criar senha e depois liberar acesso ao app.
- Corrigir erro ao salvar culturas de uma praga/doenca/daninha na Central TerraNexa: `Could not find the function public.definir_culturas_catalogo_praga(p_catalogo_praga_id, p_culturas) in the schema cache`.

### O que foi alterado

- O convite agora grava `convite_token` nos metadados do usuario criado por invite/magic link, para o app recuperar o fluxo mesmo quando o Supabase redirecionar para a Site URL.
- A rota publica autenticada agora procura convite pendente por metadata ou por e-mail e redireciona para `/aceitar-convite?token=...&setup=senha`.
- O login normal tambem procura convite pendente por e-mail quando nao ha `redirect` explicito.
- A tela de aceitar convite limpa os metadados temporarios do convite depois que o vinculo e aceito.
- Criada a migration `database/012_recriar_rpc_catalogo_convites.sql`, que recria as RPCs do catalogo, garante grants e executa `notify pgrst, 'reload schema'`.
- A mensagem de erro da Central para RPC ausente agora orienta rodar a migration 012.

### Arquivos modificados

- `api/enviar-convite.js`
- `src/App.jsx`
- `src/pages/LoginPage.jsx`
- `src/pages/AceitarConvitePage.jsx`
- `src/lib/conviteEmail.js`
- `src/lib/convites.js`
- `src/lib/centralTerranexa.js`
- `database/012_recriar_rpc_catalogo_convites.sql`
- `database/README.md`
- `docs/TERRANEXA_SESSION_STATE.md`

### Decisoes tecnicas tomadas

- Mantido o fluxo Supabase Auth com `inviteUserByEmail`, `resetPasswordForEmail` e fallback por magic link; a senha continua sendo definida no app com `supabase.auth.updateUser({ password })` apos a sessao do link.
- O `convite_token` em `user_metadata` e usado apenas para recuperacao de rota, nao para autorizacao. A autorizacao real continua na RPC `aceitar_convite`, que valida usuario autenticado, e-mail e status pendente.
- A RPC publica de catalogo passou a ser wrapper `security invoker`; a operacao privilegiada ficou em `terranexa_private` com checagem `usuario_terranexa_admin()`.
- A migration 012 deve ser aplicada no SQL Editor do Supabase de producao para resolver o erro de schema cache.

### Pendencias

- No Supabase Auth, confirmar URL Configuration:
  - Site URL: dominio oficial de producao.
  - Additional Redirect URLs: dominio oficial com `/aceitar-convite**` e URLs de preview/local necessarias.
- Nos templates de e-mail do Supabase, confirmar que o link usa o link de confirmacao/redirecionamento do Supabase, nao apenas `SiteURL`; caso contrario o e-mail sempre voltara para login.
- Rodar `database/012_recriar_rpc_catalogo_convites.sql` no SQL Editor do Supabase.
- Em 2026-05-19, ao tentar rodar a migration 012, o dashboard inseriu indevidamente `ALTER TABLE v_invalid ENABLE ROW LEVEL SECURITY` dentro da funcao. A migration foi ajustada para usar delimitadores nomeados e variavel `v_invalidas`.

### Como testar

- Convidar um tecnico novo para uma fazenda.
- Abrir o e-mail no celular e tocar em "Conecte-se".
- Confirmar que o app abre `/aceitar-convite?token=...&setup=senha`, mostra a fazenda, permite criar senha e redireciona para a fazenda.
- Na Central, alterar as culturas de uma praga/daninha/doenca e salvar; a mensagem deve indicar fazendas sincronizadas.

### Status do deploy/build

- Build de producao executado com sucesso usando Vite: `node node_modules/vite/bin/vite.js build`.
- `npm` nao esta disponivel no PATH desta sessao.
- Lint nao foi executado porque `node_modules/eslint` e `node_modules/.bin` nao existem no workspace atual.
- Impacto esperado na Vercel: apos deploy e aplicacao da migration 012, convites devem levar o tecnico para criacao de senha/aceite e a edicao de culturas por praga deve parar de retornar erro de RPC ausente.

## Sessão de 2026-05-19

### O que foi solicitado

- Criar `AGENTS.md` na raiz do repositório com as regras permanentes do projeto TerraNexa.
- Criar `docs/TERRANEXA_SESSION_STATE.md` para registrar continuidade entre sessões.
- Criar `.codex/agents/terranexa-dev.toml` como agente customizado do TerraNexa.
- Mostrar o conteúdo completo dos três arquivos para revisão.

### O que foi alterado

- Criado o arquivo `AGENTS.md` com regras permanentes para Codex, Claude Code e outros agentes.
- Criado este arquivo de estado de sessão para registrar solicitações, alterações, decisões, pendências e próximos passos.
- Criado o agente customizado `terranexa-dev` em `.codex/agents/terranexa-dev.toml`.

### Arquivos modificados

- `AGENTS.md`
- `docs/TERRANEXA_SESSION_STATE.md`
- `.codex/agents/terranexa-dev.toml`

### Decisões técnicas tomadas

- A raiz real do repositório foi identificada como `C:\Users\Ideal\Documents\New project\terranexaapp-work`, pois é a única pasta do workspace atual que contém `.git`.
- O arquivo `AGENTS.md` foi criado na raiz real do repositório.
- O arquivo de continuidade foi criado dentro de `docs/`, seguindo a regra definida no próprio `AGENTS.md`.
- O agente customizado foi configurado para atuar como programador técnico sênior do TerraNexa, priorizando produção em Vercel, Supabase, segurança, mobile e histórico entre sessões.

### Pendências

- Revisar o conteúdo dos três arquivos criados.
- Confirmar se o formato TOML do agente customizado atende exatamente ao fluxo desejado no Codex.

### Próximos passos recomendados

- Em novas tarefas, iniciar lendo `AGENTS.md`, `docs/TERRANEXA_SESSION_STATE.md`, `CODEX.md` e os arquivos reais relacionados à solicitação.
- Ao concluir tarefas relevantes, atualizar este arquivo com data, alterações, decisões, pendências e status de build/deploy.
- Validar build e lint apenas quando houver alteração de código, dependências, rotas, banco, Vercel ou comportamento do app.

### Problemas encontrados

- A pasta inicial `C:\Users\Ideal\Documents\New project` não é um repositório Git.
- O repositório correto foi localizado em `C:\Users\Ideal\Documents\New project\terranexaapp-work`.
- Antes desta sessão, já havia uma alteração não relacionada em `package.json`; ela não foi modificada.

### Status do deploy/build

- Build não executado nesta sessão porque foram criados apenas arquivos de documentação/configuração de agente.
- Nenhuma alteração de código de aplicação, banco, rota ou configuração de deploy foi feita.
- Impacto esperado na Vercel: nenhum impacto funcional direto.
