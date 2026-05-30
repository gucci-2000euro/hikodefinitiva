-- ══════════════════════════════════════════════════════════════════════
-- HIKO — Trigger membri_count, view leaderboard, storage, policy update
-- ══════════════════════════════════════════════════════════════════════

-- ─── 1. Trigger auto-aggiornamento membri_count ───────────────────────

CREATE OR REPLACE FUNCTION update_membri_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.stato = 'attivo' THEN
    UPDATE communities SET membri_count = membri_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' AND OLD.stato = 'attivo' THEN
    UPDATE communities SET membri_count = GREATEST(0, membri_count - 1) WHERE id = OLD.community_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.stato = 'attivo' AND OLD.stato != 'attivo' THEN
      UPDATE communities SET membri_count = membri_count + 1 WHERE id = NEW.community_id;
    ELSIF NEW.stato != 'attivo' AND OLD.stato = 'attivo' THEN
      UPDATE communities SET membri_count = GREATEST(0, membri_count - 1) WHERE id = OLD.community_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_membri_count ON community_members;
CREATE TRIGGER trg_membri_count
AFTER INSERT OR UPDATE OR DELETE ON community_members
FOR EACH ROW EXECUTE FUNCTION update_membri_count();

-- Ricalcola contatori esistenti
UPDATE communities c
SET membri_count = (
  SELECT COUNT(*) FROM community_members cm
  WHERE cm.community_id = c.id AND cm.stato = 'attivo'
);

-- ─── 2. Policy UPDATE su community_members ────────────────────────────

DROP POLICY IF EXISTS "members_update" ON community_members;
CREATE POLICY "members_update" ON community_members
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 3. View leaderboard settimanale ─────────────────────────────────

CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
  cm.user_id,
  cm.community_id,
  COUNT(DISTINCT msg.id) AS messaggi_settimana,
  ROW_NUMBER() OVER (PARTITION BY cm.community_id ORDER BY COUNT(DISTINCT msg.id) DESC) AS posizione,
  NULL::numeric AS delta_vs_prev_week,
  0 AS km_totali
FROM community_members cm
LEFT JOIN community_channels cc ON cc.community_id = cm.community_id
LEFT JOIN community_messages msg
  ON msg.channel_id = cc.id
  AND msg.created_at >= NOW() - INTERVAL '7 days'
  AND msg.eliminato = false
WHERE cm.stato = 'attivo'
GROUP BY cm.user_id, cm.community_id;

-- ─── 4. Storage bucket ────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',           'avatars',           true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('community-covers',  'community-covers',  true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('post-images',       'post-images',       true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Storage RLS policies ──────────────────────────────────────────

DROP POLICY IF EXISTS "public_read"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload"   ON storage.objects;
DROP POLICY IF EXISTS "owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "owner_delete"  ON storage.objects;

CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars','community-covers','post-images'));

CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND bucket_id IN ('avatars','community-covers','post-images')
  );

CREATE POLICY "owner_update" ON storage.objects
  FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner_delete" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
