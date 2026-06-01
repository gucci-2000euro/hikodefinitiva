-- ══════════════════════════════════════════════════════════════════
-- HIKO — Fix RLS: policy UPDATE mancante su community_messages
--        Fix RLS: messaggi leggibili nelle community aperte
--        anche da utenti non ancora iscritti
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. UPDATE policy per soft-delete (eliminato = true) ──────────
--  Proprietario del messaggio → può aggiornare solo i propri
CREATE POLICY "messages_update_own" ON community_messages
FOR UPDATE
USING  (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

--  Moderatori/admin della community → possono aggiornare qualsiasi messaggio
CREATE POLICY "messages_update_mod" ON community_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM community_channels cc
    WHERE cc.id = community_messages.channel_id
      AND is_community_moderator(cc.community_id)
  )
);

-- ─── 2. Fix SELECT: community aperte leggibili anche senza membership ──
--  La policy "messages_select" attuale richiedeva is_community_member.
--  Per le community di tipo 'aperta', chiunque (autenticato) può leggere.
DROP POLICY IF EXISTS "messages_select" ON community_messages;

CREATE POLICY "messages_select" ON community_messages FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM community_channels cc
    JOIN communities c ON c.id = cc.community_id
    WHERE cc.id = community_messages.channel_id
      AND (
        c.tipo = 'aperta'
        OR is_community_member(c.id)
      )
  )
);
