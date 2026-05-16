# 🌱 TerraNexa

> Gestão do campo para pequenos produtores do Nordeste.
> PWA construído com React, Vite e Supabase.

---

## 🚀 Setup completo (do zero ao deploy)

### Pré-requisitos

- **Node.js 18+** ([baixar](https://nodejs.org))
- **Conta no GitHub** (já tem ✓)
- **Conta no Supabase** (vamos criar agora)
- **Conta no Vercel** (criaremos no deploy)

---

### Passo 1 — Criar conta no Supabase

1. Acesse [supabase.com](https://supabase.com) e clique em **Start your project**
2. Faça login com sua conta do GitHub (mais simples)
3. Clique em **New Project**
4. Preencha:
   - **Name**: `terranexa`
   - **Database Password**: gere uma senha forte e guarde com cuidado
   - **Region**: `South America (São Paulo)` — mais próximo dos produtores
   - **Pricing Plan**: Free (suficiente para começar)
5. Clique em **Create new project** e aguarde uns 2 minutos

---

### Passo 2 — Rodar as migrations do banco

O projeto possui **duas trilhas de migration** com propósitos diferentes:

- **`supabase/migrations/`** — trilha **mínima** (`001` → `004`) com o schema básico (fazendas, talhões, insumos, operações, OS, RLS, geometria). É o suficiente pra rodar **Login / Fazendas / Insumos / OS / Cadastro de talhões via mapa**.
- **`database/`** — trilha **completa** (`001A` … `004_final_check`) com módulos agronômicos avançados (pluviômetros, monitoramento, scouting, amostras de solo, armadilhas, storage buckets, equipes). Necessária pra usar as visões **Chuvas / Solo / Scouting** dentro de `FazendaDetalhePage`.

Quando o projeto estiver pronto:

1. No menu lateral do Supabase, clique em **SQL Editor** → **New query**
2. Rode os arquivos da trilha mínima **na ordem**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/004_geometria_e_area_automatica.sql`
3. Confirme que aparece *"Success. No rows returned"* em cada um
4. Para habilitar os módulos avançados, rode também (na ordem) os arquivos de `database/` — começando por `001_terranexa_schema.sql`, depois `001A` → `001F4`, depois `002_storage_buckets.sql`

> ⚠️ **Não rode o `003_seed_demo_data.sql` ainda** — ele só funciona depois que você criar seu primeiro usuário pelo app.

---

### Passo 3 — Pegar as chaves da API

Ainda no painel do Supabase:

1. Vá em **Project Settings** (ícone de engrenagem no rodapé do menu)
2. Clique em **API**
3. Copie:
   - **Project URL** (algo como `https://abcdef.supabase.co`)
   - **anon public** key (a chave longa)

Guarde essas duas coisas — vamos usar no próximo passo.

---

### Passo 4 — Configurar o projeto local

```bash
# Clone seu repositório (depois de subir o código no GitHub)
git clone https://github.com/SEU_USUARIO/terranexa.git
cd terranexa

# Instale as dependências
npm install

# Copie o arquivo de exemplo de variáveis
cp .env.example .env.local
```

Abra `.env.local` em qualquer editor e preencha:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=cole_a_anon_key_aqui
VITE_MAPBOX_TOKEN=cole_o_token_publico_do_mapbox_aqui
```

---

### Passo 5 — Rodar localmente

```bash
npm run dev
```

Abra `http://localhost:5173` no navegador. Você verá a tela de login.

1. Clique em **Cadastre-se**
2. Crie sua conta com e-mail e senha
3. Verifique seu e-mail e clique no link de confirmação
4. Volte ao app e faça login

Pronto! Já está rodando com banco real. 🎉

> **Dica para desenvolvimento**: para evitar confirmação de e-mail toda vez, vá em **Supabase → Authentication → Providers → Email** e desligue *Confirm email*.

---

### Passo 6 — Popular com dados de demonstração (opcional)

Se quiser ver o app já com uma fazenda exemplo:

1. Abra `supabase/migrations/003_seed_demo_data.sql`
2. Edite a linha `USER_EMAIL` e coloque o e-mail que você usou no cadastro
3. Cole o SQL inteiro no **SQL Editor** do Supabase e rode

Isso cria uma fazenda **São José** com 4 talhões, 3 insumos e 1 operação de exemplo.

---

### Passo 7 — Deploy no Vercel

1. Suba o código no GitHub (veja seção abaixo)
2. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
3. Clique em **Add New → Project**
4. Selecione o repositório `terranexa`
5. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAPBOX_TOKEN`
6. Clique em **Deploy**

Em ~2 minutos seu app está no ar em `terranexa-XXX.vercel.app`. 🚀

---

## 📤 Subir o código no GitHub

```bash
cd terranexa
git init
git add .
git commit -m "Fundação técnica do TerraNexa"
git branch -M main

# Crie um repo novo em https://github.com/new chamado "terranexa"
git remote add origin https://github.com/SEU_USUARIO/terranexa.git
git push -u origin main
```

---

## 📁 Estrutura do projeto

```
terranexa/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/         Componentes reutilizáveis (Logo, etc)
│   ├── hooks/              React hooks (useAuth)
│   ├── lib/                Cliente do Supabase
│   ├── pages/              Telas (Login, Signup, Home)
│   ├── styles/             Tema e CSS global
│   ├── App.jsx             Roteamento principal
│   └── main.jsx            Entry point
├── supabase/
│   └── migrations/         Schema mínimo + RLS (trilha base)
├── database/               Trilha completa: módulos agronômicos avançados
├── .env.example            Modelo de variáveis de ambiente
├── index.html              HTML base
├── package.json
└── vite.config.js          Config do Vite + PWA
```

---

## 🗄️ Schema do banco (resumo)

| Tabela              | Descrição                                              |
|---------------------|--------------------------------------------------------|
| `profiles`          | Perfis estendendo `auth.users`                         |
| `fazendas`          | Propriedades rurais                                    |
| `talhoes`           | Áreas dentro de cada fazenda                           |
| `safras`            | Ciclos produtivos                                      |
| `insumos`           | Catálogo de produtos                                   |
| `estoque`           | Quantidade atual de cada insumo                        |
| `operacoes`         | Atividades registradas                                 |
| `operacao_insumos`  | Insumos usados em cada operação                        |
| `produtividades`    | Pesagem da colheita                                    |
| `ordens_servico`    | OS pendentes/concluídas                                |
| `alertas`           | Notificações inteligentes                              |

Toda tabela tem **Row Level Security (RLS)** ativa — cada produtor só vê seus próprios dados.

---

## 🎨 Identidade visual

- **Verde principal**: `#7EC850`
- **Verde profundo**: `#3D8A22`
- **Âmbar**: `#E8A84C`
- **Terra**: `#A0714F`

Tokens completos em `src/styles/theme.js`.

---

## 🛣️ Próximos passos

- [x] Fundação técnica (este passo)
- [ ] Cadastro de fazenda
- [ ] Cadastro de talhões
- [ ] Catálogo de insumos
- [ ] Formulário de nova operação
- [ ] Tela de detalhe do talhão com histórico
- [ ] Mapa interativo (Mapbox)
- [ ] Sync offline (IndexedDB)

---

## 🆘 Problemas comuns

**"Variáveis de ambiente do Supabase não configuradas"**
Você esqueceu de criar o `.env.local` ou de preencher as chaves. Veja Passo 4.

**"E-mail não confirmado"**
Cheque sua caixa de spam. Em dev você pode desabilitar a confirmação em **Authentication → Providers → Email**.

**Página em branco após deploy**
Esqueceu de adicionar as variáveis de ambiente no Vercel. Vá em **Project Settings → Environment Variables**.

---

**TerraNexa** · 2025 · Gestão do campo
