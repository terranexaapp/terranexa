# 🌱 TerraNexa · Atualização 1: Cadastro de Fazendas e Talhões

Este pacote adiciona ao projeto base:

- ✅ Listagem de fazendas (múltiplas por usuário)
- ✅ Cadastro de fazenda
- ✅ Página de detalhe da fazenda com mapa geral
- ✅ Cadastro de talhão em **3 modos**:
  - **Desenhar no mapa** (Leaflet + tiles satélite gratuitos da Esri)
  - **Upload de KML / KMZ**
  - **Upload de Shapefile (.zip)**
- ✅ Cálculo automático de área em hectares
- ✅ Soma automática das áreas dos talhões na fazenda (via trigger no banco)
- ✅ Mapa com toggle satélite/ruas
- ✅ Edição em lote ao subir arquivo com múltiplos talhões

---

## 📦 Como instalar

### 1. Substitua/adicione os arquivos no seu projeto local

Copie os arquivos da pasta `terranexa-update/` para dentro do seu projeto `terranexa/`, mantendo a mesma estrutura de pastas:

```
terranexa/
├── package.json                                  ← SUBSTITUIR
├── src/
│   ├── App.jsx                                   ← SUBSTITUIR
│   ├── components/
│   │   ├── MapView.jsx                           ← NOVO
│   │   └── NovoTalhaoModal.jsx                   ← NOVO
│   ├── lib/
│   │   ├── geo.js                                ← NOVO
│   │   └── fazendas.js                           ← NOVO
│   └── pages/
│       ├── FazendasPage.jsx                      ← NOVO
│       └── FazendaDetalhePage.jsx                ← NOVO
└── supabase/migrations/
    └── 004_geometria_e_area_automatica.sql       ← NOVO
```

> ⚠️ Você pode **deletar** o arquivo antigo `src/pages/HomePage.jsx` — ele foi substituído por `FazendasPage.jsx`.

### 2. Instale as novas dependências

```bash
cd terranexa
npm install
```

Novas bibliotecas instaladas:
- `leaflet` + `react-leaflet` + `leaflet-draw` — mapa interativo
- `@turf/turf` — cálculo de área e centroide
- `@tmcw/togeojson` — converte KML para GeoJSON
- `shpjs` — lê Shapefiles diretamente do navegador
- `jszip` — descompacta KMZ

### 3. Rode a migration no Supabase

1. Abra o Supabase → **SQL Editor**
2. Cole o conteúdo de `supabase/migrations/004_geometria_e_area_automatica.sql`
3. Clique em **Run**

Isso adiciona um trigger que atualiza automaticamente o `area_total_ha` da fazenda toda vez que um talhão é criado, editado ou excluído.

### 4. Rode o projeto

```bash
npm run dev
```

Abra `http://localhost:5173`. Agora você verá a tela de **Fazendas** após login.

---

## 🧪 Como testar

### Teste 1 — Desenhar no mapa
1. Clique em **+ NOVA FAZENDA** → preencha nome, município, UF → criar
2. Na página da fazenda, clique em **+ NOVO TALHÃO**
3. Escolha **Desenhar no mapa**
4. No mapa, use o ícone de polígono (canto superior direito)
5. Clique para marcar os vértices e clique no primeiro ponto para fechar
6. Veja a área calculada automaticamente
7. Preencha código, cultura e fase → **SALVAR TALHÃO**

### Teste 2 — Upload de KML
Use qualquer arquivo `.kml` exportado do Google Earth Pro (ou faça um online em [geojson.io](https://geojson.io) → exportar como KML).

1. **+ NOVO TALHÃO** → **Upload de KML / KMZ**
2. Toque na área pontilhada e selecione o arquivo
3. O app lê os polígonos, calcula áreas e mostra a lista
4. Edite código, cultura, fase de cada talhão
5. **SALVAR**

### Teste 3 — Upload de Shapefile
Crie um .zip contendo os arquivos `.shp`, `.dbf` e `.shx` (formato padrão de GIS).

> 💡 Para testar rapidamente, baixe um exemplo em: https://github.com/calvinmetcalf/shapefile-js/tree/master/test/data

1. **+ NOVO TALHÃO** → **Upload de Shapefile (.zip)**
2. Selecione o .zip
3. Mesma experiência do KML

---

## 🗄️ Estrutura de dados

### `talhoes.geometria`
GeoJSON Feature, exemplo:
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-40.50, -9.39],
      [-40.49, -9.39],
      [-40.49, -9.38],
      [-40.50, -9.38],
      [-40.50, -9.39]
    ]]
  },
  "properties": {}
}
```

### `fazendas.area_total_ha`
Calculado automaticamente pela soma de `talhoes.area_ha` onde `ativo = true`.

---

## 🔍 Próximos passos sugeridos

- [ ] Permitir editar polígono de talhão já criado
- [ ] Adicionar bottom nav (Início / Mapa / Comparar / OS)
- [ ] Tela de detalhe do talhão (histórico de operações)
- [ ] Cadastro de insumos
- [ ] Formulário de nova operação

Avise quando estiver rodando e me diga qual é o próximo!
