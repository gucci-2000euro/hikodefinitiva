-- ══════════════════════════════════════════════════════════════════════
-- HIKO — Tabella routes (percorsi di corsa)
-- ══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS routes CASCADE;

CREATE TABLE routes (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text          NOT NULL,
  distanza_km  numeric(5,2)  NOT NULL,
  elevazione   integer       NOT NULL DEFAULT 0,
  difficolta   text          NOT NULL CHECK (difficolta IN ('easy', 'medium', 'hard')),
  terreno      text          NOT NULL CHECK (terreno IN ('asphalt', 'trail', 'mixed')),
  best_time    text          NOT NULL DEFAULT '',
  centro       jsonb         NOT NULL,       -- [lat, lng]
  waypoints    jsonb         NOT NULL,       -- [[lat, lng], ...]
  created_at   timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes_public_read" ON routes FOR SELECT USING (true);

-- ─── Primo percorso: Parco Sempione — Giro del Parco ─────────────────
-- Loop pedonale sul perimetro interno del parco, asfalto+ghiaia, pianeggiante.
INSERT INTO routes (id, nome, distanza_km, elevazione, difficolta, terreno, best_time, centro, waypoints)
VALUES (
  'a1b2c3d4-0001-0000-0000-000000000001',
  'Parco Sempione — Giro del Parco',
  2.85,
  10,
  'easy',
  'mixed',
  '17:05',
  '[45.4724, 9.1737]',
  '[[45.47417,9.16842],[45.47350,9.16800],[45.47260,9.16798],[45.47170,9.16818],[45.47080,9.16865],[45.47010,9.16940],[45.46965,9.17070],[45.46948,9.17230],[45.46950,9.17420],[45.46970,9.17590],[45.47010,9.17740],[45.47060,9.17875],[45.47130,9.17945],[45.47230,9.17975],[45.47340,9.17955],[45.47440,9.17870],[45.47505,9.17700],[45.47535,9.17490],[45.47520,9.17270],[45.47480,9.17070],[45.47417,9.16842]]'
);
