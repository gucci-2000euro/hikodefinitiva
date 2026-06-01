-- ══════════════════════════════════════════════════════════════════
-- HIKO — Seed sfide community demo
-- Eseguire nel Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Usa Marco Bianchi (utente demo) come creatore delle sfide
DO $$
DECLARE
  v_creator uuid := 'a1000000-0000-0000-0000-000000000001';
  v_id      uuid;
BEGIN

  -- ── Corridori Milano ───────────────────────────────────────────
  SELECT id INTO v_id FROM communities WHERE nome = 'Corridori Milano' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO community_challenges
      (community_id, nome, tipo, obiettivo_tipo, obiettivo_valore, punti, scadenza, created_by)
    VALUES
      (v_id, 'Sfida dei 100 km di Luglio',       'collettiva',  'km',    100, 50, now() + interval '30 days', v_creator),
      (v_id, 'Navigli Speed Run — 5 km in gara', 'competitiva', 'km',      5, 30, now() + interval '14 days', v_creator),
      (v_id, '10 corse nel mese',                'collettiva',  'corse',  10, 20, now() + interval '28 days', v_creator)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Roma Running Club ──────────────────────────────────────────
  SELECT id INTO v_id FROM communities WHERE nome = 'Roma Running Club' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO community_challenges
      (community_id, nome, tipo, obiettivo_tipo, obiettivo_valore, punti, scadenza, created_by)
    VALUES
      (v_id, 'Via Appia Challenge — 42 km totali', 'collettiva',  'km',   42, 40, now() + interval '21 days', v_creator),
      (v_id, 'Faster than the Tiber — pace < 5:30','competitiva', 'tempo', 60, 35, now() + interval '10 days', v_creator),
      (v_id, '5 uscite al Tevere',                 'collettiva',  'corse',  5, 15, now() + interval '20 days', v_creator)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── 5K Beginners Italia ────────────────────────────────────────
  SELECT id INTO v_id FROM communities WHERE nome = '5K Beginners Italia' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO community_challenges
      (community_id, nome, tipo, obiettivo_tipo, obiettivo_valore, punti, scadenza, created_by)
    VALUES
      (v_id, 'Primo 5K senza fermarsi',    'collettiva',  'km',    5, 25, now() + interval '30 days', v_creator),
      (v_id, '3 corse questa settimana',   'collettiva',  'corse', 3, 10, now() + interval '7 days',  v_creator),
      (v_id, '20 km nel mese — obiettivo principiante', 'collettiva', 'km', 20, 20, now() + interval '25 days', v_creator)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Trail Running Alpi ─────────────────────────────────────────
  SELECT id INTO v_id FROM communities WHERE nome = 'Trail Running Alpi' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO community_challenges
      (community_id, nome, tipo, obiettivo_tipo, obiettivo_valore, punti, scadenza, created_by)
    VALUES
      (v_id, 'Dislivello Challenge — 3000 m totali', 'collettiva',  'km',   50, 60, now() + interval '30 days', v_creator),
      (v_id, 'Trail King — percorso più lungo',      'competitiva', 'km',   30, 45, now() + interval '14 days', v_creator),
      (v_id, '4 uscite in montagna',                 'collettiva',  'corse', 4, 30, now() + interval '28 days', v_creator)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Runner Firenze ─────────────────────────────────────────────
  SELECT id INTO v_id FROM communities WHERE nome = 'Runner Firenze' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO community_challenges
      (community_id, nome, tipo, obiettivo_tipo, obiettivo_valore, punti, scadenza, created_by)
    VALUES
      (v_id, 'Lungarno run — 30 km totali', 'collettiva',  'km',    30, 30, now() + interval '20 days', v_creator),
      (v_id, 'Corse mattutine — 5 uscite',  'collettiva',  'corse',  5, 15, now() + interval '14 days', v_creator)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Napoli Corre ───────────────────────────────────────────────
  SELECT id INTO v_id FROM communities WHERE nome = 'Napoli Corre' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO community_challenges
      (community_id, nome, tipo, obiettivo_tipo, obiettivo_valore, punti, scadenza, created_by)
    VALUES
      (v_id, 'Lungomare Challenge — 25 km', 'collettiva',  'km',    25, 25, now() + interval '18 days', v_creator),
      (v_id, 'Sprint partenopeo — 3 km',    'competitiva', 'km',     3, 20, now() + interval '7 days',  v_creator)
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$;

SELECT 'Sfide inserite' AS stato, COUNT(*) AS totale FROM community_challenges;
