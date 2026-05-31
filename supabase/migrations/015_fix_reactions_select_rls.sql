-- ══════════════════════════════════════════════════════════════════════
-- HIKO — Fix SELECT policy community_reactions
-- La policy precedente faceva un JOIN complesso che bloccava il realtime:
-- Supabase Realtime verifica la SELECT policy prima di consegnare eventi,
-- e il JOIN community_members falliva → gli INSERT non arrivavano al client.
-- Le reazioni non sono dati sensibili, basta essere autenticati per vederle.
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "reactions_select" ON community_reactions;

CREATE POLICY "reactions_select" ON community_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);
