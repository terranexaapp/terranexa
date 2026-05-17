-- 001L: Campos especificos para pontos de monitoramento e caminhamento GPS
-- Adiciona dados_especificos (contagens por praga) e tipo_registro ao monitoramento_pontos.
-- Cria tabela monitoramento_caminhamentos para trilha GPS do tecnico.

-- Pontos: dados especificos de cada tipo de ocorrencia
ALTER TABLE monitoramento_pontos
  ADD COLUMN IF NOT EXISTS tipo_registro text NOT NULL DEFAULT 'ocorrencia',
  ADD COLUMN IF NOT EXISTS dados_especificos jsonb;

-- Trilha GPS do caminhamento do tecnico durante o monitoramento
CREATE TABLE IF NOT EXISTS monitoramento_caminhamentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoramento_id uuid NOT NULL REFERENCES monitoramentos(id) ON DELETE CASCADE,
  trilha         jsonb NOT NULL DEFAULT '[]',  -- [{lat, lng, ts}]
  iniciado_em    timestamptz NOT NULL DEFAULT now(),
  finalizado_em  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE monitoramento_caminhamentos ENABLE ROW LEVEL SECURITY;

-- RLS: acesso atraves do monitoramento → talhao → fazenda → membro
CREATE POLICY "caminhamento_select" ON monitoramento_caminhamentos
  FOR SELECT USING (
    monitoramento_id IN (
      SELECT m.id FROM monitoramentos m
      JOIN talhoes t ON t.id = m.talhao_id
      JOIN fazendas f ON f.id = t.fazenda_id
      WHERE f.owner_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM fazenda_membros fm
           WHERE fm.fazenda_id = f.id AND fm.user_id = auth.uid()
         )
    )
  );

CREATE POLICY "caminhamento_insert" ON monitoramento_caminhamentos
  FOR INSERT WITH CHECK (
    monitoramento_id IN (
      SELECT m.id FROM monitoramentos m
      JOIN talhoes t ON t.id = m.talhao_id
      JOIN fazendas f ON f.id = t.fazenda_id
      WHERE f.owner_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM fazenda_membros fm
           WHERE fm.fazenda_id = f.id AND fm.user_id = auth.uid()
         )
    )
  );

CREATE POLICY "caminhamento_update" ON monitoramento_caminhamentos
  FOR UPDATE USING (
    monitoramento_id IN (
      SELECT m.id FROM monitoramentos m
      JOIN talhoes t ON t.id = m.talhao_id
      JOIN fazendas f ON f.id = t.fazenda_id
      WHERE f.owner_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM fazenda_membros fm
           WHERE fm.fazenda_id = f.id AND fm.user_id = auth.uid()
         )
    )
  );
