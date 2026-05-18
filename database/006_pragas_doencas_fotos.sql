-- 006: Fotos de referencia no catalogo de pragas/doencas.
-- Idempotente: pode rodar em ambientes que ja receberam a coluna.

alter table public.pragas_doencas
  add column if not exists foto_url text;

comment on column public.pragas_doencas.foto_url is
  'URL publica da foto de referencia usada nos cards de monitoramento de ocorrencia.';
