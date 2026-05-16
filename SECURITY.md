# SECURITY — TerraNexa

Checklist de hardening do app, dividido entre o que já está no código
e o que precisa ser configurado nos painéis externos (Mapbox, Supabase,
Vercel) antes/depois de cada deploy de produção.

## ✅ Já implementado no código

### Headers HTTP (em `vercel.json`)

Todos os responses servidos pelo Vercel recebem:

- **`Content-Security-Policy`** — restringe origens de scripts, conexões
  e imagens. Permite só `self` para scripts; libera `*.supabase.co`
  (REST + websocket realtime), `api.mapbox.com` e `server.arcgisonline.com`
  para tiles. Bloqueia inline `<script>` (não usamos nenhum).
- **`Strict-Transport-Security`** (HSTS) — 1 ano + subdomínios + preload.
- **`X-Content-Type-Options: nosniff`** — impede o browser de inferir
  Content-Type errado.
- **`X-Frame-Options: DENY`** + `frame-ancestors 'none'` (no CSP) —
  bloqueia clickjacking via iframe.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — não vaza
  paths internos pra outros sites.
- **`Permissions-Policy`** — desliga APIs sensíveis não usadas (camera,
  microphone, payment, USB, etc) e libera só `geolocation=(self)` que
  é o que o scouting georreferenciado precisa.

> 💡 Verificar headers depois de subir o deploy:
> `curl -I https://terranexa.vercel.app`
> Ou usar https://securityheaders.com/ pra ter uma nota A+.

### Configuração de runtime

- `src/lib/supabase.js` valida `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` em runtime e faz throw se faltarem.
- `src/pages/FazendaDetalhe/constants.js` agora emite
  `console.warn` em build de produção (`import.meta.env.PROD`) quando
  `VITE_MAPBOX_TOKEN` está vazio — fallback automático pra ESRI.

### Garantias do refactor anterior

- `escapeHtml()` em `src/pages/FazendaDetalhe/utils.js` é usado em
  todo HTML que é injetado em markers Leaflet via `divIcon` — evita
  XSS via nome de pluviômetro / código de talhão.
- `parseKmlText()` usa `DOMParser` e checa `parsererror`; não eval'a
  nenhum conteúdo do KML.
- `saveMonitoringPointOffline()` corta o array em 600 itens pra evitar
  encher o `localStorage` (mitiga DoS local).

## 🔲 Ações manuais (a fazer antes de subir pra produção)

### 1. Mapbox — restringir token por HTTP referrer

O `VITE_MAPBOX_TOKEN` é embutido no bundle JS (não tem como esconder
um token público no client). Pra evitar que copiem o token e gastem
sua cota:

1. Acessar https://account.mapbox.com/access-tokens/
2. Editar o token usado em `VITE_MAPBOX_TOKEN`
3. Em **URL restrictions**, adicionar:
   - `https://terranexa.vercel.app/*`
   - `https://*-terranexa.vercel.app/*` (pra cobrir previews)
   - `http://localhost:5173/*` (dev local)
4. **Salvar.** Tokens de produção sem restrição de referrer devem
   ser tratados como vazados.

### 2. Supabase — Allowed URLs / CORS

No painel do Supabase, em **Authentication → URL Configuration**:

- **Site URL:** `https://terranexa.vercel.app`
- **Redirect URLs:** adicionar
  - `https://terranexa.vercel.app/**`
  - `https://*-terranexa.vercel.app/**` (previews)
  - `http://localhost:5173/**` (dev)

E em **API → CORS / Allowed Origins**:

- Adicionar **apenas** os domínios acima. Em particular, **não deixar
  `*`** em produção.

### 3. Supabase — email confirmation

Em **Authentication → Providers → Email**:

- **Enable email confirmations:** **ON** em produção
  (no `INSTALACAO.md` está documentado como OFF pra facilitar dev).
- **Secure email change:** ON
- **Secure password change:** ON
- Configurar SMTP próprio em **Auth → Settings → SMTP** (o SMTP
  padrão do Supabase tem rate limit baixíssimo e remetente genérico).

### 4. Supabase — verificar RLS antes de cada release

Rodar no SQL Editor:

```sql
-- Toda tabela do schema public DEVE ter RLS habilitado
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Qualquer linha com `rowsecurity = false` é vazamento potencial. As
policies estão em `database/001F1_*.sql` até `001F4_*.sql`. Se subir
a trilha `supabase/migrations/` ao invés da `database/`, **revisar
manualmente** o `002_rls_policies.sql` antes de aplicar (foi corrigido
recentemente, mas é o lugar onde mais acontece de RLS ficar de fora).

> Sanity check final: logar com 2 usuários (A e B) e tentar via
> console:
> `await supabase.from('fazendas').select('*')`
> O usuário A não deve ver fazendas do B em nenhum cenário.

### 5. Vercel — variáveis de ambiente

Em **Settings → Environment Variables** do projeto:

| Variável | Production | Preview | Development |
|---|---|---|---|
| `VITE_SUPABASE_URL` | URL prod | URL prod | URL dev |
| `VITE_SUPABASE_ANON_KEY` | anon prod | anon prod | anon dev |
| `VITE_MAPBOX_TOKEN` | token restrito ao domínio | mesmo | dev opcional |

**Nunca** colocar `service_role` key do Supabase aqui — só `anon`.

### 6. Auditoria de dependências

Hoje há uma vulnerability moderada em `vite` (path traversal no dev
server, https://github.com/advisories/GHSA-4w7w-66w2-5vf9). O fix é
subir pra `vite@^8`, que é major bump. Sem urgência pra prod (a vuln
só afeta o dev server, que não roda em produção), mas vale agendar.

Comando manual:
```
npm audit
```

## 🔮 Roadmap de segurança (não-bloqueante)

- **Sentry / error tracking** — hoje `ErrorBoundary` só mostra a tela;
  nada é enviado pra ninguém. Captura passiva ajuda a detectar tentativas
  de XSS ou injeção que o CSP bloqueou.
- **Rate limiting** em ações sensíveis (signup, login, criar fazenda).
  Supabase tem rate-limit padrão por IP — verificar valores no painel.
- **2FA** opcional no fluxo de login (Supabase suporta TOTP nativamente).
- **Backup automático** da base no Supabase (em **Database → Backups**).
- **Audit log** — Supabase Pro tem audit log nativo; revisar se vale.
