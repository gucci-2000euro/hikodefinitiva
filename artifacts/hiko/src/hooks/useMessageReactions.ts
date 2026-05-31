import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { CommunityReaction } from '@/types/index';

export interface ReactionGroup {
  count: number;
  hasReacted: boolean;
}

export function useMessageReactions(messageId: string) {
  const user = useAuthStore(s => s.user);
  const [raw, setRaw] = useState<CommunityReaction[]>([]);

  useEffect(() => {
    supabase
      .from('community_reactions')
      .select('*')
      .eq('message_id', messageId)
      .then(({ data }) => setRaw((data ?? []) as CommunityReaction[]));

    const ch = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_reactions', filter: `message_id=eq.${messageId}` },
        (payload) => {
          const r = payload.new as CommunityReaction;
          setRaw(prev =>
            prev.some(x => x.user_id === r.user_id && x.emoji === r.emoji)
              ? prev
              : [...prev, r]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_reactions', filter: `message_id=eq.${messageId}` },
        (payload) => {
          const r = payload.old as Partial<CommunityReaction>;
          setRaw(prev => prev.filter(x => !(x.user_id === r.user_id && x.emoji === r.emoji)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [messageId]);

  // Aggrega per emoji
  const reactions: Record<string, ReactionGroup> = {};
  raw.forEach(r => {
    if (!reactions[r.emoji]) reactions[r.emoji] = { count: 0, hasReacted: false };
    reactions[r.emoji].count++;
    if (r.user_id === user?.id) reactions[r.emoji].hasReacted = true;
  });

  const addReaction = async (emoji: string) => {
    if (!user) return;
    // aggiornamento ottimistico
    const optimistic: CommunityReaction = { message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() };
    setRaw(prev => prev.some(x => x.user_id === user.id && x.emoji === emoji) ? prev : [...prev, optimistic]);
    const { error } = await supabase.from('community_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
    if (error) setRaw(prev => prev.filter(x => !(x.user_id === user.id && x.emoji === emoji)));
  };

  const removeReaction = async (emoji: string) => {
    if (!user) return;
    // aggiornamento ottimistico
    setRaw(prev => prev.filter(x => !(x.user_id === user.id && x.emoji === emoji)));
    const { error } = await supabase.from('community_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);
    if (error) {
      // rollback
      const rollback: CommunityReaction = { message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() };
      setRaw(prev => [...prev, rollback]);
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    if (reactions[emoji]?.hasReacted) await removeReaction(emoji);
    else await addReaction(emoji);
  };

  return { reactions, addReaction, removeReaction, toggleReaction };
}
