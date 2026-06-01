-- ══════════════════════════════════════════════════════════════════
-- HIKO — DM avanzati: tipo, immagini, risposte, reazioni
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Colonne aggiuntive su direct_messages ─────────────────────
ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS tipo      text NOT NULL DEFAULT 'testo'
    CHECK (tipo IN ('testo', 'immagine')),
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES direct_messages(id) ON DELETE SET NULL;

-- ─── 2. Tabella reazioni sui DM ───────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_message_reactions (
  message_id uuid NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id)         ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

ALTER TABLE direct_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dmr_select" ON direct_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM direct_messages dm
      WHERE dm.id = message_id
        AND (dm.from_id = auth.uid() OR dm.to_id = auth.uid())
    )
  );
CREATE POLICY "dmr_insert" ON direct_message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dmr_delete" ON direct_message_reactions FOR DELETE
  USING (auth.uid() = user_id);
