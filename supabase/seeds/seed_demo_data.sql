-- ══════════════════════════════════════════════════════════════════════
-- HIKO — Seed demo: utenti finti, post nel feed, messaggi community
-- Eseguire nel Supabase Dashboard → SQL Editor (bypassa RLS)
-- ══════════════════════════════════════════════════════════════════════

-- ─── 0. Pulizia chat community ────────────────────────────────────────
DELETE FROM community_messages;

-- ─── 1. Utenti finti in auth.users ───────────────────────────────────
-- UUIDs fissi per poterli referenziare nelle tabelle successive
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
)
VALUES
  ('a1000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'marco.bianchi@hikoapp.fake',
   crypt('DemoPass123!', gen_salt('bf')),
   now() - interval '30 days', now() - interval '30 days', now(),
   '{"name":"Marco Bianchi"}', '{"provider":"email","providers":["email"]}'),

  ('a1000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'giulia.ferrari@hikoapp.fake',
   crypt('DemoPass123!', gen_salt('bf')),
   now() - interval '28 days', now() - interval '28 days', now(),
   '{"name":"Giulia Ferrari"}', '{"provider":"email","providers":["email"]}'),

  ('a1000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'luca.romano@hikoapp.fake',
   crypt('DemoPass123!', gen_salt('bf')),
   now() - interval '20 days', now() - interval '20 days', now(),
   '{"name":"Luca Romano"}', '{"provider":"email","providers":["email"]}'),

  ('a1000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'sofia.conti@hikoapp.fake',
   crypt('DemoPass123!', gen_salt('bf')),
   now() - interval '15 days', now() - interval '15 days', now(),
   '{"name":"Sofia Conti"}', '{"provider":"email","providers":["email"]}'),

  ('a1000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'andrea.esposito@hikoapp.fake',
   crypt('DemoPass123!', gen_salt('bf')),
   now() - interval '10 days', now() - interval '10 days', now(),
   '{"name":"Andrea Esposito"}', '{"provider":"email","providers":["email"]}'),

  ('a1000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'chiara.ricci@hikoapp.fake',
   crypt('DemoPass123!', gen_salt('bf')),
   now() - interval '8 days', now() - interval '8 days', now(),
   '{"name":"Chiara Ricci"}', '{"provider":"email","providers":["email"]}'),

  ('a1000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'davide.gallo@hikoapp.fake',
   crypt('DemoPass123!', gen_salt('bf')),
   now() - interval '5 days', now() - interval '5 days', now(),
   '{"name":"Davide Gallo"}', '{"provider":"email","providers":["email"]}')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Profili ───────────────────────────────────────────────────────
INSERT INTO profiles (id, nome, avatar_url, km_totali, corse_totali, streak_corrente, ultimo_accesso, updated_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Marco Bianchi',   NULL, 142.5, 28, 14, CURRENT_DATE - 1, now()),
  ('a1000000-0000-0000-0000-000000000002', 'Giulia Ferrari',  NULL,  98.3, 19,  7, CURRENT_DATE - 1, now()),
  ('a1000000-0000-0000-0000-000000000003', 'Luca Romano',     NULL, 231.0, 45, 21, CURRENT_DATE - 1, now()),
  ('a1000000-0000-0000-0000-000000000004', 'Sofia Conti',     NULL,  55.2, 11,  3, CURRENT_DATE - 1, now()),
  ('a1000000-0000-0000-0000-000000000005', 'Andrea Esposito', NULL, 310.8, 62, 30, CURRENT_DATE - 1, now()),
  ('a1000000-0000-0000-0000-000000000006', 'Chiara Ricci',    NULL,  43.0,  8,  5, CURRENT_DATE - 1, now()),
  ('a1000000-0000-0000-0000-000000000007', 'Davide Gallo',    NULL, 187.4, 36, 18, CURRENT_DATE - 1, now())
ON CONFLICT (id) DO UPDATE
  SET nome = EXCLUDED.nome,
      km_totali = EXCLUDED.km_totali,
      corse_totali = EXCLUDED.corse_totali,
      streak_corrente = EXCLUDED.streak_corrente,
      ultimo_accesso = EXCLUDED.ultimo_accesso;

-- ─── 3. Post nel feed ─────────────────────────────────────────────────
INSERT INTO posts (id, user_id, image_url, caption, created_at)
VALUES
  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000001', NULL,
   '🏃 10 km questa mattina ai Navigli! Ritmo costante, tempo perfetto. Chi vuole unirsi domani? #Milano #Running',
   now() - interval '2 hours'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000003', NULL,
   'Prima uscita del mese sul Monte Barro: 18 km e +900 m di dislivello 🏔️ Le gambe fanno male ma il panorama vale tutto.',
   now() - interval '5 hours'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000002', NULL,
   'Nuovo record personale sui 5K! 23:41 ⚡ Dopo 3 mesi di allenamento finalmente si vede la differenza. Grazie a tutta la community per il supporto!',
   now() - interval '1 day'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000005', NULL,
   'Sessione notturna da 15 km 🌙 La città di notte ha un sapore completamente diverso. Pacchi freddi e buio totale, ma ne vale la pena.',
   now() - interval '1 day' - interval '3 hours'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000007', NULL,
   'Trail sul Sentiero del Viandante: 22 km sul lago di Como 💙 Uno dei percorsi più belli d''Italia, se non lo avete fatto correte a farlo!',
   now() - interval '2 days'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000004', NULL,
   'Primo 5K completato senza fermarmi! 🎉 Sei mesi fa non riuscivo a correre 500 m... oggi 5 chilometri tutti d''un fiato. Mai mollare!',
   now() - interval '2 days' - interval '6 hours'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000006', NULL,
   'Corsa al mattino presto con vista sul Po 🌅 6 km facili prima del lavoro. Questo è il modo migliore per iniziare la giornata.',
   now() - interval '3 days'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000001', NULL,
   'Maratona di Milano completata! 4h12min 🏅 Grazie a tutti quelli che mi hanno incoraggiato lungo il percorso. Prossimo obiettivo: scendere sotto le 4 ore.',
   now() - interval '4 days'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000003', NULL,
   'Allenamento intervallato oggi: 8x400m con recupero di 90 secondi. La velocità si sta migliorando settimana dopo settimana 📈 #TrackTraining',
   now() - interval '5 days'),

  (gen_random_uuid(),
   'a1000000-0000-0000-0000-000000000002', NULL,
   'Domenica = long run! 14 km attraverso il Parco Sempione e poi lungo le mura. Milano regalami questa energia ogni settimana 💚',
   now() - interval '6 days');

-- ─── 4. Aggiungi utenti finti come membri alle community aperte ───────
-- Prima otteniamo gli ID delle community
DO $$
DECLARE
  v_comm record;
  v_user uuid;
  v_users uuid[] := ARRAY[
    'a1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-0000-0000-000000000002'::uuid,
    'a1000000-0000-0000-0000-000000000003'::uuid,
    'a1000000-0000-0000-0000-000000000004'::uuid,
    'a1000000-0000-0000-0000-000000000005'::uuid,
    'a1000000-0000-0000-0000-000000000006'::uuid,
    'a1000000-0000-0000-0000-000000000007'::uuid
  ];
BEGIN
  FOR v_comm IN SELECT id FROM communities WHERE tipo = 'aperta' LOOP
    FOREACH v_user IN ARRAY v_users LOOP
      INSERT INTO community_members (community_id, user_id, ruolo, stato)
      VALUES (v_comm.id, v_user, 'membro', 'attivo')
      ON CONFLICT (community_id, user_id) DO NOTHING;
    END LOOP;
    UPDATE communities SET membri_count = (
      SELECT COUNT(*) FROM community_members WHERE community_id = v_comm.id AND stato = 'attivo'
    ) WHERE id = v_comm.id;
  END LOOP;
END;
$$;

-- ─── 5. Messaggi finti nelle community ────────────────────────────────
DO $$
DECLARE
  v_comm    record;
  v_ch_gen  uuid;
  v_ch_perc uuid;
  v_ch_sfide uuid;
BEGIN
  FOR v_comm IN SELECT id, nome FROM communities WHERE tipo = 'aperta' LOOP

    -- Canali di questa community
    SELECT id INTO v_ch_gen   FROM community_channels WHERE community_id = v_comm.id AND tipo = 'generale';
    SELECT id INTO v_ch_perc  FROM community_channels WHERE community_id = v_comm.id AND tipo = 'percorsi';
    SELECT id INTO v_ch_sfide FROM community_channels WHERE community_id = v_comm.id AND tipo = 'sfide';

    -- ── Canale Generale ──
    INSERT INTO community_messages (channel_id, user_id, contenuto, tipo, created_at)
    VALUES
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000001', 'Ciao a tutti! Qualcuno corre sabato mattina? 🏃', 'testo', now() - interval '3 days'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000002', 'Io ci sono! Propongo di partire alle 8 dal Parco Sempione', 'testo', now() - interval '3 days' + interval '5 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000003', 'Perfetto, ci sono anch''io. Portiamo i gel di emergenza 😄', 'testo', now() - interval '3 days' + interval '12 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000005', 'Mi unisco! Quanto pensiamo di fare? 10-12 km vanno bene', 'testo', now() - interval '3 days' + interval '25 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000001', '10 km con il gruppo è ideale. Poi colazione tutti insieme 🥐', 'testo', now() - interval '3 days' + interval '30 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000004', 'Prima volta che partecipo a una corsa di gruppo, sono un po'' nervosa...', 'testo', now() - interval '2 days'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000007', 'Non preoccuparti Sofia! Il gruppo va sempre al ritmo del più lento. Siamo tutti stati principianti 😊', 'testo', now() - interval '2 days' + interval '8 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000002', 'Esatto! La community è inclusiva al 100%. Correremo insieme 💚', 'testo', now() - interval '2 days' + interval '15 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000006', 'Stamattina ho battuto il mio record sui 5K! 23:15 😱🎉', 'testo', now() - interval '1 day'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000003', 'Fantastico Chiara! La costanza paga sempre 💪', 'testo', now() - interval '1 day' + interval '10 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000005', 'Bravisssima! Continua così, tra poco scendi sotto i 23 minuti', 'testo', now() - interval '1 day' + interval '18 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000001', 'Buongiorno runners! Chi è uscito stamattina? Tempo bellissimo oggi ☀️', 'testo', now() - interval '4 hours'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000007', 'Io! 8 km prima delle 7. Poi rimane libero il resto della giornata 😎', 'testo', now() - interval '3 hours' - interval '45 minutes'),
      (v_ch_gen, 'a1000000-0000-0000-0000-000000000002', 'Stessa cosa! Mattinieri si diventa 🌅', 'testo', now() - interval '3 hours');

    -- ── Canale Percorsi ──
    INSERT INTO community_messages (channel_id, user_id, contenuto, tipo, created_at)
    VALUES
      (v_ch_perc, 'a1000000-0000-0000-0000-000000000003', '📍 Percorso del weekend: Navigli → Darsena → Parco Sempione. 12 km totali, praticamente tutto pianeggiante. Ottimo per tutti i livelli!', 'testo', now() - interval '5 days'),
      (v_ch_perc, 'a1000000-0000-0000-0000-000000000005', 'Ho fatto il percorso dei Bastioni ieri: 8.5 km ad anello attorno al centro storico. Bello ma attento al traffico nelle ore di punta', 'testo', now() - interval '4 days'),
      (v_ch_perc, 'a1000000-0000-0000-0000-000000000001', 'Consiglio il percorso del Parco Nord per i long run: oltre 20 km di sentieri, pochissimo asfalto 🌿', 'testo', now() - interval '3 days'),
      (v_ch_perc, 'a1000000-0000-0000-0000-000000000007', 'Per chi ama il trail: sentiero del Ticino da Turbigo a Boffalora. 15 km di natura pura, qualche salita ma niente di estremo', 'testo', now() - interval '2 days'),
      (v_ch_perc, 'a1000000-0000-0000-0000-000000000002', 'Aggiunta una nuova versione del percorso Navigli con deviazione verso la Darsena, più scenografico! Totale 10 km 🌊', 'testo', now() - interval '1 day'),
      (v_ch_perc, 'a1000000-0000-0000-0000-000000000006', 'Qualcuno conosce percorsi notturni sicuri a Milano? Preferisco correre la sera tardi', 'testo', now() - interval '12 hours'),
      (v_ch_perc, 'a1000000-0000-0000-0000-000000000003', 'Il percorso dei Navigli di notte è perfetto: ben illuminato e molto frequentato anche dopo le 22. Stai tranquilla!', 'testo', now() - interval '11 hours');

    -- ── Canale Sfide ──
    INSERT INTO community_messages (channel_id, user_id, contenuto, tipo, created_at)
    VALUES
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000005', '🏆 SFIDA DEL MESE: 100 km in giugno! Chi partecipa? Teniamo il conto qui nel canale', 'testo', now() - interval '7 days'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000001', 'Ci sono! Sono già a 38 km. Obiettivo raggiungibile 💪', 'testo', now() - interval '6 days'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000003', 'Iscritto! Io parto svantaggiato con le 15 km fatte finora, ma recupero nel weekend 😅', 'testo', now() - interval '6 days' + interval '2 hours'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000002', 'Io sono a 25 km, meno della metà... ce la faccio?? 😬', 'testo', now() - interval '5 days'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000007', '@Giulia certo che ce la fai! Hai ancora 20 giorni. 75 km in 20 giorni = meno di 4 km al giorno. Fattibile!', 'testo', now() - interval '5 days' + interval '30 minutes'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000006', 'Update: io sono a 18 km 🐢 parto piano ma arrivo! Qualcuno vuole fare una corsa lunga insieme domenica per recuperare?', 'testo', now() - interval '3 days'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000001', 'Domenica ci sono! Partiamo alle 8 dal solito posto. 15 km per recuperare terreno sulla sfida 🏃‍♂️', 'testo', now() - interval '3 days' + interval '1 hour'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000004', 'Per i principianti come me: sfida dei 30 km in giugno più fattibile? Non voglio fissare obiettivi impossibili', 'testo', now() - interval '2 days'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000005', 'Sofia 30 km è perfetto per iniziare! L''importante è completarla, non la quantità. Fissa quella e poi alzala il mese prossimo 🎯', 'testo', now() - interval '2 days' + interval '45 minutes'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000003', 'Aggiornamento: sono a 67 km! Ho recuperato tutto questo fine settimana con 2 uscite da 12 km 💪', 'testo', now() - interval '1 day'),
      (v_ch_sfide, 'a1000000-0000-0000-0000-000000000007', 'Classifica provvisoria: Andrea 82km 🥇 Marco 71km 🥈 Luca 67km 🥉 Giulia 52km · Davide 48km · Chiara 35km · Sofia 18km. Siete tutti fantastici!', 'testo', now() - interval '6 hours');

  END LOOP;
END;
$$;

-- ─── 6. Verifica finale ───────────────────────────────────────────────
SELECT 'Profili finti' AS tabella, COUNT(*) AS righe FROM profiles WHERE id::text LIKE 'a1000000%'
UNION ALL
SELECT 'Post nel feed', COUNT(*) FROM posts WHERE user_id::text LIKE 'a1000000%'
UNION ALL
SELECT 'Messaggi community', COUNT(*) FROM community_messages WHERE user_id::text LIKE 'a1000000%';
