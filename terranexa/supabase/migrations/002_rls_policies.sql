-- ════════════════════════════════════════════════════════════════
-- TERRANEXA · ROW LEVEL SECURITY
-- Migration: 002_rls_policies
-- ════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.fazendas enable row level security;
alter table public.talhoes enable row level security;
alter table public.safras enable row level security;
alter table public.insumos enable row level security;
alter table public.estoque enable row level security;
alter table public.operacoes enable row level security;
alter table public.operacao_insumos enable row level security;
alter table public.produtividades enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.alertas enable row level security;

-- PROFILES
create policy "Ver próprio perfil" on public.profiles for select using (auth.uid() = id);
create policy "Atualizar próprio perfil" on public.profiles for update using (auth.uid() = id);

-- FAZENDAS
create policy "Ver suas fazendas" on public.fazendas for select using (proprietario_id = auth.uid());
create policy "Criar fazendas" on public.fazendas for insert with check (proprietario_id = auth.uid());
create policy "Atualizar suas fazendas" on public.fazendas for update using (proprietario_id = auth.uid());
create policy "Deletar suas fazendas" on public.fazendas for delete using (proprietario_id = auth.uid());

-- TALHÕES
create policy "Acesso talhões" on public.talhoes for all
  using (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()))
  with check (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()));

-- SAFRAS
create policy "Acesso safras" on public.safras for all
  using (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()))
  with check (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()));

-- INSUMOS
create policy "Acesso insumos" on public.insumos for all
  using (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()))
  with check (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()));

-- ESTOQUE
create policy "Acesso estoque" on public.estoque for all
  using (
    insumo_id in (
      select i.id from public.insumos i
      join public.fazendas f on f.id = i.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  )
  with check (
    insumo_id in (
      select i.id from public.insumos i
      join public.fazendas f on f.id = i.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  );

-- OPERAÇÕES
create policy "Acesso operações" on public.operacoes for all
  using (
    talhao_id in (
      select t.id from public.talhoes t
      join public.fazendas f on f.id = t.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  )
  with check (
    talhao_id in (
      select t.id from public.talhoes t
      join public.fazendas f on f.id = t.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  );

-- OPERAÇÃO_INSUMOS
create policy "Acesso op_insumos" on public.operacao_insumos for all
  using (
    operacao_id in (
      select o.id from public.operacoes o
      join public.talhoes t on t.id = o.talhao_id
      join public.fazendas f on f.id = t.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  )
  with check (
    operacao_id in (
      select o.id from public.operacoes o
      join public.talhoes t on t.id = o.talhao_id
      join public.fazendas f on f.id = t.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  );

-- PRODUTIVIDADES
create policy "Acesso produtividades" on public.produtividades for all
  using (
    talhao_id in (
      select t.id from public.talhoes t
      join public.fazendas f on f.id = t.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  )
  with check (
    talhao_id in (
      select t.id from public.talhoes t
      join public.fazendas f on f.id = t.fazenda_id
      where f.proprietario_id = auth.uid()
    )
  );

-- OS
create policy "Acesso OS" on public.ordens_servico for all
  using (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()))
  with check (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()));

-- ALERTAS
create policy "Acesso alertas" on public.alertas for all
  using (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()))
  with check (fazenda_id in (select id from public.fazendas where proprietario_id = auth.uid()));
