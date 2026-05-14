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
