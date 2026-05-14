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
