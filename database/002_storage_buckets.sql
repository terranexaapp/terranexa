insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('mapas', 'mapas', false, 52428800, array[
    'application/vnd.google-earth.kml+xml',
    'application/xml',
    'text/xml',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]),
  ('monitoramentos', 'monitoramentos', false, 52428800, array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/octet-stream'
  ]),
  ('relatorios', 'relatorios', false, 104857600, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ]),
  ('receituarios', 'receituarios', false, 52428800, array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/octet-stream'
  ])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists terranexa_storage_select on storage.objects;
create policy terranexa_storage_select on storage.objects
for select
using (
  bucket_id in ('mapas', 'monitoramentos', 'relatorios', 'receituarios')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists terranexa_storage_insert on storage.objects;
create policy terranexa_storage_insert on storage.objects
for insert
with check (
  bucket_id in ('mapas', 'monitoramentos', 'relatorios', 'receituarios')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists terranexa_storage_update on storage.objects;
create policy terranexa_storage_update on storage.objects
for update
using (
  bucket_id in ('mapas', 'monitoramentos', 'relatorios', 'receituarios')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('mapas', 'monitoramentos', 'relatorios', 'receituarios')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists terranexa_storage_delete on storage.objects;
create policy terranexa_storage_delete on storage.objects
for delete
using (
  bucket_id in ('mapas', 'monitoramentos', 'relatorios', 'receituarios')
  and auth.uid()::text = (storage.foldername(name))[1]
);
