# CODEX.md — Contexto completo do TerraNexa para o Codex

> Documento de transferência: tudo que foi construído/alterado pelo Claude Code
> neste repo, organizado para o Codex pegar o trabalho de onde paramos.
>
> **Stack:** React + Vite + Supabase (Postgres + Auth + Storage + RLS) + Mapbox/Leaflet, deploy no Vercel, PWA.
> **Domínio:** gestão de campo para pequenos produtores do Nordeste (fazendas, talhões, safras, insumos, operações, OS, monitoramento agronômico).
> **Branch atual:** `claude/deploy-todo-preview-DNcCf`
> **Workflow:** ver `CLAUDE.md` — `claude/*` → merge direto na `main` → Vercel auto-deploy em produção (sem staging).

---

## 1. Estrutura do repo

```
terranexa/
├── CLAUDE.md            # Preferências do agente (workflow branch→main→prod)
├── CODEX.md             # Este documento
├── BACKLOG.md           # Backlog técnico, com itens já marcados ✓
├── PRIORIDADES.md       # Backlog adiado
├── SECURITY.md          # Checklist de segurança (headers + RLS + checklist externo)
├── README.md            # Setup do zero ao deploy
├── eslint.config.js     # ESLint 9 flat config
├── .prettierrc.json     # Prettier
├── vite.config.js       # Vite + PWA + manualChunks
├── vercel.json          # Headers HTTP de segurança
├── database/            # Schema canônico (trilha única)
│   ├── 000_preflight_check.sql
│   ├── 001A..001G       # Schema, funções, RLS, triggers (núcleo)
│   ├── 001H_maquinas.sql
│   ├── 001I_produtividades.sql
│   ├── 001J_centros_custo.sql
│   ├── 001K_pragas_doencas.sql
│   ├── 001L_monitoramento_campos_especificos.sql
│   ├── 001M_membros_convites.sql
│   ├── 002_storage_buckets.sql
│   ├── 003_vincular_dados_existentes.sql
│   ├── 004_final_check.sql
│   ├── 005_fix_missing_schema.sql
│   └── seeds/demo_data.sql
├── src/
│   ├── App.jsx          # Roteamento
│   ├── main.jsx         # Entry
│   ├── components/      # AppNav, ErrorBoundary, ErrorPanel, Logo, NovaOperacaoModal
│   ├── hooks/
│   ├── lib/             # Clientes de domínio (1 arquivo por módulo)
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── FazendasPage.jsx
│   │   ├── FazendaDetalhePage.jsx
│   │   ├── FazendaDetalhe/    # Componentes/views extraídos do monólito original
│   │   ├── InsumosPage.jsx
│   │   ├── OSPage.jsx
│   │   └── AceitarConvitePage.jsx
│   └── styles/
└── docs/supabase-setup.md
```

### `src/lib/` (camada de domínio)

Um arquivo por bounded context, sempre falando com Supabase. Convenção: cada
arquivo exporta `listar/criar/atualizar/remover` + agregações específicas.

| Arquivo | Domínio |
|---|---|
| `supabase.js` | cliente único (anon) |
| `fazendas.js` | fazendas + talhões |
| `safras.js` | ciclos produtivos |
| `insumos.js` | catálogo de produtos |
| `operacoes.js` | atividades agronômicas registradas |
| `os.js` | ordens de serviço (com `fromMonitoramento`) |
| `maquinas.js` | frota |
| `produtividades.js` | pesagem da colheita |
| `centrosCusto.js` | centros de custo (obrigatórios em NovaOperacao/NovaOS) |
| `equipes.js` | membros da fazenda |
| `convites.js` | convites por e-mail |
| `monitoramentos.js` | caminhamentos + pontos + ocorrências |
| `pragasDoencas.js` | catálogo agronômico |
| `pluviometros.js` | chuvas |
| `geo.js` | utilitários geoespaciais |
| `storage.js` | upload de fotos (bucket Supabase) |

---

## 2. Histórico cronológico do que foi feito

Lista enxuta dos marcos. Use `git log` para detalhes commit-a-commit.

### Bloco A — Fundação técnica e refatoração (PRs #1–#2)

1. **Refactor do monólito `FazendaDetalhe`** — extraído em 10+ commits:
   constantes/hooks/utils → estilos (`styles.js` com 234 estilos) →
   componentes compartilhados → painéis → views (`MonitoramentoRegistroView`,
   `InterpolacaoView`, `FazendaMapaPrincipal`, `GerencialView`, `TalhaoGeoModal`)
   e remoção de código morto (`SatelliteFarmMap`, `TalhoesCommandCenter`).
2. **Performance / bundle:** `manualChunks` no Vite, remoção de deps órfãs
   (`leaflet` etc.).
3. **Lint + format:** ESLint 9 (flat config) + Prettier; ~290 warnings zerados.
4. **A11y:** `aria-label` em botões de ícone, `htmlFor/id` em forms,
   `focus-visible` global.
5. **Segurança (parcial):** headers HTTP em `vercel.json` + `SECURITY.md`.
6. **Error handling:** `ErrorBoundary` global + tratamento de erros de
   carregamento (`ErrorPanel`).
7. **Banco:** migrations consolidadas em uma única trilha em `database/`
   (eliminada a `supabase/migrations/`).
8. Docs vivos: `BACKLOG.md` + `PRIORIDADES.md`.

### Bloco B — Módulos gerenciais (PR #3, #5, #7)

Novos módulos no painel gerencial, cada um com **schema + lib + tela**:

| Módulo | Schema | Status |
|---|---|---|
| **Safras** | `001D` | ✓ |
| **Equipe** | `001D`/`001M` | ✓ |
| **Estoque** | `001B` | dashboard implementado |
| **Insumos** | `001B` | tab limpo (shortcut) |
| **Máquinas** | `001H_maquinas.sql` | ✓ schema + lib + tela |
| **Produtividade** | `001I_produtividades.sql` | ✓ schema + lib + tela |
| **Centros de Custo** | `001J_centros_custo.sql` | ✓ schema + lib + seção em `ConfiguracaoFazendaPanel`; CC **obrigatório** em `NovaOperacao` e `NovaOS`; CC padrão em Insumos/Máquinas; agregações em telas existentes |

### Bloco C — Monitoramento agronômico (PR #6 + posteriores)

Pipeline completo de monitoramento de pragas/doenças no campo:

1. **Fase 1:** renomear "scouting" → "monitoramento"; dashboard com dados reais.
2. **Fase 2:** catálogo de **pragas e doenças** (`001K_pragas_doencas.sql`).
3. **Fase 3:** severidade, estádio fenológico e fotos por ponto.
4. **Fase 4 (parcial):** botão inline `gerarOSdoPonto` no ponto de monitoramento.
5. **Fluxo novo de ocorrências:** GPS caminhamento + forms específicos por
   praga/doença (`001L_monitoramento_campos_especificos.sql`).
6. **Drafts por ponto + agrupamento:** `ponto_grupo_id` para registrar várias
   ocorrências do mesmo caminhamento juntas.
7. **Wire-up OS:** `NovaOSModal` aceita `fromMonitoramento` e pré-preenche
   talhão/severidade/praga.
8. **Polish UI:** layout centralizado, fotos nos cards, fix em form genérico.
9. **Fix de RLS:** `monitoramento_caminhamentos` agora usa `usuario_dono_talhao`
   (estava bloqueando técnicos legítimos).
10. **Inbox do técnico:** filtros + ações conectadas (resolver/escalar/gerar OS).
11. **Tela ocorrência v2:** bottom sheet sobre o mapa (mobile-first).

### Bloco D — Mapa principal (recente)

1. **Redesign V3 Dock:** novo dock inferior, remoção de zoom/GPS antigos.
2. **GPS rail superior:** botão GPS movido para o rail topo (mobile + desktop).
3. **Cockpit layout:** mapa full-bleed.

### Bloco E — Auth e convites (PRs #7, #8, #9)

1. **Login redesign:** background agronômico, logo original, mobile melhorado.
2. **Remoção de signup público:** entrada apenas por convite.
3. **Sistema de convite por e-mail** (`001M_membros_convites.sql` +
   `convites.js` + `AceitarConvitePage.jsx`); migração `001M` é **idempotente**
   para tabelas opcionais.

### Bloco F — Workflow & deploy (sessão atual)

1. **`CLAUDE.md`** documentando: branch `claude/*` → merge direto à `main`
   via GitHub API (sem PR review) → Vercel auto-deploy → produção.
2. Sem staging — gate antes do merge é `npm run build` + lint local.
3. Decidido manter merge direto à produção (sem preview obrigatório).

---

## 3. Convenções importantes para o Codex seguir

### Banco (Supabase)

- **Trilha única:** `database/` (numerada). Nada em `supabase/migrations/`.
- **Migrations novas:** sempre **idempotentes** (`IF NOT EXISTS`, `CREATE OR
  REPLACE`, `DROP POLICY IF EXISTS` antes de recriar). Veja `001M` como
  referência.
- **RLS em toda tabela.** Padrão: filtrar por `usuario_dono_talhao` /
  `auth.uid()` / membros da fazenda via `001F*`.
- **Storage:** bucket configurado em `002_storage_buckets.sql`.
- Após qualquer schema novo, rode `004_final_check.sql` mentalmente
  (ou peça pro user rodar).

### Frontend

- **JSX puro** (sem TypeScript no projeto).
- Estilos: objetos JS em `styles.js` por página. Não usar CSS-in-JS de
  biblioteca; manter padrão atual.
- **`src/lib/<dominio>.js`** é a única fronteira com o Supabase. Páginas
  importam dessas libs, nunca o `supabase` diretamente (salvo `useAuth`).
- **A11y:** todo botão de ícone precisa `aria-label`; todo `<label>`
  precisa `htmlFor` com `id` correspondente.
- **Error boundaries:** envolver views novas em `ErrorBoundary` quando
  fizer sentido.

### Performance

- Code-splitting via `manualChunks` no `vite.config.js`. Ao adicionar lib
  pesada nova (ex.: chart, geo), considerar registrar um chunk.
- Imagens em `public/` ou via Supabase Storage; nada inline grande.

### Git / workflow

- Branch: `claude/*` (ou `codex/*` se preferir). Merge direto à `main`
  via GitHub API. Não abrir PR review.
- Antes do merge: `npm run build` + lint passando localmente.
- Cada commit usa convencional commits em pt-BR (ex.: `feat(modulo): ...`,
  `fix(db): ...`, `refactor(...)`).
- Vercel deploy é automático em push na `main`.

---

## 4. Estado atual (snapshot)

- **Branch ativa:** `claude/deploy-todo-preview-DNcCf`
- **Último commit:** `073f348 Add CLAUDE.md with development workflow preferences`
- **Build:** verde até a última feature de mapa (`feat(mapa): botao GPS no rail superior`).
- **Migrations aplicadas no Supabase remoto:** confirmar com `database/004_final_check.sql`. O commit `251f0e5` registrou aplicação de `001H/001I/001J`.

### Funcionalidades em produção

- Fazendas, talhões, safras, insumos, estoque, operações, OS, máquinas, produtividade.
- Centros de custo obrigatórios em operações/OS.
- Monitoramento completo (caminhamento GPS + ocorrências por praga/doença + drafts + inbox do técnico + tela v2 com bottom sheet).
- Mapa principal redesenhado (V3 Dock + GPS no rail).
- Login redesenhado + convite por e-mail (signup público desativado).

### Backlog / próximos passos prováveis

- Ver `BACKLOG.md` e `PRIORIDADES.md` para a lista completa.
- Itens com `[ ]` ainda abertos; itens com `[x]` já entregues.
- Roadmap original em `README.md` lista: cadastro de talhões, formulário
  de nova operação, mapa interativo (Mapbox) — partes já entregues, mas
  vale confirmar contra a tabela do README.

---

## 5. Comandos úteis

```bash
# Desenvolvimento
npm install
npm run dev          # http://localhost:5173
npm run build        # gate obrigatório antes de mergear
npm run lint         # gate obrigatório antes de mergear

# Banco (manual, via Supabase SQL Editor)
# Rodar database/*.sql na ordem numerada se for setar do zero.
```

`.env.local` precisa de:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPBOX_TOKEN=
```

---

## 6. Onde procurar quando bater dúvida

- **"Como funciona a tela X?"** → `src/pages/X.jsx` ou `src/pages/FazendaDetalhe/`.
- **"Qual o schema da tabela Y?"** → `database/001*.sql` (grep pelo nome).
- **"Como chamo o Supabase?"** → `src/lib/<dominio>.js`.
- **"O que já foi entregue?"** → `git log --oneline` + `BACKLOG.md`.
- **"O que foi adiado?"** → `PRIORIDADES.md`.
- **"Como faço deploy?"** → push na `main` (Vercel cuida do resto).
- **"Qual o workflow do agente?"** → `CLAUDE.md`.

---

**Última atualização:** 2026-05-18 (sessão Claude Code que documentou o
workflow `branch → main → prod`).
