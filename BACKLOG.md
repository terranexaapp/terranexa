# BACKLOG — TerraNexa

Itens identificados na auditoria de estrutura ([análise completa](https://claude.ai/code/session_01SScsNwe323ZCCb76uccFfn)) que **não** foram implementados nas fases 1 e 2, com justificativa e plano.

---

## 🟡 Refactor estrutural (Fase 3)

### 1. Quebrar `src/pages/FazendaDetalhePage.jsx` ✅ CONCLUÍDO

Arquivo original de 4071 linhas foi quebrado em 14 arquivos coesos
dentro de `src/pages/FazendaDetalhe/`:

| Arquivo                | Linhas | Responsabilidade |
|------------------------|--------|------------------|
| `constants.js`         |   96 | FASE_LABELS, NAV_ITEMS, DESKTOP_NAV_GROUPS, MAPBOX_*, etc |
| `hooks.js`             |   43 | useMediaQuery, useDevicePosition |
| `leafletLoader.js`     |   38 | Carga lazy do Leaflet global |
| `offline.js`           |   30 | requestOfflineStorage, saveMonitoringPointOffline |
| `utils.js`             |  357 | 28 funções puras (geo, format, monitoramento) |
| `styles.js`            |  239 | 234 const *Style |
| `DesktopIcon.jsx`      |  234 | Componente SVG de ícones do menu |
| `sharedComponents.jsx` |  249 | MetricCard, Field, SmartInsightCard, OperacaoCard etc |
| `panels.jsx`           |  156 | ManagementModulePanel, RelatoriosView, CustosPanel etc |
| `views.jsx`            |  608 | FarmDesktopSidebar, DashboardView, ScoutingView, MonitoramentoRegistroView, InterpolacaoView |
| `maps.jsx`             |  462 | SimpleFarmMap, LeafletFarmMap, VectorFarmMap |
| `mapaPrincipal.jsx`    |  335 | FazendaMapaPrincipal (view padrão) |
| `gerencial.jsx`        |  367 | GerencialView + PluviometroManager + MapaCadastroTalhoes |
| `talhaoGeoModal.jsx`   |  215 | Modal de cadastro com desenho/KML |
| `FazendaDetalhePage.jsx` | **702** | Orquestrador (state global, layout, fluxo Supabase) |

Bônus: removido ~500 linhas de código morto descoberto na auditoria:
- `SatelliteFarmMap` (425 linhas) — definido mas nunca chamado
- `TalhoesCommandCenter` — só era usado dentro de um `{false && ...}`
- `TalhoesPanel`, `HistoricoPanel` — definidos sem nenhum caller

Build limpo após cada commit; nenhum comportamento de runtime mudou.

### 2. Extrair estilos inline para CSS Modules ou `theme`

Há ~100 objetos de estilo inline repetidos. Existe `src/styles/theme.js` com tokens, mas várias cores estão hardcoded em paralelo (`#3D8A22` em vez de `C.greenDp`). Migrar gradualmente quando tocar em cada componente.

### 3. Code-splitting via `manualChunks` no Vite ✅ CONCLUÍDO

Bundle quebrado em 4 chunks via `vite.config.js`:
- `vendor-router` (21 KB / 8 KB gz) — react-router-dom
- `vendor-react`  (142 KB / 46 KB gz) — react, react-dom, scheduler
- `vendor-supabase` (207 KB / 53 KB gz) — @supabase/supabase-js
- `index` (210 KB / 51 KB gz) — código da app + restante

Total ~580 KB igual ao bundle único anterior; o ganho real é em cache
entre deploys (vendor-* só recriado quando muda a dep) e em paralelismo
de download (HTTP/2). Warning de "chunk > 500 KB" do Vite sumiu.

Bônus: removidos os pacotes npm `leaflet`, `leaflet-draw` e
`react-leaflet` do `package.json` — só eram referenciados por código
morto (`src/components/MapView.jsx` e `NovoTalhaoModal.jsx`) que foi
deletado. O Leaflet real é carregado dinamicamente via `<script>` tag
de `/public/vendor/leaflet/leaflet.js`.

---

## 🟢 Melhorias contínuas (Fase 4 — backlog)

### Performance & dados

- **React Query / SWR** para cache + deduplicação automática de queries do Supabase. Hoje vários componentes refazem `listarFazendas()` e `listarInsumos(fazendaId)` independentemente.
- **Loading skeletons** em vez de "CARREGANDO..." monoespaçado.
- **Offline sync** com IndexedDB — PWA já tem service worker, mas não há estratégia de leitura offline.

### Qualidade

- **Testes E2E** com Playwright cobrindo o golden path: cadastro → login → criar fazenda → criar talhão (3 modos) → registrar operação → fechar OS.
- **Sentry** ou equivalente pra captura de erro em produção (hoje `ErrorBoundary` só mostra a tela; nada é enviado pra ninguém).
- **Lint + Prettier** ✅ CONCLUÍDO — ESLint 9 flat config + Prettier 3 + `eslint-plugin-unused-imports`. Scripts: `lint`, `lint:fix`, `format`. Linha de base: 299 warnings + 2 errors → 7 warnings + 0 errors (após cleanup automático e manual). Os 7 warnings restantes estão documentados na próxima seção.
- **react-hook-form + zod** pra forms maiores (NovaOSModal especialmente — tem 14 estados).

#### Warnings de lint que ficaram intencionalmente:

- **5x `react-hooks/exhaustive-deps` em `FazendaDetalhe/maps.jsx`** — re-fits de mapa e atualização de markers têm deps incompletas de propósito (`normalized`, `fullBleed`, `activePluviometros`, `deviceMarker`). Mexer nessas deps arrisca regressões visuais difíceis de detectar sem rodar e clicar manualmente. Resolver junto com uma revisão visual completa do mapa.
- **1x mesma classe em `views.jsx`** (MonitoramentoRegistroView) — `addPosition` é recriada a cada render; adicionar à dep array dispararia o useEffect em cascata. Idealmente envolver com `useCallback`.
- **1x `react-refresh/only-export-components` em `hooks/useAuth.jsx`** — arquivo exporta `AuthProvider` (componente) + `useAuth` (hook). Pra resolver, separar em dois arquivos. Impacta só DX em dev (hot-reload faz full reload em vez de fast-refresh).

### Acessibilidade

- Auditoria geral com axe-devtools. Pontos já notados:
  - Botões com label só visual (`←`, `✕`, `▼`) sem `aria-label`.
  - Cores de status (`OK`/`BAIXO`/`CRITICO`) precisam de fallback textual além de cor.
  - `htmlFor`/`id` em labels de form (hoje os `<label>` envolvem visualmente mas não estão associados semanticamente).

### Database

- A trilha `supabase/migrations/` é o **mínimo viável**; a trilha `database/` tem schema completo com módulos agronômicos (pluviômetros, monitoramentos, amostras de solo, armadilhas, equipes, storage buckets). Decidir se consolida tudo em `supabase/migrations/` (canônico do CLI) ou mantém divisão atual com docs claras.
- Adicionar `pg_stat_statements` ou rodar `explain analyze` nas queries mais pesadas (joins de `v_talhao_resumo`) quando o app escalar.

### Segurança ✅ PARCIAL (código pronto; configs externas pendentes)

Implementado em código:
- Headers HTTP em `vercel.json` (CSP, HSTS, nosniff, X-Frame-Options,
  Referrer-Policy, Permissions-Policy).
- `console.warn` em produção quando `VITE_MAPBOX_TOKEN` falta.

Pendente — ações manuais documentadas em [`SECURITY.md`](./SECURITY.md):
- Mapbox: restringir token por HTTP referrer no painel.
- Supabase: configurar Allowed URLs / CORS pra só liberar o domínio
  do Vercel + localhost.
- Supabase: habilitar email confirmation antes da produção.
- Supabase: rodar query SQL de verificação de RLS antes de cada release.
- Vercel: garantir que `service_role` não está exposta como env var.
- `vite@^8` quando houver janela (vuln moderada no dev server, sem
  impacto em produção).
