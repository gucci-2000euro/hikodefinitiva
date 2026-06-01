-- ══════════════════════════════════════════════════════════════════
-- HIKO — Tabella richieste di amicizia
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS friend_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stato        text NOT NULL DEFAULT 'pending'
                 CHECK (stato IN ('pending', 'accepted', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id)
);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Chiunque può vedere le richieste che lo riguardano (mittente o destinatario)
CREATE POLICY "fr_select" ON friend_requests FOR SELECT
  USING (auth.uid() = from_id OR auth.uid() = to_id);

-- Solo il mittente può inviare
CREATE POLICY "fr_insert" ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_id);

-- Solo il destinatario può accettare/rifiutare
CREATE POLICY "fr_update" ON friend_requests FOR UPDATE
  USING (auth.uid() = to_id);

-- Mittente o destinatario possono eliminare
CREATE POLICY "fr_delete" ON friend_requests FOR DELETE
  USING (auth.uid() = from_id OR auth.uid() = to_id);
