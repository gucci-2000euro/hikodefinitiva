-- ══════════════════════════════════════════════════════════════════
-- HIKO — Popola percorsi + sfide, sfide pubblicabili dai membri,
--        sfide settimanali con reset automatico (domenica a mezzanotte)
-- Eseguire nel Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Colonne aggiuntive su community_challenges ────────────────
ALTER TABLE community_challenges
  ADD COLUMN IF NOT EXISTS descrizione text,
  ADD COLUMN IF NOT EXISTS ricorrente  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS periodo     text;   -- 'settimanale' quando ricorrente

-- ─── 2. RLS: qualsiasi MEMBRO può pubblicare una sfida ────────────
DROP POLICY IF EXISTS "challenges_insert" ON community_challenges;
CREATE POLICY "challenges_insert" ON community_challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_community_member(community_id));

-- Il creatore (o un moderatore) può eliminare la propria sfida
DROP POLICY IF EXISTS "challenges_delete" ON community_challenges;
CREATE POLICY "challenges_delete" ON community_challenges FOR DELETE
  USING (auth.uid() = created_by OR is_community_moderator(community_id));

-- ─── 3. Funzione: prossima domenica a mezzanotte (= lunedì 00:00) ─
CREATE OR REPLACE FUNCTION public.next_sunday_midnight()
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT date_trunc('week', now()) + interval '7 days';
$$;

-- ─── 4. Reset settimanale delle sfide ricorrenti ──────────────────
CREATE OR REPLACE FUNCTION public.reset_weekly_challenges()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- azzera i progressi delle sfide settimanali
  DELETE FROM community_challenge_progress
  WHERE challenge_id IN (SELECT id FROM community_challenges WHERE ricorrente = true);

  -- sposta la scadenza alla domenica successiva
  UPDATE community_challenges
  SET scadenza = next_sunday_midnight()
  WHERE ricorrente = true;
END;
$$;

-- ─── 5. Schedulazione pg_cron: ogni domenica a mezzanotte ─────────
-- (lunedì 00:00 = fine domenica). Richiede l'estensione pg_cron abilitata.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('reset-weekly-challenges')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-weekly-challenges');
    PERFORM cron.schedule(
      'reset-weekly-challenges',
      '0 0 * * 1',
      'SELECT public.reset_weekly_challenges()'
    );
  END IF;
END;
$$;

-- ══════════════════════════════════════════════════════════════════
-- SEED — dati demo
-- ══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_comm     record;
  v_ch_perc  uuid;
  v_creator  uuid := 'a1000000-0000-0000-0000-000000000001'; -- Marco Bianchi
  v_routes   uuid[];
  v_users    uuid[] := ARRAY[
    'a1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-0000-0000-000000000002'::uuid,
    'a1000000-0000-0000-0000-000000000003'::uuid,
    'a1000000-0000-0000-0000-000000000005'::uuid,
    'a1000000-0000-0000-0000-000000000007'::uuid
  ];
  v_comments text[] := ARRAY[
    'Percorso top! Fatto ieri mattina, asfalto perfetto e poco traffico 🏃',
    'Lo consiglio a chi inizia: pianeggiante e ben segnalato 👍',
    'Bellissimo al tramonto, panorama spettacolare 🌅',
    'Un po'' impegnativo sul finale ma ne vale la pena 💪',
    'Il mio preferito per il long run della domenica 💚',
    'Ottimo per le ripetute, fondo regolare e sicuro ⚡'
  ];
  i int;
BEGIN
  -- Raccogli fino a 6 percorsi reali
  SELECT array_agg(id) INTO v_routes FROM (SELECT id FROM routes ORDER BY created_at LIMIT 6) r;

  IF v_routes IS NULL THEN RETURN; END IF;

  FOR v_comm IN SELECT id FROM communities WHERE tipo = 'aperta' LOOP

    -- ── PERCORSI: inserisci messaggi tipo 'percorso' nel canale percorsi ──
    SELECT id INTO v_ch_perc FROM community_channels
      WHERE community_id = v_comm.id AND tipo = 'percorsi' LIMIT 1;

    IF v_ch_perc IS NOT NULL THEN
      -- evita duplicati: solo se non ci sono già percorsi condivisi
      IF NOT EXISTS (
        SELECT 1 FROM community_messages
        WHERE channel_id = v_ch_perc AND tipo = 'percorso'
      ) THEN
        FOR i IN 1..4 LOOP
          INSERT INTO community_messages
            (channel_id, user_id, contenuto, tipo, riferimento_id, created_at)
          VALUES (
            v_ch_perc,
            v_users[1 + ((i - 1) % array_length(v_users, 1))],
            v_comments[1 + ((i - 1) % array_length(v_comments, 1))],
            'percorso',
            v_routes[1 + ((i - 1) % array_length(v_routes, 1))],
            now() - (i || ' days')::interval
          );
        END LOOP;
      END IF;
    END IF;

    -- ── SFIDE: una sfida settimanale ricorrente per community ──
    IF NOT EXISTS (
      SELECT 1 FROM community_challenges
      WHERE community_id = v_comm.id AND ricorrente = true
    ) THEN
      INSERT INTO community_challenges
        (community_id, nome, descrizione, tipo, obiettivo_tipo, obiettivo_valore, punti, scadenza, created_by, ricorrente, periodo)
      VALUES
        (v_comm.id, 'Sfida settimanale — 20 km',
         'Corri 20 km entro domenica. Si azzera ogni settimana!',
         'collettiva', 'km', 20, 15, next_sunday_midnight(), v_creator, true, 'settimanale'),
        (v_comm.id, 'Sprint della settimana — 3 corse',
         'Completa 3 corse questa settimana. Reset domenica a mezzanotte.',
         'collettiva', 'corse', 3, 10, next_sunday_midnight(), v_creator, true, 'settimanale');
    END IF;

  END LOOP;
END;
$$;

SELECT 'Percorsi condivisi' AS tabella, COUNT(*) AS righe FROM community_messages WHERE tipo = 'percorso'
UNION ALL
SELECT 'Sfide totali', COUNT(*) FROM community_challenges
UNION ALL
SELECT 'Sfide settimanali', COUNT(*) FROM community_challenges WHERE ricorrente = true;
