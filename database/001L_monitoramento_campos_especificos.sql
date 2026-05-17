-- 001L: Campos especificos para pontos de monitoramento e caminhamento GPS
-- Status: APLICADO em 2026-05-17 via Supabase Management API

-- Pontos: dados especificos + agrupamento de varias ocorrencias no mesmo ponto GPS
ALTER TABLE monitoramento_pontos
  ADD COLUMN IF NOT EXISTS tipo_registro text NOT NULL DEFAULT 'ocorrencia',
  ADD COLUMN IF NOT EXISTS dados_especificos jsonb,
  ADD COLUMN IF NOT EXISTS ponto_grupo_id uuid;

CREATE INDEX IF NOT EXISTS idx_monitoramento_pontos_grupo
  ON monitoramento_pontos(ponto_grupo_id);

-- Trilha GPS do caminhamento durante o monitoramento
CREATE TABLE IF NOT EXISTS monitoramento_caminhamentos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoramento_id uuid NOT NULL REFERENCES monitoramentos(id) ON DELETE CASCADE,
  trilha           jsonb NOT NULL DEFAULT '[]',  -- [{lat, lng, ts}]
  iniciado_em      timestamptz NOT NULL DEFAULT now(),
  finalizado_em    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE monitoramento_caminhamentos ENABLE ROW LEVEL SECURITY;

-- RLS reusa helper existente usuario_dono_talhao(uuid) (mesmo padrao das outras tabelas de monitoramento)
CREATE POLICY caminhamento_all ON monitoramento_caminhamentos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM monitoramentos m
      WHERE m.id = monitoramento_caminhamentos.monitoramento_id
        AND usuario_dono_talhao(m.talhao_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monitoramentos m
      WHERE m.id = monitoramento_caminhamentos.monitoramento_id
        AND usuario_dono_talhao(m.talhao_id)
    )
  );
