-- ══════════════════════════════════════════════════════════════════
-- HIKO — Seed ROBUSTO dei percorsi consigliati nelle community
-- Non dipende da ID utente fissi: pesca profili reali esistenti.
-- Idempotente: ripulisce i percorsi condivisi e li reinserisce.
-- Eseguire nel Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_comm     record;
  v_ch_perc  uuid;
  v_users    uuid[];
  v_routes   uuid[];
  v_creator  uuid;
  i          int;
  n_users    int;
  n_routes   int;
  v_comments text[] := ARRAY[
    'Fatto ieri mattina, percorso scorrevole e ben segnalato. Lo consiglio a tutti! 🏃',
    'Uno dei miei preferiti per il long run della domenica, panorama stupendo 🌅',
    'Perfetto per chi inizia: pianeggiante e tranquillo. Provatelo! 👍',
    'Un po'' impegnativo nel finale ma la vista ripaga ogni fatica 💪',
    'Ottimo per le ripetute, fondo regolare e poco trafficato ⚡',
    'Bellissimo al tramonto, l''ho corso settimana scorsa e me ne sono innamorato 💚',
    'Consigliatissimo! Aria pulita e tanti altri runner, mai da soli 🌳'
  ];
BEGIN
  -- Profili reali (max 7). Servono come autori dei messaggi.
  SELECT array_agg(id) INTO v_users
  FROM (SELECT id FROM profiles WHERE nome IS NOT NULL ORDER BY km_totali DESC NULLS LAST LIMIT 7) p;

  -- Percorsi reali (max 6)
  SELECT array_agg(id) INTO v_routes
  FROM (SELECT id FROM routes ORDER BY created_at LIMIT 6) r;

  IF v_users IS NULL OR v_routes IS NULL THEN
    RAISE NOTICE 'Mancano profili o percorsi: impossibile popolare.';
    RETURN;
  END IF;

  n_users  := array_length(v_users, 1);
  n_routes := array_length(v_routes, 1);

  FOR v_comm IN SELECT id, fondatore_id FROM communities WHERE tipo = 'aperta' LOOP

    -- Autore valido per le sfide: fondatore se presente, altrimenti primo profilo
    v_creator := COALESCE(v_comm.fondatore_id, v_users[1]);

    SELECT id INTO v_ch_perc FROM community_channels
      WHERE community_id = v_comm.id AND tipo = 'percorsi' LIMIT 1;

    IF v_ch_perc IS NOT NULL THEN
      -- Pulisce i percorsi condivisi esistenti (idempotenza)
      DELETE FROM community_messages WHERE channel_id = v_ch_perc AND tipo = 'percorso';

      -- Inserisce 5 percorsi consigliati con autori e commenti diversi
      FOR i IN 1..5 LOOP
        INSERT INTO community_messages
          (channel_id, user_id, contenuto, tipo, riferimento_id, created_at)
        VALUES (
          v_ch_perc,
          v_users[1 + ((i - 1) % n_users)],
          v_comments[1 + ((i - 1) % array_length(v_comments, 1))],
          'percorso',
          v_routes[1 + ((i - 1) % n_routes)],
          now() - (i || ' days')::interval - (i * 37 || ' minutes')::interval
        );
      END LOOP;
    END IF;

    -- ── Sfide settimanali ricorrenti (se non già presenti) ──
    IF NOT EXISTS (
      SELECT 1 FROM community_challenges WHERE community_id = v_comm.id AND ricorrente = true
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

-- Verifica: quanti percorsi per community
SELECT c.nome AS community, COUNT(m.id) AS percorsi_condivisi
FROM communities c
JOIN community_channels ch ON ch.community_id = c.id AND ch.tipo = 'percorsi'
LEFT JOIN community_messages m ON m.channel_id = ch.id AND m.tipo = 'percorso'
WHERE c.tipo = 'aperta'
GROUP BY c.nome
ORDER BY c.nome;
