# Última Atualização TerraNexa

## 2026-05-20 - Nomes de usuarios e fluxo mobile de campo

### Onde paramos

- A Central passou a trabalhar com `Nome no app` para membros de fazenda; novos convites exigem nome e vinculos antigos podem ser corrigidos com `Salvar nome`.
- Criada a rota `api/atualizar-nome-usuario-fazenda.js` para atualizar `fazenda_membros.nome` e `profiles.nome` com service role no backend.
- Monitoramentos, operacoes e OS agora gravam nome do tecnico/executor/criador/fechador.
- No mobile, o Scouting fica em 8 dias e lista apenas talhoes com monitoramento realizado no periodo.
- Periodos 30d/90d ficam apenas para gerente/agronomo/proprietario no desktop.
- Tecnico, operador e coordenador nao veem abertura de OS; o mapa mobile recebeu rail lateral direito com Menu, Resumo, Monitoramento e GPS.
- Historicos locais de pontos/caminhamentos sao limpos apos sincronizacao sem falha.

### Proxima retomada

- Aplicar `database/014_usuarios_nomes_mobile_monitoramento.sql` no SQL Editor do Supabase de producao.
- Confirmar `SUPABASE_SERVICE_ROLE_KEY` na Vercel.
- Em usuarios antigos, preencher `Nome no app` e clicar `Salvar nome` para remover a duplicidade de e-mail na hierarquia e alimentar os registros futuros.
- Testar em mobile: Scouting 8d, mapa sem `Abrir OS` para tecnico/operador/coordenador e sync limpando historico local.

### Status

- `git diff --check` passou.
- `node --check api/enviar-convite.js` passou.
- `node --check api/atualizar-nome-usuario-fazenda.js` passou.
- Build de producao passou com Vite.
- O conector Supabase desta sessao nao expos execucao SQL; migration 014 ainda precisa ser aplicada no Supabase.

## 2026-05-20 - Correcao RLS ao salvar culturas do catalogo

### Onde paramos

- Corrigido o fluxo da Central em "Pragas, doencas e daninhas" para nao depender mais de escrita direta do navegador em `catalogo_praga_culturas`.
- Criada a rota serverless `api/salvar-culturas-catalogo.js`, usando `SUPABASE_SERVICE_ROLE_KEY` somente no backend.
- `src/lib/centralTerranexa.js` agora usa essa rota protegida quando a RPC do catalogo falta, o schema cache ainda nao recarregou ou a operacao direta bate em RLS.
- Criada a migration `database/013_corrigir_rls_catalogo_culturas.sql` para consolidar RLS, grants e RPCs do catalogo no Supabase.
- Build de producao passou com Vite.

### Proxima retomada

- Aplicar `database/013_corrigir_rls_catalogo_culturas.sql` no SQL Editor do Supabase de producao.
- Confirmar que `SUPABASE_SERVICE_ROLE_KEY` esta configurada na Vercel.
- Testar na Central com usuario interno TerraNexa: marcar/desmarcar culturas de uma praga, doenca ou daninha e salvar.

### Status

- `node --check api/salvar-culturas-catalogo.js` passou.
- `node --check api/excluir-usuario.js` passou.
- `git diff --check` passou.
- Build de producao passou.
- Lint/Prettier nao rodaram porque os binarios nao existem neste `node_modules`.
- Commit e push para `main` concluidos: `4d2c0ee`.
- Deploy Vercel de producao confirmado como `READY`: `dpl_7bDHEkCVh6w8zDw6KoYE8Vh23J4c`.
- Endpoint novo publicado e respondendo: `GET /api/salvar-culturas-catalogo` retornou `405 metodo_nao_permitido`, esperado para rota POST.

## 2026-05-20 - Central TerraNexa Supabase e exclusao de usuarios

### Onde paramos

- A Central agora tem exclusao operacional de usuarios na aba "Usuarios e fazendas".
- A exclusao definitiva usa `api/excluir-usuario.js` com `SUPABASE_SERVICE_ROLE_KEY` somente no backend.
- O frontend bloqueia exclusao do proprio usuario, de usuarios internos e de usuarios proprietarios de fazendas.
- Vinculos em fazendas podem ser revogados diretamente pela hierarquia da pagina.
- O catalogo agronomico trata a RPC ausente `definir_culturas_catalogo_praga` e tem migration oficial para recriar RPCs e recarregar o schema cache.
- O README de deploy registra `SUPABASE_SERVICE_ROLE_KEY` como variavel protegida obrigatoria na Vercel.

### Proxima retomada

- Aplicar `database/012_recriar_rpc_catalogo_convites.sql` no Supabase de producao se ainda nao tiver sido aplicada.
- Conferir na Vercel se `SUPABASE_SERVICE_ROLE_KEY` esta configurada no ambiente de producao.
- Testar com usuario `terranexa_admin`: revogar um membro de fazenda, excluir um usuario sem fazendas proprias e salvar culturas na aba de pragas/doencas/daninhas.

### Status

- `git diff --check` passou.
- `api/excluir-usuario.js` passou em `node --check`.
- Build de producao passou com Vite.
- Lint nao rodou porque o executavel do ESLint nao existe em `node_modules` neste checkout.

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
