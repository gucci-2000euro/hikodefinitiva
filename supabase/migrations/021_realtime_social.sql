-- ══════════════════════════════════════════════════════════════════
-- HIKO — Friend requests (FK a profiles) + Direct messages su DB
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Friend requests ───────────────────────────────────────────
DROP TABLE IF EXISTS friend_requests CASCADE;

CREATE TABLE friend_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stato      text NOT NULL DEFAULT 'pending'
               CHECK (stato IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id)
);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fr_select" ON friend_requests FOR SELECT
  USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "fr_insert" ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_id);
CREATE POLICY "fr_update" ON friend_requests FOR UPDATE
  USING (auth.uid() = to_id);
CREATE POLICY "fr_delete" ON friend_requests FOR DELETE
  USING (auth.uid() = from_id OR auth.uid() = to_id);

-- ─── 2. Direct messages ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  testo      text NOT NULL CHECK (char_length(testo) <= 2000),
  letto      boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_participants ON direct_messages (from_id, to_id, created_at DESC);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_select" ON direct_messages FOR SELECT
  USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "dm_insert" ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = from_id);
CREATE POLICY "dm_update_read" ON direct_messages FOR UPDATE
  USING (auth.uid() = to_id);
CREATE POLICY "dm_delete" ON direct_messages FOR DELETE
  USING (auth.uid() = from_id);
