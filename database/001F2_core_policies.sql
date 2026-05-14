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
