# BACKLOG — TerraNexa

Itens identificados na auditoria de estrutura ([análise completa](https://claude.ai/code/session_01SScsNwe323ZCCb76uccFfn)) que **não** foram implementados nas fases 1 e 2, com justificativa e plano.

---

## 🟡 Refactor estrutural (Fase 3 — deferido)

### 1. Quebrar `src/pages/FazendaDetalhePage.jsx` (4071 linhas)

**Por que não foi feito agora:** o arquivo contém 7 visões (mapa, dashboard, chuvas, solo, scouting, gerencial, relatórios), múltiplos modais, navegação desktop e ~100 objetos de estilo inline. Sem rodar o app no navegador e clicar manualmente em cada visão, há risco real de regressão visual silenciosa que o `vite build` não detecta.

**Plano sugerido quando for executar:**

```
src/pages/FazendaDetalhe/
├── index.jsx              ← container, state global, layout, leaflet bootstrap
├── constants.js           ← FASE_LABELS, NAV_ITEMS, DESKTOP_NAV_GROUPS, MAPBOX_*, etc
├── views/
│   ├── MapView.jsx
│   ├── DashboardView.jsx
│   ├── ChuvasView.jsx
│   ├── SoloView.jsx
│   ├── ScoutingView.jsx
│   ├── GerencialView.jsx
│   └── RelatoriosView.jsx
└── modals/
    ├── NovoTalhaoModal.jsx
    ├── NovoPluviometroModal.jsx
    └── NovoMonitoramentoModal.jsx
```

Recortar arquivo sem mudar lógica — sem renomear props, sem mexer em handlers. Cada commit deve sair com `npm run build` limpo e — idealmente — verificação manual no navegador.

### 2. Extrair estilos inline para CSS Modules ou `theme`

Há ~100 objetos de estilo inline repetidos. Existe `src/styles/theme.js` com tokens, mas várias cores estão hardcoded em paralelo (`#3D8A22` em vez de `C.greenDp`). Migrar gradualmente quando tocar em cada componente.

### 3. Code-splitting via `manualChunks` no Vite

Bundle atual: 581 KB (156 KB gzip). O build avisa pra splitar. Sugestão de chunks: `vendor-react`, `vendor-supabase`, `vendor-leaflet`, `vendor-geo` (jszip/shpjs/turf). Reduz tempo de boot e melhora cache entre deploys.

---

## 🟢 Melhorias contínuas (Fase 4 — backlog)

### Performance & dados

- **React Query / SWR** para cache + deduplicação automática de queries do Supabase. Hoje vários componentes refazem `listarFazendas()` e `listarInsumos(fazendaId)` independentemente.
- **Loading skeletons** em vez de "CARREGANDO..." monoespaçado.
- **Offline sync** com IndexedDB — PWA já tem service worker, mas não há estratégia de leitura offline.

### Qualidade

- **Testes E2E** com Playwright cobrindo o golden path: cadastro → login → criar fazenda → criar talhão (3 modos) → registrar operação → fechar OS.
- **Sentry** ou equivalente pra captura de erro em produção (hoje `ErrorBoundary` só mostra a tela; nada é enviado pra ninguém).
- **Lint + Prettier** — não há `.eslintrc` nem `.prettierrc` no repo. Adicionar pra estabilizar formatação em PRs.
- **react-hook-form + zod** pra forms maiores (NovaOSModal especialmente — tem 14 estados).

### Acessibilidade

- Auditoria geral com axe-devtools. Pontos já notados:
  - Botões com label só visual (`←`, `✕`, `▼`) sem `aria-label`.
  - Cores de status (`OK`/`BAIXO`/`CRITICO`) precisam de fallback textual além de cor.
  - `htmlFor`/`id` em labels de form (hoje os `<label>` envolvem visualmente mas não estão associados semanticamente).

### Database

- A trilha `supabase/migrations/` é o **mínimo viável**; a trilha `database/` tem schema completo com módulos agronômicos (pluviômetros, monitoramentos, amostras de solo, armadilhas, equipes, storage buckets). Decidir se consolida tudo em `supabase/migrations/` (canônico do CLI) ou mantém divisão atual com docs claras.
- Adicionar `pg_stat_statements` ou rodar `explain analyze` nas queries mais pesadas (joins de `v_talhao_resumo`) quando o app escalar.

### Segurança

- **`MAPBOX_TOKEN`** é embutido no client — o que é normal pra tokens públicos do Mapbox, mas restringir o token por **HTTP referrer** no painel do Mapbox antes de subir pra produção.
- Revisar **CORS / Allowed Origins** no Supabase pra incluir só o domínio do Vercel + localhost.
- Habilitar **email confirmation** no Supabase quando for pra produção (no dev está desligado conforme README).
