-- ══════════════════════════════════════════════════════════════════════
-- HIKO — Tabella runs + fix leaderboard_weekly + trigger stats profilo
-- ══════════════════════════════════════════════════════════════════════

-- ─── 1. Tabella runs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runs (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_id     uuid,
  distanza_km  numeric(6,3)  NOT NULL DEFAULT 0,
  durata_sec   integer       NOT NULL DEFAULT 0,
  pace_medio   integer       NOT NULL DEFAULT 0, -- secondi/km
  waypoints    jsonb,
  completata   boolean       NOT NULL DEFAULT true,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runs_select" ON runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "runs_insert" ON runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs_delete" ON runs FOR DELETE USING (auth.uid() = user_id);

-- ─── 2. Trigger: aggiorna km_totali e corse_totali sul profilo ─────────
CREATE OR REPLACE FUNCTION update_profile_after_run()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles
  SET
    km_totali    = km_totali    + NEW.distanza_km,
    corse_totali = corse_totali + 1,
    updated_at   = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_after_run ON runs;
CREATE TRIGGER trg_update_profile_after_run
  AFTER INSERT ON runs
  FOR EACH ROW EXECUTE FUNCTION update_profile_after_run();
