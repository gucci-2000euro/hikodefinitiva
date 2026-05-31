-- ══════════════════════════════════════════════════════════════════════
-- HIKO — Colonne mancanti in profiles per le impostazioni runner
-- Tutte le altre colonne (bio, city, gender, height_cm, weight_kg,
-- runner_level, training_goals, weekly_frequency, typical_distance,
-- max_heart_rate, birth_date) esistono già nel DB.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS target_pace_sec integer; -- passo target in secondi/km
