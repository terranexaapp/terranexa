-- 007: Catalogo-mae TerraNexa para pragas, doencas, daninhas e deficiencias.
-- Modelo SaaS:
-- - catalogo_pragas guarda o conhecimento base do app, sem fazenda_id.
-- - catalogo_praga_culturas permite vincular uma praga a varias culturas.
-- - fazenda_pragas_config guarda apenas personalizacoes/ativacao por fazenda.
-- Nao inclui manejo_recomendado no catalogo-mae.

create table if not exists public.catalogo_culturas (
  id text primary key,
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalogo_pragas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome_comum text not null,
  nome_cientifico text,
  tipo text not null default 'praga',
  sintomas text,
  nivel_dano_economico text,
  foto_url text,
  foto_credito text,
  foto_fonte_url text,
  versao integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalogo_praga_culturas (
  catalogo_praga_id uuid not null references public.catalogo_pragas(id) on delete cascade,
  cultura_id text not null references public.catalogo_culturas(id) on delete restrict,
  primary key (catalogo_praga_id, cultura_id)
);

create table if not exists public.fazenda_pragas_config (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  catalogo_praga_id uuid not null references public.catalogo_pragas(id) on delete cascade,
  ativo boolean not null default true,
  insumo_sugerido_id uuid references public.insumos(id) on delete set null,
  foto_url_customizada text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fazenda_id, catalogo_praga_id)
);

alter table public.pragas_doencas
  add column if not exists catalogo_praga_id uuid references public.catalogo_pragas(id) on delete set null;

create index if not exists catalogo_pragas_tipo_idx on public.catalogo_pragas(tipo);
create index if not exists catalogo_pragas_ativo_idx on public.catalogo_pragas(ativo);
create index if not exists catalogo_praga_culturas_cultura_idx on public.catalogo_praga_culturas(cultura_id);
create index if not exists fazenda_pragas_config_fazenda_idx on public.fazenda_pragas_config(fazenda_id);
create index if not exists fazenda_pragas_config_catalogo_idx on public.fazenda_pragas_config(catalogo_praga_id);
create index if not exists pragas_doencas_catalogo_idx on public.pragas_doencas(catalogo_praga_id);

drop trigger if exists trg_catalogo_culturas_updated_at on public.catalogo_culturas;
create trigger trg_catalogo_culturas_updated_at
  before update on public.catalogo_culturas
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_catalogo_pragas_updated_at on public.catalogo_pragas;
create trigger trg_catalogo_pragas_updated_at
  before update on public.catalogo_pragas
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_fazenda_pragas_config_updated_at on public.fazenda_pragas_config;
create trigger trg_fazenda_pragas_config_updated_at
  before update on public.fazenda_pragas_config
  for each row execute function public.touch_updated_at();

alter table public.catalogo_culturas enable row level security;
alter table public.catalogo_pragas enable row level security;
alter table public.catalogo_praga_culturas enable row level security;
alter table public.fazenda_pragas_config enable row level security;

drop policy if exists catalogo_culturas_read on public.catalogo_culturas;
create policy catalogo_culturas_read on public.catalogo_culturas
  for select to authenticated
  using (true);

drop policy if exists catalogo_pragas_read on public.catalogo_pragas;
create policy catalogo_pragas_read on public.catalogo_pragas
  for select to authenticated
  using (true);

drop policy if exists catalogo_praga_culturas_read on public.catalogo_praga_culturas;
create policy catalogo_praga_culturas_read on public.catalogo_praga_culturas
  for select to authenticated
  using (true);

drop policy if exists fazenda_pragas_config_owner_all on public.fazenda_pragas_config;
create policy fazenda_pragas_config_owner_all on public.fazenda_pragas_config
  for all
  using (public.usuario_dono_fazenda(fazenda_id))
  with check (public.usuario_dono_fazenda(fazenda_id));

grant select on public.catalogo_culturas to authenticated;
grant select on public.catalogo_pragas to authenticated;
grant select on public.catalogo_praga_culturas to authenticated;
grant select, insert, update, delete on public.fazenda_pragas_config to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalogo-pragas', 'catalogo-pragas', true, 10485760, array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists catalogo_pragas_storage_read on storage.objects;
create policy catalogo_pragas_storage_read on storage.objects
for select
using (bucket_id = 'catalogo-pragas');

insert into public.catalogo_culturas (id, nome, ordem) values
  ('soja', 'Soja', 10),
  ('milho', 'Milho', 20),
  ('algodao', 'Algodao', 30),
  ('feijao', 'Feijao', 40),
  ('sorgo', 'Sorgo', 50),
  ('cana', 'Cana', 60),
  ('cafe', 'Cafe', 70)
on conflict (id) do update
set nome = excluded.nome,
    ordem = excluded.ordem,
    ativo = true,
    updated_at = now();

insert into public.catalogo_pragas
  (codigo, nome_comum, nome_cientifico, tipo, nivel_dano_economico) values
  ('LAG_SOJA', 'Lagarta-da-soja', 'Anticarsia gemmatalis', 'praga', '40 lagartas grandes / m2'),
  ('PERC_VERDE', 'Percevejo-verde', 'Nezara viridula', 'praga', '2 percevejos / m2'),
  ('PERC_MARROM', 'Percevejo-marrom', 'Euschistus heros', 'praga', '2 percevejos / m2'),
  ('MOSCA_BRANCA', 'Mosca-branca', 'Bemisia tabaci', 'praga', '5 adultos / folha'),
  ('FERR_ASIATICA', 'Ferrugem asiatica', 'Phakopsora pachyrhizi', 'doenca', 'Deteccao precoce'),
  ('MOFO_BRANCO', 'Mofo-branco', 'Sclerotinia sclerotiorum', 'doenca', 'Inicio de florescimento'),
  ('ANTRACNOSE', 'Antracnose', 'Colletotrichum spp.', 'doenca', '5% de plantas afetadas'),
  ('NEMATOIDE_CIST', 'Nematoide de cisto', 'Heterodera glycines', 'praga', 'Analise de solo positiva'),
  ('NEMATOIDE_GAL', 'Nematoide das galhas', 'Meloidogyne spp.', 'praga', 'Analise de solo positiva'),
  ('HELICOVERPA', 'Helicoverpa armigera', 'Helicoverpa armigera', 'praga', '2 lagartas / planta'),
  ('LAG_CARTUCHO', 'Lagarta-do-cartucho', 'Spodoptera frugiperda', 'praga', '20% de plantas atacadas'),
  ('PERC_BARRIGA', 'Percevejo-barriga-verde', 'Dichelops melacanthus', 'praga', '1 percevejo / m'),
  ('CIGARRINHA', 'Cigarrinha do milho', 'Dalbulus maidis', 'praga', 'Presenca em V2/V3'),
  ('FERR_MILHO', 'Ferrugem polissora', 'Puccinia polysora', 'doenca', 'Deteccao precoce'),
  ('BIPOLARIS_MILHO', 'Mancha de bipolaris', 'Bipolaris maydis', 'doenca', 'Folhas com lesoes alongadas e necroticas'),
  ('CERCOSPORIOSE_MILHO', 'Cercosporiose do milho', 'Cercospora zeae-maydis', 'doenca', 'Manchas retangulares em folhas'),
  ('MANCHA_BRANCA', 'Mancha-branca', 'Pantoea ananatis', 'doenca', 'Folha bandeira com sintomas'),
  ('ENF_MILHO', 'Enfezamento do milho', 'Maize bushy stunt phytoplasma / Spiroplasma kunkelii', 'doenca', 'Presenca confirmada'),
  ('BICUDO', 'Bicudo-do-algodoeiro', 'Anthonomus grandis', 'praga', '10% de botoes atacados'),
  ('CURUQUERE', 'Curuquere', 'Alabama argillacea', 'praga', '2 lagartas / planta'),
  ('RAMULOSE', 'Ramulose', 'Colletotrichum gossypii', 'doenca', '5% de plantas afetadas'),
  ('MANCHA_ALVO_ALGODAO', 'Mancha-alvo do algodao', 'Corynespora cassiicola', 'doenca', 'Lesoes foliares concentricas'),
  ('RAMULARIA_ALGODAO', 'Mancha-de-ramularia', 'Ramulariopsis spp.', 'doenca', 'Lesoes angulares em folhas'),
  ('MURCHA_VERT', 'Murcha de verticilium', 'Verticillium dahliae', 'doenca', 'Confirmacao por analise'),
  ('BICHO_MIN', 'Bicho-mineiro', 'Leucoptera coffeella', 'praga', '30% de folhas minadas'),
  ('BROCA_CAFE', 'Broca-do-cafe', 'Hypothenemus hampei', 'praga', '3% de frutos broqueados'),
  ('FERR_CAFE', 'Ferrugem do cafeeiro', 'Hemileia vastatrix', 'doenca', '5% de folhas afetadas'),
  ('CERCOSPORIOSE', 'Cercosporiose', 'Cercospora coffeicola', 'doenca', '5% de folhas afetadas'),
  ('BROCA_CANA', 'Broca-da-cana', 'Diatraea saccharalis', 'praga', 'Indice de infestacao > 3%'),
  ('CIGARRINHA_CANA', 'Cigarrinha-das-raizes', 'Mahanarva fimbriolata', 'praga', '8 ninfas / metro'),
  ('FERR_CANA', 'Ferrugem alaranjada', 'Puccinia kuehnii', 'doenca', '5% de folhas afetadas'),
  ('BUVA', 'Buva', 'Conyza spp.', 'daninha', '5 plantas / m2'),
  ('CAPIM_AMARGOSO', 'Capim-amargoso', 'Digitaria insularis', 'daninha', 'Antes do florescimento'),
  ('TRAPOERABA', 'Trapoeraba', 'Commelina benghalensis', 'daninha', '10 plantas / m2'),
  ('PICAO_PRETO', 'Picao-preto', 'Bidens pilosa', 'daninha', '10 plantas / m2'),
  ('CARURU', 'Caruru', 'Amaranthus spp.', 'daninha', '5 plantas / m2'),
  ('ALGODAO_TIGUERA', 'Algodao tiguera', 'Gossypium hirsutum', 'daninha', 'Planta voluntaria'),
  ('CAPIM_COLCHAO', 'Capim-colchao', 'Digitaria horizontalis', 'daninha', 'Antes do perfilhamento'),
  ('CARRAPICHO', 'Carrapicho', 'Cenchrus echinatus', 'daninha', 'Antes do florescimento'),
  ('ERVA_TOURO', 'Erva-de-touro', 'Tridax procumbens', 'daninha', 'Antes do florescimento'),
  ('LEITEIRO', 'Leiteiro', 'Euphorbia heterophylla', 'daninha', 'Controle em estadio inicial'),
  ('MILHO_TIGUERA', 'Milho tiguera', 'Zea mays', 'daninha', 'Planta voluntaria'),
  ('PE_GALINHA', 'Pe-de-galinha', 'Eleusine indica', 'daninha', 'Antes do perfilhamento'),
  ('SOJA_TIGUERA', 'Soja tiguera', 'Glycine max', 'daninha', 'Planta voluntaria'),
  ('TIRIRICA', 'Tiririca', 'Cyperus rotundus', 'daninha', 'Rebrotas e tuberculos'),
  ('VASSOURINHA_BOTAO', 'Vassourinha-de-botao', 'Spermacoce verticillata', 'daninha', 'Controle em estadio inicial'),
  ('ACARO_RAJADO', 'Acaro-rajado', 'Tetranychus urticae', 'praga', 'Monitorar colonias e sintomas'),
  ('FALSA_MEDIDEIRA', 'Falsa-medideira', 'Chrysodeixis includens', 'praga', 'Nivel conforme cultura e estadio'),
  ('LAG_ELASMO', 'Lagarta-elasmo', 'Elasmopalpus lignosellus', 'praga', 'Danos em plantulas'),
  ('PULGAO_MILHO', 'Pulgao-do-milho', 'Rhopalosiphum maidis', 'praga', 'Monitorar colonias em cartucho'),
  ('SPOD_ALBULA', 'Spodoptera albula', 'Spodoptera albula', 'praga', 'Nivel conforme cultura e estadio'),
  ('SPOD_COSMIOIDES', 'Spodoptera cosmioides', 'Spodoptera cosmioides', 'praga', 'Nivel conforme cultura e estadio'),
  ('SPOD_ERIDANIA', 'Spodoptera eridania', 'Spodoptera eridania', 'praga', 'Nivel conforme cultura e estadio'),
  ('NEMATOIDE_LESOES', 'Nematoide das lesoes', 'Pratylenchus brachyurus', 'praga', 'Analise de solo positiva'),
  ('CERCOSPORA_SOJA', 'Cercospora da soja', 'Cercospora kikuchii', 'doenca', 'Manchas foliares e sementes afetadas'),
  ('MANCHA_ALVO_SOJA', 'Mancha-alvo da soja', 'Corynespora cassiicola', 'doenca', 'Lesoes foliares concentricas'),
  ('MILDIO_SOJA', 'Mildio da soja', 'Peronospora manshurica', 'doenca', 'Manchas cloroticas na face superior'),
  ('OIDIO_SOJA', 'Oidio da soja', 'Erysiphe diffusa', 'doenca', 'Micelio branco pulverulento'),
  ('FITOFTORA_SOJA', 'Podridao de fitofthora', 'Phytophthora sojae', 'doenca', 'Murcha e podridao radicular'),
  ('RHIZOCTONIA_SOJA', 'Rhizoctoniose', 'Rhizoctonia solani', 'doenca', 'Tombamento e lesoes em raiz/colo'),
  ('DEF_N', 'Deficiencia de Nitrogenio', 'N', 'deficiencia', 'Folhas baixeiras amareladas'),
  ('DEF_P', 'Deficiencia de Fosforo', 'P', 'deficiencia', 'Folhas escurecidas / arroxeadas'),
  ('DEF_K', 'Deficiencia de Potassio', 'K', 'deficiencia', 'Bordas necrosadas'),
  ('DEF_CA', 'Deficiencia de Calcio', 'Ca', 'deficiencia', 'Folhas novas deformadas'),
  ('DEF_MG', 'Deficiencia de Magnesio', 'Mg', 'deficiencia', 'Clorose internerval'),
  ('DEF_S', 'Deficiencia de Enxofre', 'S', 'deficiencia', 'Folhas novas amareladas'),
  ('DEF_B', 'Deficiencia de Boro', 'B', 'deficiencia', 'Aborto de flores / falhas'),
  ('DEF_ZN', 'Deficiencia de Zinco', 'Zn', 'deficiencia', 'Folhas pequenas / clorose')
on conflict (codigo) do update
set nome_comum = excluded.nome_comum,
    nome_cientifico = excluded.nome_cientifico,
    tipo = excluded.tipo,
    nivel_dano_economico = excluded.nivel_dano_economico,
    ativo = true,
    updated_at = now();

with doencas(codigo, cultura_id) as (
  values
    ('FERR_ASIATICA', 'soja'),
    ('MOFO_BRANCO', 'soja'),
    ('ANTRACNOSE', 'soja'), ('ANTRACNOSE', 'algodao'),
    ('CERCOSPORA_SOJA', 'soja'),
    ('MANCHA_ALVO_SOJA', 'soja'),
    ('MILDIO_SOJA', 'soja'),
    ('OIDIO_SOJA', 'soja'),
    ('FITOFTORA_SOJA', 'soja'),
    ('RHIZOCTONIA_SOJA', 'soja'),
    ('FERR_MILHO', 'milho'),
    ('BIPOLARIS_MILHO', 'milho'),
    ('CERCOSPORIOSE_MILHO', 'milho'),
    ('MANCHA_BRANCA', 'milho'),
    ('ENF_MILHO', 'milho'),
    ('RAMULOSE', 'algodao'),
    ('MANCHA_ALVO_ALGODAO', 'algodao'),
    ('RAMULARIA_ALGODAO', 'algodao'),
    ('MURCHA_VERT', 'algodao'),
    ('FERR_CAFE', 'cafe'),
    ('CERCOSPORIOSE', 'cafe'),
    ('FERR_CANA', 'cana')
),
todas_culturas as (
  select codigo, c.id as cultura_id
  from public.catalogo_pragas p
  cross join public.catalogo_culturas c
  where p.tipo <> 'doenca'
),
todos as (
  select * from doencas
  union
  select * from todas_culturas
)
insert into public.catalogo_praga_culturas (catalogo_praga_id, cultura_id)
select p.id, t.cultura_id
from todos t
join public.catalogo_pragas p on p.codigo = t.codigo
on conflict do nothing;

with doencas(codigo, cultura_id) as (
  values
    ('FERR_ASIATICA', 'soja'),
    ('MOFO_BRANCO', 'soja'),
    ('ANTRACNOSE', 'soja'), ('ANTRACNOSE', 'algodao'),
    ('CERCOSPORA_SOJA', 'soja'),
    ('MANCHA_ALVO_SOJA', 'soja'),
    ('MILDIO_SOJA', 'soja'),
    ('OIDIO_SOJA', 'soja'),
    ('FITOFTORA_SOJA', 'soja'),
    ('RHIZOCTONIA_SOJA', 'soja'),
    ('FERR_MILHO', 'milho'),
    ('BIPOLARIS_MILHO', 'milho'),
    ('CERCOSPORIOSE_MILHO', 'milho'),
    ('MANCHA_BRANCA', 'milho'),
    ('ENF_MILHO', 'milho'),
    ('RAMULOSE', 'algodao'),
    ('MANCHA_ALVO_ALGODAO', 'algodao'),
    ('RAMULARIA_ALGODAO', 'algodao'),
    ('MURCHA_VERT', 'algodao'),
    ('FERR_CAFE', 'cafe'),
    ('CERCOSPORIOSE', 'cafe'),
    ('FERR_CANA', 'cana')
)
delete from public.catalogo_praga_culturas cpc
using public.catalogo_pragas cp
where cp.id = cpc.catalogo_praga_id
  and cp.tipo = 'doenca'
  and not exists (
    select 1
    from doencas d
    where d.codigo = cp.codigo
      and d.cultura_id = cpc.cultura_id
  );

update public.pragas_doencas pd
set catalogo_praga_id = cp.id,
    updated_at = now()
from public.catalogo_pragas cp
where pd.catalogo_praga_id is null
  and pd.codigo = cp.codigo;

create or replace function public.sincronizar_pragas_doencas_catalogo(p_fazenda_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.pragas_doencas (
    fazenda_id,
    catalogo_praga_id,
    codigo,
    nome_comum,
    nome_cientifico,
    tipo,
    cultura_alvo,
    sintomas,
    nivel_dano_economico,
    foto_url,
    ativo
  )
  select
    p_fazenda_id,
    cp.id,
    cp.codigo,
    cp.nome_comum,
    cp.nome_cientifico,
    cp.tipo,
    case when cp.tipo = 'doenca'
      then coalesce(string_agg(cpc.cultura_id, ',' order by cpc.cultura_id), 'multi')
      else 'multi'
    end as cultura_alvo,
    cp.sintomas,
    cp.nivel_dano_economico,
    cp.foto_url,
    true
  from public.catalogo_pragas cp
  left join public.catalogo_praga_culturas cpc on cpc.catalogo_praga_id = cp.id
  where cp.ativo = true
  group by cp.id
  on conflict (fazenda_id, codigo) do update
  set catalogo_praga_id = excluded.catalogo_praga_id,
      nome_comum = excluded.nome_comum,
      nome_cientifico = excluded.nome_cientifico,
      tipo = excluded.tipo,
      cultura_alvo = excluded.cultura_alvo,
      sintomas = coalesce(public.pragas_doencas.sintomas, excluded.sintomas),
      nivel_dano_economico = coalesce(public.pragas_doencas.nivel_dano_economico, excluded.nivel_dano_economico),
      foto_url = coalesce(public.pragas_doencas.foto_url, excluded.foto_url),
      updated_at = now();
end;
$$;

create or replace function public.popular_fazenda_pragas_config(p_fazenda_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.fazenda_pragas_config (fazenda_id, catalogo_praga_id)
  select p_fazenda_id, cp.id
  from public.catalogo_pragas cp
  where cp.ativo = true
  on conflict (fazenda_id, catalogo_praga_id) do nothing;
end;
$$;

create or replace function public.trg_fn_fazenda_pragas_config_seed()
returns trigger
language plpgsql
as $$
begin
  perform public.popular_fazenda_pragas_config(new.id);
  perform public.sincronizar_pragas_doencas_catalogo(new.id);
  return new;
end;
$$;

create or replace function public.trg_fn_pragas_doencas_seed()
returns trigger
language plpgsql
as $$
begin
  perform public.popular_pragas_doencas_padrao(new.id);
  perform public.sincronizar_pragas_doencas_catalogo(new.id);
  return new;
end;
$$;

drop trigger if exists trg_fazenda_pragas_config_seed on public.fazendas;
create trigger trg_fazenda_pragas_config_seed
  after insert on public.fazendas
  for each row execute function public.trg_fn_fazenda_pragas_config_seed();

do $$
declare
  f record;
begin
  for f in select id from public.fazendas loop
    perform public.popular_fazenda_pragas_config(f.id);
    perform public.sincronizar_pragas_doencas_catalogo(f.id);
  end loop;
end;
$$;

comment on table public.catalogo_pragas is
  'Catalogo-mae TerraNexa de pragas, doencas, daninhas e deficiencias. Nao possui manejo_recomendado.';
comment on table public.catalogo_praga_culturas is
  'Relacionamento N:N entre catalogo-mae e culturas. Uma praga pode pertencer a varias culturas.';
comment on table public.fazenda_pragas_config is
  'Configuracao por fazenda para ativar/desativar itens do catalogo-mae e sobrescrever foto/insumo quando necessario.';
comment on function public.sincronizar_pragas_doencas_catalogo(uuid) is
  'Sincroniza o catalogo-mae para a tabela por fazenda usada pelo registro de monitoramento.';
