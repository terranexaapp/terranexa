# TerraNexa Supabase Setup

Execute estes arquivos no SQL Editor do Supabase, nesta ordem:

1. `database/001_terranexa_schema.sql`
2. `database/002_storage_buckets.sql`

Depois configure no Supabase Auth:

- Site URL: `https://SEU-PROJETO.vercel.app`
- Redirect URLs:
  - `https://SEU-PROJETO.vercel.app/*`
  - `http://127.0.0.1:5174/*`
  - `http://localhost:5173/*`

Variaveis do Vercel:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Buckets criados:

- `mapas`: KML, KMZ, ZIP e shapefiles originais.
- `monitoramentos`: fotos e evidencias de scouting.
- `relatorios`: PDFs e documentos gerados.
- `receituarios`: receituarios e anexos agronomicos.

Regra de armazenamento:

Os arquivos ficam em caminhos iniciados pelo ID do usuario autenticado:

```text
<user_id>/<fazenda_id>/<modulo>/<timestamp>-arquivo.kml
```

Isso permite que as policies do Storage protejam os arquivos por usuario.
