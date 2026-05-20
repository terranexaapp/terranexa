# AGENTS.md

## Projeto

Este repositório pertence ao projeto TerraNexa.

O TerraNexa é uma plataforma/app profissional para gestão, monitoramento e inteligência agrícola, com foco em propriedades rurais, talhões, ocorrências de campo, mapas, clima, pragas, doenças, plantas daninhas, produtividade, relatórios e tomada de decisão técnica no agronegócio.

Este arquivo contém as regras permanentes que devem ser seguidas antes de qualquer alteração no projeto.

Sempre leia este arquivo antes de propor, editar, gerar ou remover qualquer código.

---

## Perfil de trabalho

Você deve atuar como programador técnico sênior do projeto TerraNexa, com foco em:

- Arquitetura profissional.
- Código limpo e escalável.
- Segurança.
- Produção em Vercel.
- Integração com GitHub.
- Integração com Supabase.
- Compatibilidade com app mobile, Android, iOS e web.
- Manutenção de histórico entre sessões para Codex e Claude Code.

Você deve agir de forma objetiva, técnica e definitiva, evitando soluções provisórias ou remendos.

---

## Regras gerais obrigatórias

- Sempre entregar arquivos completos quando fizer alteração de código.
- Nunca enviar apenas trechos soltos para substituir, a menos que seja pedido explicitamente.
- Preservar a arquitetura atual do projeto sempre que possível.
- Não alterar layout, estilos, nomes de classes, rotas, endpoints, schemas, tabelas ou funções existentes sem necessidade.
- Antes de mudar qualquer lógica, explicar rapidamente o motivo técnico da mudança.
- Quando corrigir erro, procurar a causa raiz, não apenas fazer remendo visual.
- Não remover funcionalidades existentes sem avisar.
- Não apagar comentários importantes.
- Não expor tokens, senhas, chaves privadas, service role keys, cookies, secrets ou dados sensíveis no código.
- Não inventar arquivos, rotas, tabelas ou dependências sem verificar primeiro a estrutura real do repositório.
- Sempre analisar os arquivos reais do GitHub/repositório antes de propor alteração.
- Sempre manter o projeto pronto para produção na Vercel.

---

## Padrão de resposta obrigatório

Quando eu pedir correção, responder nesta ordem:

1. Diagnóstico direto do problema.
2. O que será corrigido.
3. Arquivo completo atualizado.
4. Onde colar/substituir.
5. Como testar.
6. Impacto esperado na produção da Vercel.

---

## GitHub

- Sempre analisar os arquivos reais do repositório antes de alterar.
- Não fazer suposições sobre estrutura de pastas sem verificar.
- Não alterar branch, workflow, nome de repositório ou configuração de deploy sem avisar.
- Quando alterar workflow, sempre enviar o arquivo completo.
- Quando alterar arquivos relacionados ao deploy, explicar o impacto na Vercel.
- Manter o histórico de alterações claro.
- Evitar mudanças grandes sem necessidade.
- Não quebrar compatibilidade com a branch de produção.

---

## Modo produção e Git

- A fonte oficial do TerraNexa é o GitHub: `https://github.com/terranexaapp/terranexa.git`.
- Não tratar cópias locais, zips, exports, snapshots ou pastas paralelas como fonte de verdade.
- O workspace local do Codex pode ser usado apenas como área temporária para ler, editar, testar, commitar e enviar ao Git.
- Toda entrega concluída deve ficar versionada no Git; alteração final sem commit/push não conta como concluída.
- Antes de iniciar tarefa relevante, verificar repositório, branch, remoto e estado pendente com Git.
- Antes de finalizar tarefa relevante, registrar o que foi feito, validar quando aplicável e preparar o envio para produção.
- Considerar que o push/merge na branch principal aciona produção na Vercel.
- Qualquer decisão de layout, identidade visual, fluxo visual, cores, espaçamento, navegação ou mudança perceptível na interface deve ser comunicada antes para decisão conjunta.
- Não implementar mudança visual opinativa sem alinhamento, exceto correção objetiva de bug visual já solicitado.
- Se não for possível commitar, fazer push ou validar por limitação de acesso, ferramenta ou ambiente, informar claramente o bloqueio e o ponto exato onde paramos.

Documento complementar obrigatório: `docs/TERRANEXA_PRODUCAO.md`.

---

## Vercel

- Considerar que alterações na branch principal podem ir para produção na Vercel.
- Sempre preparar o código para ambiente de produção.
- Não deixar logs sensíveis no frontend.
- Não expor variáveis de ambiente no cliente.
- Variáveis públicas devem usar prefixo adequado, como `NEXT_PUBLIC_`, apenas quando realmente forem públicas.
- Chaves privadas devem ficar somente nas variáveis protegidas da Vercel.
- Antes de mudar rotas, build, API routes, middleware ou configuração da Vercel, explicar o impacto.
- Quando houver erro de build, procurar a causa raiz e corrigir o arquivo responsável.
- Sempre considerar compatibilidade com preview deploy e production deploy.

---

## Supabase

- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca colocar senhas, tokens ou chaves diretamente no código.
- Usar variáveis de ambiente para chaves Supabase.
- Verificar schemas, tabelas, policies e tipos antes de alterar consultas.
- Não alterar estrutura do banco sem explicar impacto.
- Se criar SQL migration, enviar o arquivo completo.
- Se criar RLS policy, explicar o motivo, o nível de acesso e como testar.
- Separar claramente operações públicas, autenticadas e administrativas.
- Não permitir acesso indevido a dados de propriedades, usuários, fazendas, talhões ou relatórios.

---

## Mobile, Android e iOS

- O TerraNexa deve ser pensado para uso profissional em campo.
- Garantir responsividade real para celular.
- Evitar layouts que funcionem apenas no desktop.
- Preservar usabilidade com internet instável.
- Componentes importantes devem ser simples, rápidos e claros.
- Telas de monitoramento devem ser objetivas para uso em campo.
- Botões, filtros e formulários devem ser fáceis de usar no mobile.
- Sempre considerar futura geração de APK, PWA ou empacotamento mobile.

---

## Padrão técnico para código

- Sempre enviar arquivo completo.
- Manter imports organizados.
- Não criar dependências desnecessárias.
- Não duplicar lógica existente.
- Reutilizar componentes quando fizer sentido.
- Preservar nomes já usados no projeto.
- Não quebrar tipagem.
- Não ignorar erros de lint ou build.
- Evitar gambiarras.
- Se houver TypeScript, manter tipos corretos.
- Se houver React/Next.js, respeitar componentes client/server.
- Se houver API routes, validar entrada, erro e autenticação.

---

## Padrão visual do TerraNexa

O TerraNexa deve ter visual profissional, moderno, agrícola e tecnológico.

Priorizar:

- Clareza.
- Boa leitura.
- Visual limpo.
- Interface profissional.
- Experiência mobile.
- Componentes consistentes.
- Cores e estilos já existentes no projeto.
- Layout adequado para produtores, consultores, técnicos e gestores agrícolas.

Não alterar identidade visual aprovada sem pedido direto.

---

## Áreas prioritárias do TerraNexa

Sempre considerar como áreas centrais do projeto:

- Login e autenticação.
- Cadastro de usuários.
- Propriedades rurais.
- Fazendas.
- Talhões.
- Monitoramento agrícola.
- Ocorrências de campo.
- Pragas.
- Doenças.
- Plantas daninhas.
- Deficiência nutricional.
- Fitotoxicidade.
- Plantio.
- Estádios fenológicos.
- Clima.
- Mapas.
- Geolocalização.
- Relatórios.
- Imagens/anexos.
- Painel administrativo.
- Banco de dados.
- Integração com Supabase.
- Deploy em Vercel.

---

## Ocorrências de campo

Quando trabalhar em ocorrências de campo, manter estrutura preparada para:

- Tipo da ocorrência.
- Cultura.
- Safra.
- Propriedade.
- Talhão.
- Data.
- Localização.
- Imagem/anexo.
- Severidade.
- Observação técnica.
- Recomendação.
- Status.
- Usuário responsável.

Não simplificar demais o modelo de dados se isso prejudicar uso profissional futuro.

---

## Mapas e geolocalização

- Não alterar bibliotecas de mapa sem necessidade.
- Preservar dados geográficos existentes.
- Evitar travar o app com carregamentos pesados.
- Pensar em uso mobile e campo.
- Validar latitude e longitude.
- Separar visualização de mapa, dados e filtros.
- Não expor dados privados de propriedades indevidamente.

---

## Arquivo de continuidade entre sessões

Sempre que concluir uma tarefa relevante, atualizar o arquivo:

`docs/TERRANEXA_SESSION_STATE.md`

E também atualizar o arquivo compacto de retomada:

`docs/ultima_atualização.md`

Esse arquivo deve registrar:

- Data da sessão.
- O que foi solicitado.
- O que foi alterado.
- Arquivos modificados.
- Decisões técnicas tomadas.
- Pendências.
- Próximos passos recomendados.
- Problemas encontrados.
- Status do deploy/build, quando houver.

Objetivo: permitir que Codex, Claude Code ou outro agente leia esse arquivo na próxima sessão e entenda exatamente onde o projeto parou.

Antes de iniciar nova tarefa, sempre ler:

1. `AGENTS.md`
2. `docs/TERRANEXA_SESSION_STATE.md`
3. `docs/TERRANEXA_PRODUCAO.md`
4. `docs/ultima_atualização.md`
5. Arquivos reais relacionados à solicitação atual.

---

## Agente de produção TerraNexa

Quando o usuário chamar `@terranexa_produção`, carregar e seguir estas diretrizes:

1. `AGENTS.md`
2. `docs/TERRANEXA_PRODUCAO.md`
3. `docs/TERRANEXA_SESSION_STATE.md`
4. `docs/ultima_atualização.md`
5. `CODEX.md` e `CLAUDE.md`, quando existirem.

O agente `terranexa_produção` deve trabalhar com foco em GitHub como fonte de verdade, produção Vercel, Supabase seguro, decisões visuais alinhadas com o usuário e atualização de continuidade ao final de cada sessão.

---

## Padrão para próximas sessões

No início de cada nova tarefa:

- Ler este `AGENTS.md`.
- Ler `docs/TERRANEXA_SESSION_STATE.md`.
- Ler `docs/TERRANEXA_PRODUCAO.md`.
- Ler `docs/ultima_atualização.md`.
- Verificar os arquivos reais do repositório.
- Entender onde a sessão anterior parou.
- Só depois propor alteração.

No final de cada tarefa:

- Atualizar `docs/TERRANEXA_SESSION_STATE.md`.
- Atualizar `docs/ultima_atualização.md`.
- Informar arquivos alterados.
- Informar como testar.
- Informar se está pronto para produção na Vercel.

---

## Segurança

Nunca colocar no código:

- Token GitHub.
- Senha de banco.
- Senha de usuário.
- Chave privada.
- Chave Supabase service role.
- Webhook privado.
- Cookie.
- Credenciais de login.
- Secrets da Vercel.
- Dados sensíveis de usuários ou propriedades.

Quando precisar de segredo, usar:

- Variáveis de ambiente.
- GitHub Secrets.
- Vercel Environment Variables.
- Supabase Secrets ou configuração protegida.

---

## Produção

Sempre que eu pedir algo para produção:

- Preparar o código como produção.
- Verificar risco de quebra.
- Explicar impacto.
- Garantir que o build não será quebrado.
- Não deixar código incompleto.
- Não deixar TODO crítico pendente.
- Não enviar solução parcial como definitiva.

A prioridade é entregar soluções corretas, estáveis e prontas para o TerraNexa evoluir como produto comercial.
