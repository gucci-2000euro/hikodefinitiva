import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface ReactionGroup { count: number; hasReacted: boolean; }

export function useDMReactions(messageId: string) {
  const user = useAuthStore(s => s.user);
  const [raw, setRaw] = useState<{ message_id: string; user_id: string; emoji: string }[]>([]);

  useEffect(() => {
    supabase
      .from('direct_message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .then(({ data }) => setRaw(data ?? []));

    const ch = supabase
      .channel(`dmr:${messageId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_message_reactions', filter: `message_id=eq.${messageId}` },
        (p) => { const r = p.new as any; setRaw(prev => prev.some(x => x.user_id === r.user_id && x.emoji === r.emoji) ? prev : [...prev, r]); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_message_reactions', filter: `message_id=eq.${messageId}` },
        (p) => { const r = p.old as any; setRaw(prev => prev.filter(x => !(x.user_id === r.user_id && x.emoji === r.emoji))); })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [messageId]);

  const reactions: Record<string, ReactionGroup> = {};
  raw.forEach(r => {
    if (!reactions[r.emoji]) reactions[r.emoji] = { count: 0, hasReacted: false };
    reactions[r.emoji].count++;
    if (r.user_id === user?.id) reactions[r.emoji].hasReacted = true;
  });

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    if (reactions[emoji]?.hasReacted) {
      setRaw(prev => prev.filter(x => !(x.user_id === user.id && x.emoji === emoji)));
      await supabase.from('direct_message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      const opt = { message_id: messageId, user_id: user.id, emoji };
      setRaw(prev => [...prev, opt]);
      await supabase.from('direct_message_reactions').insert(opt);
    }
  };

  return { reactions, toggleReaction };
}
