import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, UserPlus, Check, X, MessageSquare, Search, Clock, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface Profile {
  id: string;
  nome: string | null;
  avatar_url: string | null;
  km_totali: number | null;
}

interface FriendRequestRow {
  id: string;
  from_id: string;
  to_id: string;
  stato: string;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, Profile>> {
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select('id, nome, avatar_url, km_totali')
    .in('id', ids);
  return new Map((data ?? []).map((p: Profile) => [p.id, p]));
}

export default function Friends() {
  const user = useAuthStore(s => s.user);
  const requireAuth = useAuthStore(s => s.requireAuth);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'my' | 'requests' | 'suggested'>('my');
  const [search, setSearch] = useState('');

  // Tutte le richieste accettate che mi riguardano
  const { data: friendRows = [] } = useQuery<FriendRequestRow[]>({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('friend_requests')
        .select('id, from_id, to_id, stato')
        .eq('stato', 'accepted')
        .or(`from_id.eq.${user!.id},to_id.eq.${user!.id}`);
      return (data ?? []) as FriendRequestRow[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const [friendProfiles, setFriendProfiles] = useState<Map<string, Profile>>(new Map());
  useEffect(() => {
    if (!user || !friendRows.length) { setFriendProfiles(new Map()); return; }
    const ids = friendRows.map(r => r.from_id === user.id ? r.to_id : r.from_id);
    fetchProfiles(ids).then(setFriendProfiles);
  }, [friendRows, user]);

  // Richieste ricevute in arrivo
  const { data: incomingRows = [] } = useQuery<FriendRequestRow[]>({
    queryKey: ['friend-requests-in', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('friend_requests')
        .select('id, from_id, to_id, stato')
        .eq('to_id', user!.id)
        .eq('stato', 'pending');
      return (data ?? []) as FriendRequestRow[];
    },
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const [incomingProfiles, setIncomingProfiles] = useState<Map<string, Profile>>(new Map());
  useEffect(() => {
    if (!incomingRows.length) { setIncomingProfiles(new Map()); return; }
    fetchProfiles(incomingRows.map(r => r.from_id)).then(setIncomingProfiles);
  }, [incomingRows]);

  // Richieste inviate (per sapere quali sono già pending/accepted)
  const { data: sentRows = [] } = useQuery<{ to_id: string }[]>({
    queryKey: ['friend-requests-out', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('friend_requests')
        .select('to_id')
        .eq('from_id', user!.id)
        .in('stato', ['pending', 'accepted']);
      return (data ?? []) as { to_id: string }[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const sentIds = new Set(sentRows.map(r => r.to_id));
  const friendIds = new Set(friendRows.map(r => r.from_id === user?.id ? r.to_id : r.from_id));

  // Realtime: aggiorna richieste ricevute in tempo reale
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('friend-requests-live')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `to_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['friend-requests-in'] });
          qc.invalidateQueries({ queryKey: ['friends'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  // Profili suggeriti
  const { data: suggestedAll = [], isLoading: loadingSuggested } = useQuery<Profile[]>({
    queryKey: ['suggested-friends', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, km_totali')
        .neq('id', user!.id)
        .not('nome', 'is', null)
        .order('km_totali', { ascending: false })
        .limit(20);
      return (data ?? []) as Profile[];
    },
    enabled: !!user && tab === 'suggested',
    staleTime: 60_000,
  });

  const sendRequest = useMutation({
    mutationFn: async (toId: string) => {
      const { error } = await supabase.from('friend_requests').insert({ from_id: user!.id, to_id: toId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friend-requests-out'] }),
  });

  const acceptRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from('friend_requests').update({ stato: 'accepted' }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['friend-requests-in'] });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from('friend_requests').update({ stato: 'rejected' }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friend-requests-in'] }),
  });

  const q = search.toLowerCase();
  const myFriendsList = [...friendProfiles.values()].filter(p => !q || (p.nome ?? '').toLowerCase().includes(q));
  const incomingList = incomingRows.filter(r => {
    const p = incomingProfiles.get(r.from_id);
    return !q || (p?.nome ?? '').toLowerCase().includes(q);
  });
  const suggestedList = suggestedAll
    .filter(p => !friendIds.has(p.id) && !sentIds.has(p.id))
    .filter(p => !q || (p.nome ?? '').toLowerCase().includes(q));

  const handleMessage = (p: Profile) => {
    requireAuth('Accedi per scrivere un messaggio.', () => {
      setLocation(`/messages/${p.id}`);
    });
  };

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/10">
        <Link href="/social" className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex-1">Friends</h1>
      </div>

      <div className="px-6 py-4">
        {/* Ricerca */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-4 focus-within:border-hiko-primary/40 transition-colors">
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca runner per nome..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
          />
          {search && <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60"><X size={14} /></button>}
        </div>

        {/* Tab */}
        <div className="glass-panel p-1 rounded-xl flex mb-6">
          {(['my', 'requests', 'suggested'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative ${tab === t ? 'bg-white/10 text-white' : 'text-white/50'}`}
            >
              {t === 'my' ? 'My Friends' : t === 'requests' ? 'Requests' : 'Suggested'}
              {t === 'requests' && incomingRows.length > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-hiko-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* My Friends */}
          {tab === 'my' && myFriendsList.map(p => (
            <div key={p.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                {p.avatar_url
                  ? <img src={p.avatar_url} alt={p.nome ?? ''} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  : <div className="w-12 h-12 rounded-full bg-hiko-primary/20 border border-white/10 flex items-center justify-center text-hiko-primary font-bold text-lg">{(p.nome ?? 'R')[0].toUpperCase()}</div>
                }
                <div>
                  <p className="font-bold">{p.nome ?? 'Runner'}</p>
                  <p className="text-xs text-white/50">{(p.km_totali ?? 0).toFixed(0)} km totali</p>
                </div>
              </div>
              <button onClick={() => handleMessage(p)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-hiko-primary/10 hover:bg-hiko-primary/20 text-sm font-medium text-hiko-primary transition-colors">
                <MessageSquare size={15} /> Message
              </button>
            </div>
          ))}

          {/* Requests */}
          {tab === 'requests' && incomingList.map(req => {
            const p = incomingProfiles.get(req.from_id);
            if (!p) return null;
            return (
              <div key={req.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.nome ?? ''} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                    : <div className="w-12 h-12 rounded-full bg-hiko-primary/20 border border-white/10 flex items-center justify-center text-hiko-primary font-bold text-lg">{(p.nome ?? 'R')[0].toUpperCase()}</div>
                  }
                  <div>
                    <p className="font-bold">{p.nome ?? 'Runner'}</p>
                    <p className="text-xs text-white/50">{(p.km_totali ?? 0).toFixed(0)} km totali</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest.mutate(req.id)} disabled={acceptRequest.isPending}
                    className="w-10 h-10 rounded-full bg-hiko-primary flex items-center justify-center text-hiko-deep disabled:opacity-60">
                    <Check size={20} />
                  </button>
                  <button onClick={() => rejectRequest.mutate(req.id)} disabled={rejectRequest.isPending}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-60">
                    <X size={20} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Suggested */}
          {tab === 'suggested' && (
            loadingSuggested
              ? <div className="flex justify-center py-12"><Loader2 size={28} className="text-hiko-primary animate-spin" /></div>
              : suggestedList.map(p => {
                const pending = sentIds.has(p.id);
                return (
                  <div key={p.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt={p.nome ?? ''} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                        : <div className="w-12 h-12 rounded-full bg-hiko-primary/20 border border-white/10 flex items-center justify-center text-hiko-primary font-bold text-lg">{(p.nome ?? 'R')[0].toUpperCase()}</div>
                      }
                      <div>
                        <p className="font-bold">{p.nome ?? 'Runner'}</p>
                        <p className="text-xs text-white/50">{(p.km_totali ?? 0).toFixed(0)} km totali</p>
                      </div>
                    </div>
                    {pending
                      ? <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-sm text-white/40 border border-white/10"><Clock size={14} /> Richiesta inviata</div>
                      : <button onClick={() => requireAuth('Accedi per aggiungere amici.', () => sendRequest.mutate(p.id))} disabled={sendRequest.isPending}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium disabled:opacity-60 transition-colors">
                          <UserPlus size={16} /> Aggiungi
                        </button>
                    }
                  </div>
                );
              })
          )}

          {/* Empty states */}
          {tab === 'my' && !myFriendsList.length && <p className="text-center py-12 text-white/50">{search ? `Nessun risultato per «${search}»` : 'Nessun amico ancora.'}</p>}
          {tab === 'requests' && !incomingList.length && <p className="text-center py-12 text-white/50">Nessuna richiesta in arrivo.</p>}
          {tab === 'suggested' && !loadingSuggested && !suggestedList.length && <p className="text-center py-12 text-white/50">{search ? `Nessun risultato per «${search}»` : 'Nessun runner suggerito.'}</p>}
        </div>
      </div>
    </div>
  );
}
