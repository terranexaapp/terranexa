alter table public.profiles enable row level security;
alter table public.fazendas enable row level security;
alter table public.safras enable row level security;
alter table public.talhoes enable row level security;
alter table public.equipes enable row level security;
alter table public.insumos enable row level security;
alter table public.estoque enable row level security;
alter table public.operacoes enable row level security;
alter table public.operacao_insumos enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.os_talhoes enable row level security;
alter table public.os_insumos enable row level security;
alter table public.pluviometros enable row level security;
alter table public.chuva_registros enable row level security;
alter table public.amostras_solo enable row level security;
alter table public.monitoramentos enable row level security;
alter table public.monitoramento_pontos enable row level security;
alter table public.monitoramento_caminhamentos enable row level security;
alter table public.armadilhas enable row level security;
alter table public.relatorios enable row level security;

drop policy if exists profiles_own_all on public.profiles;
create policy profiles_own_all on public.profiles
for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists fazendas_owner_all on public.fazendas;
create policy fazendas_owner_all on public.fazendas
for all using (proprietario_id = auth.uid()) with check (proprietario_id = auth.uid());

drop policy if exists safras_owner_all on public.safras;
create policy safras_owner_all on public.safras
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists talhoes_owner_all on public.talhoes;
create policy talhoes_owner_all on public.talhoes
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists equipes_owner_all on public.equipes;
create policy equipes_owner_all on public.equipes
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists insumos_owner_all on public.insumos;
create policy insumos_owner_all on public.insumos
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists estoque_owner_all on public.estoque;
create policy estoque_owner_all on public.estoque
for all using (public.usuario_dono_insumo(insumo_id)) with check (public.usuario_dono_insumo(insumo_id));

drop policy if exists operacoes_owner_all on public.operacoes;
create policy operacoes_owner_all on public.operacoes
for all using (public.usuario_dono_talhao(talhao_id)) with check (public.usuario_dono_talhao(talhao_id));

drop policy if exists operacao_insumos_owner_all on public.operacao_insumos;
create policy operacao_insumos_owner_all on public.operacao_insumos
for all using (public.usuario_dono_operacao(operacao_id)) with check (public.usuario_dono_operacao(operacao_id));

drop policy if exists ordens_servico_owner_all on public.ordens_servico;
create policy ordens_servico_owner_all on public.ordens_servico
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists os_talhoes_owner_all on public.os_talhoes;
create policy os_talhoes_owner_all on public.os_talhoes
for all using (public.usuario_dono_os(os_id)) with check (public.usuario_dono_os(os_id) and public.usuario_dono_talhao(talhao_id));

drop policy if exists os_insumos_owner_all on public.os_insumos;
create policy os_insumos_owner_all on public.os_insumos
for all using (public.usuario_dono_os(os_id)) with check (public.usuario_dono_os(os_id));

drop policy if exists pluviometros_owner_all on public.pluviometros;
create policy pluviometros_owner_all on public.pluviometros
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));

drop policy if exists chuva_registros_owner_all on public.chuva_registros;
create policy chuva_registros_owner_all on public.chuva_registros
for all using (
  exists (
    select 1 from public.pluviometros p
    where p.id = pluviometro_id and public.usuario_dono_fazenda(p.fazenda_id)
  )
) with check (
  exists (
    select 1 from public.pluviometros p
    where p.id = pluviometro_id and public.usuario_dono_fazenda(p.fazenda_id)
  )
);

drop policy if exists amostras_solo_owner_all on public.amostras_solo;
create policy amostras_solo_owner_all on public.amostras_solo
for all using (public.usuario_dono_talhao(talhao_id)) with check (public.usuario_dono_talhao(talhao_id));

drop policy if exists monitoramentos_owner_all on public.monitoramentos;
create policy monitoramentos_owner_all on public.monitoramentos
for all using (public.usuario_dono_talhao(talhao_id)) with check (public.usuario_dono_talhao(talhao_id));

drop policy if exists monitoramento_pontos_owner_all on public.monitoramento_pontos;
create policy monitoramento_pontos_owner_all on public.monitoramento_pontos
for all using (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
) with check (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
);

drop policy if exists monitoramento_caminhamentos_owner_all on public.monitoramento_caminhamentos;
create policy monitoramento_caminhamentos_owner_all on public.monitoramento_caminhamentos
for all using (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
) with check (
  exists (
    select 1 from public.monitoramentos m
    where m.id = monitoramento_id and public.usuario_dono_talhao(m.talhao_id)
  )
);

drop policy if exists armadilhas_owner_all on public.armadilhas;
create policy armadilhas_owner_all on public.armadilhas
for all using (talhao_id is null or public.usuario_dono_talhao(talhao_id))
with check (talhao_id is null or public.usuario_dono_talhao(talhao_id));

drop policy if exists relatorios_owner_all on public.relatorios;
create policy relatorios_owner_all on public.relatorios
for all using (public.usuario_dono_fazenda(fazenda_id)) with check (public.usuario_dono_fazenda(fazenda_id));
