import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useCommunityMessages } from '@/hooks/useCommunityMessages';
import { useCommunityMembership, membershipKey } from '@/hooks/useCommunityMembership';
import { ChannelList } from '@/components/community/ChannelList';
import { MessageBubble } from '@/components/community/MessageBubble';
import { MessageComposer } from '@/components/community/MessageComposer';
import { LeaderboardWidget } from '@/components/community/LeaderboardWidget';
import { PercorsiChannelView } from '@/components/community/PercorsiChannelView';
import { SfideChannelView } from '@/components/community/SfideChannelView';
import type { Community, CommunityChannel, CommunityMessageWithProfile, LeaderboardEntry } from '@/types/index';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Loader2, UserPlus, Clock, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CommunityHub() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const requireAuth = useAuthStore(s => s.requireAuth);
  const [joining, setJoining] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, activeChannel, setActiveCommunity, setActiveChannel } = useCommunityStore();
  const { isMember, role } = useCommunityMembership(id ?? null, user?.id ?? null);

  const { data: community, isLoading: loadingCommunity } = useQuery<Community>({
    queryKey: ['community', id],
    queryFn: async () => {
      const { data } = await supabase.from('communities').select('*').eq('id', id).single();
      return data as Community;
    },
    enabled: !!id,
  });

  const { data: channels = [] } = useQuery<CommunityChannel[]>({
    queryKey: ['channels', id],
    queryFn: async () => {
      const { data } = await supabase.from('community_channels').select('*').eq('community_id', id);
      return (data ?? []) as CommunityChannel[];
    },
    enabled: !!id,
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', id],
    queryFn: async () => {
      const { data } = await supabase.from('leaderboard_weekly').select('*').eq('community_id', id).order('posizione').limit(10);
      return (data ?? []) as LeaderboardEntry[];
    },
    staleTime: 0,
  });

  useCommunityMessages(activeChannel?.id ?? null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messages.length]);

  useEffect(() => {
    if (community) setActiveCommunity(community);
  }, [community, setActiveCommunity]);

  useEffect(() => {
    if (channels.length > 0 && !activeChannel) {
      const generale = channels.find(c => c.tipo === 'generale') ?? channels[0];
      setActiveChannel(generale);
    }
  }, [channels, activeChannel, setActiveChannel]);

  // Realtime: membri_count, classifica e membership sempre aggiornati
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`community-live:${id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'community_members', filter: `community_id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['community', id] });
          if (user?.id) queryClient.invalidateQueries({ queryKey: membershipKey(id, user.id) });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'communities', filter: `id=eq.${id}` },
        (payload) => {
          queryClient.setQueryData<Community>(['community', id], payload.new as Community);
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user?.id, queryClient]);

  const handleJoin = async () => {
    if (!user) { requireAuth('Accedi per unirti alla community', handleJoin); return; }
    setJoining(true);
    if (community?.tipo === 'aperta') {
      await supabase.from('community_members').upsert(
        { community_id: id, user_id: user.id, ruolo: 'membro', stato: 'attivo' },
        { onConflict: 'community_id,user_id' }
      );
      queryClient.invalidateQueries({ queryKey: ['community', id] });
      queryClient.invalidateQueries({ queryKey: membershipKey(id!, user.id) });
    } else if (community?.tipo === 'approvazione') {
      await supabase.from('community_join_requests').upsert(
        { community_id: id, user_id: user.id, stato: 'in_attesa' },
        { onConflict: 'community_id,user_id' }
      );
      setJoinRequested(true);
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setLeaving(true);
    await supabase.from('community_members')
      .delete()
      .eq('community_id', id!)
      .eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['community', id] });
    queryClient.invalidateQueries({ queryKey: membershipKey(id!, user.id) });
    setLeaving(false);
    setConfirmLeave(false);
  };

  const handleSend = async (partial: Partial<{ channel_id: string; contenuto: string; tipo: string; riferimento_id?: string | null }>): Promise<string | null> => {
    if (!user) {
      requireAuth('Accedi per scrivere nella community', () => {});
      return null;
    }
    if (!activeChannel) return null;

    const { data, error } = await supabase.from('community_messages').insert({
      channel_id: activeChannel.id,
      user_id: user.id,
      contenuto: partial.contenuto,
      tipo: partial.tipo ?? 'testo',
      ...(partial.riferimento_id ? { riferimento_id: partial.riferimento_id } : {}),
    }).select('*').single();
    if (data && !error) {
      const enriched: CommunityMessageWithProfile = {
        ...data,
        profiles: { id: user.id, nome: user.name, avatar_url: user.avatar || null },
      };
      useCommunityStore.getState().addMessage(enriched);
    }
    return data?.id ?? null;
  };

  if (loadingCommunity) {
    return (
      <div className="flex items-center justify-center h-screen bg-hiko-deep">
        <Loader2 size={32} className="text-hiko-primary animate-spin" />
      </div>
    );
  }

  if (!community) return <div className="p-8 text-white/50">Community non trovata.</div>;

  const isAdmin = role === 'admin' || role === 'moderatore';
  const isReadOnly = activeChannel?.solo_admin && !isAdmin;

  return (
    <div className="flex flex-col h-screen bg-hiko-deep">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-hiko-deep/90 backdrop-blur-md">
        <button onClick={() => setLocation('/social')} className="text-white/60 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">{community.nome}</p>
          <p className="text-white/40 text-xs">{community.membri_count} membri</p>
        </div>
        {isAdmin && (
          <button onClick={() => setLocation(`/community/${id}/admin`)} className="text-white/60 hover:text-white">
            <Settings size={20} />
          </button>
        )}
        {isMember && community.fondatore_id !== user?.id && (
          <button
            onClick={() => setConfirmLeave(true)}
            title="Abbandona community"
            className="text-white/40 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar canali — testo completo, collassabile */}
        {sidebarOpen && (
          <div className="w-52 shrink-0 border-r border-white/10 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <p className="text-white/30 text-[10px] uppercase tracking-wider px-1">Canali</p>
              <button
                onClick={() => setSidebarOpen(false)}
                title="Chiudi sidebar"
                className="p-1 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="px-3">
              <ChannelList
                channels={channels}
                activeChannelId={activeChannel?.id ?? ''}
                onSelectChannel={(chId) => {
                  const ch = channels.find(c => c.id === chId);
                  if (ch) setActiveChannel(ch);
                }}
                unreadCounts={{}}
              />
            </div>
            <div className="px-3 mt-4 pb-3">
              <LeaderboardWidget entries={leaderboard} currentUserId={user?.id ?? ''} />
            </div>
          </div>
        )}

        {/* Area principale — chat o vista speciale */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Barra in alto: toggle sidebar + nome canale attivo */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/5">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Apri canali"
                className="p-1 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
              >
                <ChevronRight size={14} />
              </button>
            )}
            {activeChannel && (
              <span className="text-xs text-white/40 font-medium">{activeChannel.nome}</span>
            )}
          </div>

          {/* Vista canale */}
          {activeChannel?.tipo === 'percorsi' ? (
            <PercorsiChannelView
              canPost={isMember && !isReadOnly}
              currentUserId={user?.id ?? ''}
              onSendMessage={handleSend}
              onDeleteMessage={async (msgId) => {
                const filter = isAdmin
                  ? supabase.from('community_messages').update({ eliminato: true }).eq('id', msgId)
                  : supabase.from('community_messages').update({ eliminato: true }).eq('id', msgId).eq('user_id', user!.id);
                const { error } = await filter;
                if (!error) useCommunityStore.getState().removeMessage(msgId);
              }}
            />
          ) : activeChannel?.tipo === 'sfide' ? (
            <SfideChannelView communityId={id ?? ''} canCreate={isMember} />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
                {messages.map((msg, i) => {
                  const prev = i > 0 ? messages[i - 1] : null;
                  const isFirstInGroup = !prev || prev.user_id !== msg.user_id;
                  return (
                    <div key={msg.id} className={isFirstInGroup && i > 0 ? 'mt-3' : ''}>
                      <MessageBubble
                        message={msg}
                        currentUserId={user?.id ?? ''}
                        isFirstInGroup={isFirstInGroup}
                        isAdmin={isAdmin}
                        onReport={() => {
                          supabase.from('moderation_queue').upsert({ message_id: msg.id, segnalazioni_count: 1 });
                        }}
                        onReply={() => {}}
                        onDelete={async () => {
                          // Filtra anche su user_id per rispettare la policy RLS
                          const filter = isAdmin
                            ? supabase.from('community_messages').update({ eliminato: true }).eq('id', msg.id)
                            : supabase.from('community_messages').update({ eliminato: true }).eq('id', msg.id).eq('user_id', user!.id);
                          const { error } = await filter;
                          // Rimozione locale solo se il DB ha confermato (il Realtime la farà comunque via UPDATE event)
                          if (!error) useCommunityStore.getState().removeMessage(msg.id);
                        }}
                      />
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {!isMember && community?.tipo !== 'privata' && (
                <div className="px-4 py-3 border-t border-white/10 bg-white/[0.03] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">
                      {community?.tipo === 'approvazione' ? 'Community su approvazione' : 'Unisciti per partecipare'}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {community?.membri_count ?? 0} membri · {community?.tipo === 'approvazione' ? 'richiesta richiesta' : 'accesso libero'}
                    </p>
                  </div>
                  {joinRequested ? (
                    <div className="flex items-center gap-1.5 text-yellow-400 text-sm shrink-0">
                      <Clock size={15} /> In attesa
                    </div>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={joining}
                      className="flex items-center gap-1.5 bg-hiko-primary text-hiko-deep text-sm font-bold px-4 py-2 rounded-xl shrink-0 disabled:opacity-60 hover:bg-hiko-primary/90 transition-colors"
                    >
                      {joining ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                      {community?.tipo === 'approvazione' ? 'Richiedi' : 'Unisciti'}
                    </button>
                  )}
                </div>
              )}
              <MessageComposer
                channelId={activeChannel?.id ?? ''}
                userId={user?.id}
                onSend={handleSend}
                disabled={!isMember}
                readOnly={isReadOnly}
              />
            </>
          )}
        </div>
      </div>
      {/* Modal conferma abbandono */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-hiko-deep/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setConfirmLeave(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-5">
                <LogOut size={28} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Abbandonare la community?</h2>
              <p className="text-white/50 text-sm mb-8">
                Uscirai da <span className="text-white font-medium">{community.nome}</span> e non potrai più scrivere nei canali finché non ti riunisci.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                >
                  {leaving ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                  Abbandona
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="w-full text-white/60 hover:text-white font-medium py-3 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
