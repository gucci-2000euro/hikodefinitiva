import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityMembership } from '@/hooks/useCommunityMembership';
import { ModerationQueueItemCard } from '@/components/community/ModerationQueueItem';
import type { CommunityMember, JoinRequest, ModerationQueueItem, CommunityMessage } from '@/types/index';
import { ArrowLeft, Users, ShieldAlert, Trophy, Settings, Loader2 } from 'lucide-react';

type Tab = 'membri' | 'richieste' | 'moderazione' | 'sfide' | 'impostazioni';

export default function CommunityAdmin() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const user = useAuthStore(s => s.user);
  const { role, isLoading: loadingMembership } = useCommunityMembership(id ?? null, user?.id ?? null);
  const [tab, setTab] = useState<Tab>('membri');
  const qc = useQueryClient();

  const isAuthorized = role === 'admin' || role === 'moderatore';

  const { data: members = [] } = useQuery<(CommunityMember & { profiles: { nome: string | null; avatar_url: string | null } | null })[]>({
    queryKey: ['community-members', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_members')
        .select('*, profiles(nome, avatar_url)')
        .eq('community_id', id);
      return (data ?? []) as (CommunityMember & { profiles: { nome: string | null; avatar_url: string | null } | null })[];
    },
    enabled: isAuthorized && tab === 'membri',
  });

  const { data: joinRequests = [] } = useQuery<(JoinRequest & { profiles: { nome: string | null; avatar_url: string | null } | null })[]>({
    queryKey: ['join-requests', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_join_requests')
        .select('*, profiles(nome, avatar_url)')
        .eq('community_id', id)
        .eq('stato', 'in_attesa');
      return (data ?? []) as (JoinRequest & { profiles: { nome: string | null; avatar_url: string | null } | null })[];
    },
    enabled: isAuthorized && tab === 'richieste',
  });

  const { data: queue = [] } = useQuery<ModerationQueueItem[]>({
    queryKey: ['moderation-queue', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('moderation_queue')
        .select('*, community_messages(*)')
        .is('azione_finale', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as ModerationQueueItem[];
    },
    enabled: isAuthorized && tab === 'moderazione',
  });

  const approveRequest = useMutation({
    mutationFn: async (req: JoinRequest) => {
      await supabase.from('community_join_requests').update({ stato: 'approvata' }).eq('id', req.id);
      await supabase.from('community_members').insert({ community_id: req.community_id, user_id: req.user_id, ruolo: 'membro', stato: 'attivo' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['join-requests', id] }),
  });

  const rejectRequest = useMutation({
    mutationFn: async (reqId: string) => {
      await supabase.from('community_join_requests').update({ stato: 'rifiutata' }).eq('id', reqId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['join-requests', id] }),
  });

  const updateMember = useMutation({
    mutationFn: async ({ userId, patch }: { userId: string; patch: Partial<CommunityMember> }) => {
      await supabase.from('community_members').update(patch).eq('community_id', id).eq('user_id', userId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-members', id] }),
  });

  const resolveQueue = useMutation({
    mutationFn: async ({ itemId, decision }: { itemId: string; decision: 'approved' | 'blocked' }) => {
      await supabase.from('moderation_queue').update({ azione_finale: decision, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', itemId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderation-queue', id] }),
  });

  if (loadingMembership) {
    return <div className="flex justify-center items-center h-screen bg-hiko-deep"><Loader2 className="text-hiko-primary animate-spin" size={32} /></div>;
  }

  if (!isAuthorized) {
    return <div className="flex justify-center items-center h-screen bg-hiko-deep text-white/50">Accesso negato.</div>;
  }

  const tabs: { key: Tab; icon: typeof Users; label: string }[] = [
    { key: 'membri', icon: Users, label: 'Membri' },
    { key: 'richieste', icon: Users, label: 'Richieste' },
    { key: 'moderazione', icon: ShieldAlert, label: 'Moderazione' },
    { key: 'sfide', icon: Trophy, label: 'Sfide' },
    { key: 'impostazioni', icon: Settings, label: 'Impostazioni' },
  ];

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-hiko-deep/90 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => setLocation(`/community/${id}`)} className="text-white/60 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <p className="text-white font-bold">Gestione community</p>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-white/10">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm shrink-0 border-b-2 transition-colors ${
              tab === key ? 'border-hiko-primary text-hiko-primary' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {tab === 'membri' && (
          <div className="flex flex-col gap-2">
            {members.map(m => {
              const nome = m.profiles?.nome ?? m.user_id.slice(0, 8);
              const avatar = m.profiles?.avatar_url;
              return (
                <div key={m.user_id} className="glass-panel rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-hiko-muted rounded-full flex items-center justify-center text-xs text-white/60 overflow-hidden">
                    {avatar
                      ? <img src={avatar} alt={nome} className="w-full h-full object-cover" />
                      : <span>{nome.slice(0, 2).toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{nome}</p>
                    <p className="text-white/40 text-xs capitalize">{m.ruolo} · {m.stato}</p>
                  </div>
                  {role === 'admin' && m.ruolo !== 'admin' && (
                    <div className="flex gap-1">
                      {m.ruolo === 'membro' && (
                        <button
                          onClick={() => updateMember.mutate({ userId: m.user_id, patch: { ruolo: 'moderatore' } })}
                          className="text-xs bg-hiko-primary/20 text-hiko-primary px-2 py-1 rounded-lg"
                        >
                          Promuovi
                        </button>
                      )}
                      {m.stato === 'attivo' && (
                        <button
                          onClick={() => updateMember.mutate({ userId: m.user_id, patch: { stato: 'silenziato' } })}
                          className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg"
                        >
                          Silenzia
                        </button>
                      )}
                      <button
                        onClick={() => updateMember.mutate({ userId: m.user_id, patch: { stato: 'bannato' } })}
                        className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg"
                      >
                        Ban
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'richieste' && (
          <div className="flex flex-col gap-2">
            {joinRequests.length === 0 && <p className="text-white/40 text-sm py-8 text-center">Nessuna richiesta in attesa.</p>}
            {joinRequests.map(req => (
              <div key={req.id} className="glass-panel rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm">{req.profiles?.nome ?? req.user_id.slice(0, 8)}</p>
                  <p className="text-white/40 text-xs">{new Date(req.created_at).toLocaleDateString('it')}</p>
                </div>
                <button onClick={() => approveRequest.mutate(req)} className="text-xs bg-hiko-primary/20 text-hiko-primary px-3 py-1.5 rounded-lg font-medium">Approva</button>
                <button onClick={() => rejectRequest.mutate(req.id)} className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg">Rifiuta</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'moderazione' && (
          <div className="flex flex-col gap-3">
            {queue.length === 0 && <p className="text-white/40 text-sm py-8 text-center">Nessun elemento in coda.</p>}
            {queue.map(item => {
              const msg = (item as ModerationQueueItem & { community_messages: CommunityMessage }).community_messages;
              return (
                <ModerationQueueItemCard
                  key={item.id}
                  item={item}
                  message={msg}
                  onApprove={() => resolveQueue.mutate({ itemId: item.id, decision: 'approved' })}
                  onBlock={() => resolveQueue.mutate({ itemId: item.id, decision: 'blocked' })}
                  onSilence={(d) => console.log('silence', item.id, d)}
                />
              );
            })}
          </div>
        )}

        {tab === 'sfide' && (
          <p className="text-white/40 text-sm py-8 text-center">Gestione sfide — coming soon.</p>
        )}

        {tab === 'impostazioni' && (
          <p className="text-white/40 text-sm py-8 text-center">Impostazioni community — coming soon.</p>
        )}
      </div>
    </div>
  );
}
