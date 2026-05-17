-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · CATÁLOGO DE PRAGAS, DOENÇAS E DEFICIÊNCIAS
-- Arquivo: 001K_pragas_doencas.sql
-- ────────────────────────────────────────────────────────────────
-- Catálogo (por fazenda) de pragas, doenças, plantas daninhas e
-- deficiências usado pelo monitoramento de campo. Pré-populado com
-- 40+ itens comuns no Brasil (soja, milho, algodão, café, cana).
--
-- Cada fazenda nova recebe o seed automaticamente via trigger.
-- Fazendas pré-existentes recebem via backfill no fim do arquivo.
--
-- Também adiciona colunas em monitoramento_pontos pra registrar
-- praga_doenca_id, estadio_fenologico, severidade, percentual_dano,
-- recomendacao e foto_url (todas opcionais — backward compat).
--
-- Rodar APÓS 001A..001J.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Tabela catálogo ──────────────────────────────────────────
create table if not exists public.pragas_doencas (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  codigo text not null,                  -- 'LAG_SOJA', 'FERR_ASIATICA', etc.
  nome_comum text not null,
  nome_cientifico text,
  tipo text not null default 'praga',    -- praga, doenca, daninha, deficiencia, outro
  cultura_alvo text,                     -- soja, milho, algodao, cafe, cana, multi
  sintomas text,
  nivel_dano_economico text,             -- texto livre — pode ser "20 lagartas/m" ou "15% folhas"
  manejo_recomendado text,
  insumo_sugerido_id uuid references public.insumos(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fazenda_id, codigo)
);

create index if not exists pragas_doencas_fazenda_idx on public.pragas_doencas(fazenda_id);
create index if not exists pragas_doencas_fazenda_ativo_idx on public.pragas_doencas(fazenda_id, ativo);
create index if not exists pragas_doencas_cultura_idx on public.pragas_doencas(cultura_alvo);

drop trigger if exists trg_pragas_doencas_updated_at on public.pragas_doencas;
create trigger trg_pragas_doencas_updated_at
  before update on public.pragas_doencas
  for each row execute function public.touch_updated_at();

alter table public.pragas_doencas enable row level security;

drop policy if exists pragas_doencas_owner_all on public.pragas_doencas;
create policy pragas_doencas_owner_all on public.pragas_doencas
  for all
  using (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

comment on table public.pragas_doencas is
  'Catálogo de pragas, doenças e deficiências por fazenda. Usado no registro de pontos de monitoramento.';

-- ── 2. Função de seed ───────────────────────────────────────────
create or replace function public.popular_pragas_doencas_padrao(p_fazenda_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.pragas_doencas (fazenda_id, codigo, nome_comum, nome_cientifico, tipo, cultura_alvo, nivel_dano_economico) values
    -- Soja (10)
    (p_fazenda_id, 'LAG_SOJA',       'Lagarta-da-soja',           'Anticarsia gemmatalis',    'praga',    'soja',     '40 lagartas grandes / m²'),
    (p_fazenda_id, 'PERC_VERDE',     'Percevejo-verde',           'Nezara viridula',          'praga',    'soja',     '2 percevejos / m²'),
    (p_fazenda_id, 'PERC_MARROM',    'Percevejo-marrom',          'Euschistus heros',         'praga',    'soja',     '2 percevejos / m²'),
    (p_fazenda_id, 'MOSCA_BRANCA',   'Mosca-branca',              'Bemisia tabaci',           'praga',    'multi',    '5 adultos / folha'),
    (p_fazenda_id, 'FERR_ASIATICA',  'Ferrugem asiática',         'Phakopsora pachyrhizi',    'doenca',   'soja',     'Detecção precoce — controle imediato'),
    (p_fazenda_id, 'MOFO_BRANCO',    'Mofo-branco',               'Sclerotinia sclerotiorum', 'doenca',   'soja',     'Início de florescimento'),
    (p_fazenda_id, 'ANTRACNOSE',     'Antracnose',                'Colletotrichum spp.',      'doenca',   'multi',    '5% de plantas afetadas'),
    (p_fazenda_id, 'NEMATOIDE_CIST', 'Nematóide de cisto',        'Heterodera glycines',      'praga',    'soja',     'Análise de solo positiva'),
    (p_fazenda_id, 'NEMATOIDE_GAL',  'Nematóide das galhas',      'Meloidogyne spp.',         'praga',    'multi',    'Análise de solo positiva'),
    (p_fazenda_id, 'TROVAO',         'Helicoverpa armigera',      'Helicoverpa armigera',     'praga',    'multi',    '2 lagartas / planta'),
    -- Milho (6)
    (p_fazenda_id, 'LAG_CARTUCHO',   'Lagarta-do-cartucho',       'Spodoptera frugiperda',    'praga',    'milho',    '20% de plantas atacadas'),
    (p_fazenda_id, 'PERC_BARRIGA',   'Percevejo-barriga-verde',   'Dichelops melacanthus',    'praga',    'milho',    '1 percevejo / m'),
    (p_fazenda_id, 'CIGARRINHA',     'Cigarrinha do milho',       'Dalbulus maidis',          'praga',    'milho',    'Presença em V2/V3'),
    (p_fazenda_id, 'FERR_MILHO',     'Ferrugem polissora',        'Puccinia polysora',        'doenca',   'milho',    'Detecção precoce'),
    (p_fazenda_id, 'MANCHA_BRANCA',  'Mancha-branca',             'Pantoea ananatis',         'doenca',   'milho',    'Folha bandeira com sintomas'),
    (p_fazenda_id, 'ENF_MILHO',      'Enfezamento do milho',      'Phytoplasma',              'doenca',   'milho',    'Presença confirmada'),
    -- Algodão (4)
    (p_fazenda_id, 'BICUDO',         'Bicudo-do-algodoeiro',      'Anthonomus grandis',       'praga',    'algodao',  '10% de botões atacados'),
    (p_fazenda_id, 'CURUQUERE',      'Curuquerê',                 'Alabama argillacea',       'praga',    'algodao',  '2 lagartas / planta'),
    (p_fazenda_id, 'RAMULOSE',       'Ramulose',                  'Colletotrichum gossypii',  'doenca',   'algodao',  '5% de plantas afetadas'),
    (p_fazenda_id, 'MURCHA_VERT',    'Murcha de verticilium',     'Verticillium dahliae',     'doenca',   'algodao',  'Confirmação por análise'),
    -- Café (4)
    (p_fazenda_id, 'BICHO_MIN',      'Bicho-mineiro',             'Leucoptera coffeella',     'praga',    'cafe',     '30% de folhas minadas'),
    (p_fazenda_id, 'BROCA_CAFE',     'Broca-do-café',             'Hypothenemus hampei',      'praga',    'cafe',     '3% de frutos broqueados'),
    (p_fazenda_id, 'FERR_CAFE',      'Ferrugem do cafeeiro',      'Hemileia vastatrix',       'doenca',   'cafe',     '5% de folhas afetadas'),
    (p_fazenda_id, 'CERCOSPORIOSE',  'Cercosporiose',             'Cercospora coffeicola',    'doenca',   'cafe',     '5% de folhas afetadas'),
    -- Cana (3)
    (p_fazenda_id, 'BROCA_CANA',     'Broca-da-cana',             'Diatraea saccharalis',     'praga',    'cana',     'Índice de infestação > 3%'),
    (p_fazenda_id, 'CIGARRINHA_CANA','Cigarrinha-das-raízes',     'Mahanarva fimbriolata',    'praga',    'cana',     '8 ninfas / metro'),
    (p_fazenda_id, 'FERR_CANA',      'Ferrugem alaranjada',       'Puccinia kuehnii',         'doenca',   'cana',     '5% de folhas afetadas'),
    -- Plantas daninhas (5)
    (p_fazenda_id, 'BUVA',           'Buva',                      'Conyza spp.',              'daninha',  'multi',    '5 plantas / m²'),
    (p_fazenda_id, 'CAPIM_AMARGOSO', 'Capim-amargoso',            'Digitaria insularis',      'daninha',  'multi',    'Antes do florescimento'),
    (p_fazenda_id, 'TRAPOERABA',     'Trapoeraba',                'Commelina benghalensis',   'daninha',  'multi',    '10 plantas / m²'),
    (p_fazenda_id, 'PICAO_PRETO',    'Picão-preto',               'Bidens pilosa',            'daninha',  'multi',    '10 plantas / m²'),
    (p_fazenda_id, 'CARURU',         'Caruru',                    'Amaranthus spp.',          'daninha',  'multi',    '5 plantas / m²'),
    -- Deficiências nutricionais (8)
    (p_fazenda_id, 'DEF_N',          'Deficiência de Nitrogênio', 'N',                        'deficiencia','multi',  'Folhas baixeiras amareladas'),
    (p_fazenda_id, 'DEF_P',          'Deficiência de Fósforo',    'P',                        'deficiencia','multi',  'Folhas escurecidas / arroxeadas'),
    (p_fazenda_id, 'DEF_K',          'Deficiência de Potássio',   'K',                        'deficiencia','multi',  'Bordas necrosadas'),
    (p_fazenda_id, 'DEF_CA',         'Deficiência de Cálcio',     'Ca',                       'deficiencia','multi',  'Folhas novas deformadas'),
    (p_fazenda_id, 'DEF_MG',         'Deficiência de Magnésio',   'Mg',                       'deficiencia','multi',  'Clorose internerval'),
    (p_fazenda_id, 'DEF_S',          'Deficiência de Enxofre',    'S',                        'deficiencia','multi',  'Folhas novas amareladas'),
    (p_fazenda_id, 'DEF_B',          'Deficiência de Boro',       'B',                        'deficiencia','multi',  'Aborto de flores / falhas'),
    (p_fazenda_id, 'DEF_ZN',         'Deficiência de Zinco',      'Zn',                       'deficiencia','multi',  'Folhas pequenas / clorose')
  on conflict (fazenda_id, codigo) do nothing;
end;
$$;

-- ── 3. Trigger AFTER INSERT em fazendas ─────────────────────────
create or replace function public.trg_fn_pragas_doencas_seed()
returns trigger
language plpgsql
as $$
begin
  perform public.popular_pragas_doencas_padrao(new.id);
  return new;
end;
$$;

drop trigger if exists trg_pragas_doencas_seed on public.fazendas;
create trigger trg_pragas_doencas_seed
  after insert on public.fazendas
  for each row execute function public.trg_fn_pragas_doencas_seed();

-- ── 4. Backfill em fazendas pré-existentes ──────────────────────
do $$
declare
  f record;
begin
  for f in
    select id from public.fazendas
    where id not in (select distinct fazenda_id from public.pragas_doencas)
  loop
    perform public.popular_pragas_doencas_padrao(f.id);
  end loop;
end;
$$;

-- ── 5. Expandir monitoramento_pontos ────────────────────────────
alter table public.monitoramento_pontos
  add column if not exists praga_doenca_id uuid references public.pragas_doencas(id) on delete set null,
  add column if not exists estadio_fenologico text,
  add column if not exists severidade text,                        -- 'leve', 'moderada', 'severa', 'nde'
  add column if not exists percentual_dano numeric(5, 2),          -- 0-100
  add column if not exists recomendacao text,
  add column if not exists foto_url text;                          -- URL do bucket Storage

create index if not exists monitoramento_pontos_praga_idx on public.monitoramento_pontos(praga_doenca_id);
create index if not exists monitoramento_pontos_severidade_idx on public.monitoramento_pontos(severidade);

comment on column public.monitoramento_pontos.severidade is
  'Escala: leve / moderada / severa / nde (Nível de Dano Econômico atingido).';
comment on column public.monitoramento_pontos.percentual_dano is
  'Percentual de infestação ou dano (0-100). Opcional; pode coexistir com severidade.';
comment on column public.monitoramento_pontos.foto_url is
  'URL pública (ou signed) de foto no bucket Storage. Bucket recomendado: monitoramento ou mapas.';
