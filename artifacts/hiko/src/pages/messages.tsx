import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';

interface ConversationRow {
  partner_id: string;
  last_text: string;
  last_at: string;
  unread: number;
  nome: string | null;
  avatar_url: string | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'adesso';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}g`;
}

export default function Messages() {
  const [, setLocation] = useLocation();
  const user = useAuthStore(s => s.user);
  const openAuthModal = useAuthStore(s => s.openAuthModal);
  const qc = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery<ConversationRow[]>({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Prende tutti i messaggi che mi riguardano, raggruppa per partner
      const { data } = await supabase
        .from('direct_messages')
        .select('from_id, to_id, testo, letto, created_at')
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const msgs = (data ?? []) as { from_id: string; to_id: string; testo: string; letto: boolean; created_at: string }[];

      // Raggruppa per partner
      const map = new Map<string, { last_text: string; last_at: string; unread: number }>();
      for (const m of msgs) {
        const partnerId = m.from_id === user.id ? m.to_id : m.from_id;
        if (!map.has(partnerId)) {
          map.set(partnerId, {
            last_text: m.testo,
            last_at: m.created_at,
            unread: (!m.letto && m.to_id === user.id) ? 1 : 0,
          });
        } else if (!m.letto && m.to_id === user.id) {
          map.get(partnerId)!.unread++;
        }
      }

      // Fetch profili dei partner
      const partnerIds = [...map.keys()];
      if (!partnerIds.length) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .in('id', partnerIds);
      const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return partnerIds.map(pid => {
        const conv = map.get(pid)!;
        const prof = profMap.get(pid) ?? { nome: null, avatar_url: null };
        return { partner_id: pid, ...conv, nome: prof.nome, avatar_url: prof.avatar_url };
      }).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
    },
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  // Realtime: nuovo messaggio → aggiorna lista
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('dm-list-live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const m = payload.new as any;
          if (m.from_id === user.id || m.to_id === user.id) {
            qc.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  if (!user) {
    return (
      <div className="min-h-screen bg-hiko-deep text-white flex flex-col items-center justify-center px-6">
        <MessageSquare size={48} className="text-hiko-primary mb-4 opacity-60" />
        <h2 className="text-xl font-bold mb-2">Your Messages</h2>
        <p className="text-white/50 text-center text-sm mb-6">Sign in to chat with other runners.</p>
        <button onClick={() => openAuthModal('Sign in to message other runners.')}
          className="bg-hiko-primary text-hiko-deep font-bold py-3 px-8 rounded-2xl hover:bg-hiko-primary/90 transition-colors">
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/10">
        <button onClick={() => setLocation('/social')} className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <Logo size={26} />
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-hiko-primary animate-spin" />
        </div>
      )}

      <div className="divide-y divide-white/5">
        {!isLoading && conversations.length === 0 && (
          <p className="text-center text-white/40 text-sm py-16">Nessuna conversazione ancora.</p>
        )}
        {conversations.map((conv, i) => (
          <motion.button
            key={conv.partner_id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setLocation(`/chat/${conv.partner_id}`)}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors text-left"
          >
            <div className="relative flex-shrink-0">
              {conv.avatar_url
                ? <img src={conv.avatar_url} alt={conv.nome ?? ''} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                : <div className="w-12 h-12 rounded-full bg-hiko-primary/20 border border-white/10 flex items-center justify-center text-hiko-primary font-bold text-lg">{(conv.nome ?? 'R')[0].toUpperCase()}</div>
              }
              {conv.unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-hiko-primary rounded-full flex items-center justify-center text-[10px] font-bold text-hiko-deep">
                  {conv.unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-sm font-bold ${conv.unread > 0 ? 'text-white' : 'text-white/80'}`}>
                  {conv.nome ?? 'Runner'}
                </span>
                <span className="text-[11px] text-white/40 flex-shrink-0">{timeAgo(conv.last_at)}</span>
              </div>
              <p className={`text-sm truncate ${conv.unread > 0 ? 'text-white/80' : 'text-white/40'}`}>
                {conv.last_text}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
