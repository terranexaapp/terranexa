# Última Atualização TerraNexa

## 2026-05-20 - Correção do fluxo de convite de usuários

### Onde paramos

- Corrigido o fluxo para convites pendentes não caírem na tela de cadastro de fazenda.
- O cadastro de senha em `/aceitar-convite?token=...&setup=senha` agora aceita o convite, encerra a sessão temporária e volta para o login.
- O login de usuários convidados aceitos agora direciona direto para a fazenda vinculada.
- Convidados sem propriedade própria não veem mais os botões de criar/cadastrar fazenda.

### Próxima retomada

- Testar em produção com um convite novo recebido por e-mail.
- Conferir no Supabase Auth se o template do e-mail usa o redirect correto (`RedirectTo`/confirmation URL), não apenas `SiteURL`.

### Status

- Build de produção passou.
- Lint não rodou porque `eslint` não está presente em `node_modules`.
- Commit e push para `main` concluídos: `4ba5333`.

## 2026-05-20 - Diretrizes de produção e agente Codex

### Onde paramos

- Criadas as diretrizes de produção do TerraNexa em `docs/TERRANEXA_PRODUCAO.md`.
- Registrado o agente `@terranexa_produção` em `.codex/agents/terranexa_produção.toml`.
- Atualizado `AGENTS.md` para exigir GitHub como fonte de verdade, produção Vercel como destino padrão e alinhamento prévio para decisões visuais.
- Mantida a regra de atualizar este arquivo e `docs/TERRANEXA_SESSION_STATE.md` ao final de cada sessão relevante.

### Próxima retomada

- Ao iniciar nova tarefa, ler `AGENTS.md`, `docs/TERRANEXA_PRODUCAO.md`, `docs/TERRANEXA_SESSION_STATE.md` e este arquivo.
- Verificar estado do Git antes de alterar arquivos.
- Qualquer mudança visual deve ser alinhada com o usuário antes de ser efetivada como entrega final.

### Status

- Alteração apenas documental/configuração de agente.
- Sem impacto funcional direto no app.
- Build/lint não são necessários para esta mudança.
- Commit e push para `main` concluídos nesta sessão.
