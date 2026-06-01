-- ══════════════════════════════════════════════════════════════════
-- HIKO — Supporto immagini nei messaggi community
-- ══════════════════════════════════════════════════════════════════

-- Aggiunge image_url e 'immagine' al tipo
ALTER TABLE community_messages
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE community_messages
  DROP CONSTRAINT IF EXISTS community_messages_tipo_check;

ALTER TABLE community_messages
  ADD CONSTRAINT community_messages_tipo_check
    CHECK (tipo IN ('testo', 'percorso', 'sfida', 'run', 'immagine'));
