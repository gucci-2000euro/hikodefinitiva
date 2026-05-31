-- ══════════════════════════════════════════════════════════════════════
-- HIKO — RLS policies per community_reactions
-- La tabella esisteva già ma senza policy: tutte le operazioni erano bloccate.
-- ══════════════════════════════════════════════════════════════════════

-- SELECT: i membri della community possono leggere le reazioni
DROP POLICY IF EXISTS "reactions_select" ON community_reactions;
CREATE POLICY "reactions_select" ON community_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_messages cm
      JOIN community_channels cc ON cc.id = cm.channel_id
      JOIN community_members memb ON memb.community_id = cc.community_id
      WHERE cm.id = community_reactions.message_id
        AND memb.user_id = auth.uid()
        AND memb.stato = 'attivo'
    )
  );

-- INSERT: l'utente può inserire solo le proprie reazioni
DROP POLICY IF EXISTS "reactions_insert" ON community_reactions;
CREATE POLICY "reactions_insert" ON community_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DELETE: l'utente può rimuovere solo le proprie reazioni
DROP POLICY IF EXISTS "reactions_delete" ON community_reactions;
CREATE POLICY "reactions_delete" ON community_reactions
  FOR DELETE USING (auth.uid() = user_id);
