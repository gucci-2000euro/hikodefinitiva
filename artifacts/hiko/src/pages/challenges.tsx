import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, Star, Users, Clock, MapPin, Zap, Loader2, Plus, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Link } from 'wouter';
import { useChallenges, useUserChallenges, useAcceptChallenge } from '@/hooks/usePersonalChallenges';
import type { Challenge } from '@/hooks/usePersonalChallenges';

interface CommunityChallengeRow {
  id: string;
  community_id: string;
  nome: string;
  descrizione: string | null;
  tipo: 'collettiva' | 'competitiva';
  obiettivo_tipo: 'km' | 'tempo' | 'corse';
  obiettivo_valore: number;
  punti: number;
  scadenza: string;
  communities: { nome: string; citta: string | null } | null;
}

interface ProgressRow {
  challenge_id: string;
  valore_attuale: number;
  completata: boolean;
}

function daysLeft(scadenza: string) {
  const diff = new Date(scadenza).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  if (days <= 0) return 'Scaduta';
  if (days === 1) return '1 giorno rimasto';
  return `${days} giorni rimasti`;
}

function unitLabel(tipo: 'km' | 'tempo' | 'corse', valore: number) {
  if (tipo === 'km') return `${valore} km`;
  if (tipo === 'tempo') return `${valore} min`;
  return `${valore} corse`;
}

export default function Challenges() {
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState<'community' | 'personal'>('community');

  const { data: allChallenges = [], isLoading: loadingChallenges } = useChallenges();
  const { data: userChallenges = [] } = useUserChallenges();
  const acceptChallenge = useAcceptChallenge();

  const acceptedIds = new Set(userChallenges.map(uc => uc.challenge_id));
  const available = allChallenges.filter(c => !acceptedIds.has(c.id));
  const active = userChallenges.filter(uc => !uc.completata && new Date(uc.scadenza) > new Date());
  const completed = userChallenges.filter(uc => uc.completata);
  const expired = userChallenges.filter(uc => !uc.completata && new Date(uc.scadenza) <= new Date());

  const diffColor = (d: Challenge['difficolta']) =>
    d === 'easy' ? 'text-hiko-primary bg-hiko-primary/15' :
    d === 'medium' ? 'text-yellow-400 bg-yellow-400/15' : 'text-red-400 bg-red-400/15';

  const daysLeftUc = (scadenza: string) => {
    const diff = Math.ceil((new Date(scadenza).getTime() - Date.now()) / 86_400_000);
    return diff <= 0 ? 'Scaduta' : diff === 1 ? '1 giorno' : `${diff} giorni`;
  };

  const { data: challenges = [], isLoading, isError } = useQuery<CommunityChallengeRow[]>({
    queryKey: ['community-challenges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Recupera solo le community a cui l'utente è iscritto
      const { data: membership } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
        .eq('stato', 'attivo');
      const ids = (membership ?? []).map((m: { community_id: string }) => m.community_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('community_challenges')
        .select('*, communities(nome, citta)')
        .in('community_id', ids)
        .gt('scadenza', new Date().toISOString())
        .order('scadenza', { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as CommunityChallengeRow[];
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });

  const { data: progressMap = {} } = useQuery<Record<string, ProgressRow>>({
    queryKey: ['challenge-progress', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await supabase
        .from('community_challenge_progress')
        .select('challenge_id, valore_attuale, completata')
        .eq('user_id', user.id);
      const map: Record<string, ProgressRow> = {};
      (data ?? []).forEach((r: ProgressRow) => { map[r.challenge_id] = r; });
      return map;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Nel hub /challenges mostriamo SOLO le sfide community accettate (con progresso)
  const acceptedChallenges = challenges.filter(ch => progressMap[ch.id]);

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      {/* Header */}
      <div className="px-6 py-8 bg-gradient-to-b from-hiko-muted/50 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-hiko-primary/20 flex items-center justify-center">
            <Trophy className="text-hiko-primary" size={20} />
          </div>
          <h1 className="text-3xl font-bold">Challenges</h1>
        </div>
        <p className="text-white/50 text-sm">Sfide attive nelle community</p>
      </div>

      {/* Tab selector */}
      <div className="px-6 mb-6">
        <div className="glass-panel p-1 rounded-xl flex">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'community' ? 'bg-hiko-primary text-hiko-deep' : 'text-white/50'}`}
            onClick={() => setTab('community')}
          >
            Community
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'personal' ? 'bg-hiko-primary text-hiko-deep' : 'text-white/50'}`}
            onClick={() => setTab('personal')}
          >
            Personali
          </button>
        </div>
      </div>

      {/* ── COMMUNITY TAB ─────────────────────────────────────────── */}
      {tab === 'community' && (
        <div className="px-6 space-y-4">
          {!user && (
            <div className="text-center py-16 text-white/40">
              <Lock size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Accedi per vedere le sfide</p>
              <p className="text-sm">Le sfide community sono visibili solo ai membri.</p>
            </div>
          )}

          {!!user && isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="text-hiko-primary animate-spin" />
            </div>
          )}

          {isError && (
            <div className="text-center py-16 text-white/40">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Sfide non disponibili</p>
              <p className="text-sm">Le tabelle community non sono ancora state create.</p>
              <p className="text-xs mt-2 text-white/30">Applica la migration SQL in Supabase per abilitarle.</p>
            </div>
          )}

          {!isLoading && !isError && acceptedChallenges.length === 0 && (
            <div className="text-center py-16 text-white/40">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Nessuna sfida accettata</p>
              <p className="text-sm">Vai nel canale <span className="text-white/60">Sfide</span> di una community e accetta una sfida per vederla qui.</p>
              <Link href="/social" className="inline-block mt-4 bg-hiko-primary text-hiko-deep text-sm font-bold px-5 py-2 rounded-xl">
                Scopri Community
              </Link>
            </div>
          )}

          {!isLoading && !isError && acceptedChallenges.map((ch, i) => {
            const progress = progressMap[ch.id];
            const pct = progress
              ? Math.min((progress.valore_attuale / ch.obiettivo_valore) * 100, 100)
              : 0;
            const completed = progress?.completata ?? false;

            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`glass-panel p-5 rounded-2xl border ${completed ? 'border-hiko-primary/40' : 'border-white/5'}`}
              >
                {/* Community badge + tipo */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg text-xs text-white/60">
                    <Users size={11} />
                    {ch.communities?.nome ?? 'Community'}
                    {ch.communities?.citta && ` · ${ch.communities.citta}`}
                  </div>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${ch.tipo === 'competitiva' ? 'bg-orange-500/15 text-orange-400' : 'bg-hiko-primary/15 text-hiko-primary'}`}>
                    {ch.tipo === 'competitiva' ? <Zap size={11} /> : <Users size={11} />}
                    {ch.tipo === 'competitiva' ? 'Competitiva' : 'Collettiva'}
                  </div>
                </div>

                {/* Title + points */}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-bold pr-4 leading-snug">{ch.nome}</h3>
                  <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md text-xs font-medium text-hiko-primary shrink-0">
                    <Star size={11} className="fill-hiko-primary" /> {ch.punti}
                  </div>
                </div>

                {ch.descrizione && (
                  <p className="text-sm text-white/55 mb-4 leading-relaxed">{ch.descrizione}</p>
                )}

                {/* Obiettivo + scadenza */}
                <div className="flex items-center gap-3 mb-4 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    Obiettivo: {unitLabel(ch.obiettivo_tipo, ch.obiettivo_valore)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {daysLeft(ch.scadenza)}
                  </span>
                </div>

                {/* Progress */}
                {completed ? (
                  <div className="flex items-center gap-2 text-hiko-primary font-medium text-sm bg-hiko-primary/10 w-fit px-3 py-1.5 rounded-lg">
                    <CheckCircle size={15} /> Completata
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5 text-white/50">
                      <span>{progress?.valore_attuale ?? 0} {ch.obiettivo_tipo}</span>
                      <span>{ch.obiettivo_valore} {ch.obiettivo_tipo}</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.06 }}
                        className="h-full bg-hiko-primary rounded-full"
                      />
                    </div>
                    {!user && (
                      <p className="text-xs text-white/30 mt-2">Accedi per tracciare i progressi</p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── PERSONAL TAB ──────────────────────────────────────────── */}
      {tab === 'personal' && (
        <div className="px-6 space-y-6">
          {!user && (
            <div className="text-center py-16 text-white/40">
              <Lock size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Accedi per le sfide personali</p>
              <p className="text-sm">Fai login per accettare sfide e tracciare i progressi.</p>
            </div>
          )}

          {user && (
            <>
              {/* Sfide in corso */}
              {active.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">In corso</h2>
                  <div className="space-y-3">
                    {active.map((uc, i) => {
                      const c = uc.challenge;
                      const pct = Math.min((uc.valore_attuale / c.obiettivo) * 100, 100);
                      return (
                        <motion.div key={uc.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className="glass-panel p-4 rounded-2xl border border-white/5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{c.icona}</span>
                              <div>
                                <p className="font-bold text-sm">{c.nome}</p>
                                <p className="text-xs text-white/40">{daysLeftUc(uc.scadenza)} rimasti</p>
                              </div>
                            </div>
                            <div className={`text-xs font-bold px-2 py-1 rounded-lg ${diffColor(c.difficolta)}`}>
                              {c.difficolta}
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-white/50 mb-1.5">
                            <span>{c.tipo === 'km' ? `${Number(uc.valore_attuale).toFixed(1)} km` : `${Math.round(uc.valore_attuale)} corse`}</span>
                            <span className="flex items-center gap-1"><Star size={10} className="fill-hiko-primary text-hiko-primary" /> {c.punti} pt</span>
                          </div>
                          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                              className="h-full bg-hiko-primary rounded-full" />
                          </div>
                          <p className="text-right text-xs text-white/30 mt-1">
                            {c.tipo === 'km' ? `obiettivo ${c.obiettivo} km` : `obiettivo ${c.obiettivo} corse`}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sfide completate */}
              {completed.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Completate</h2>
                  <div className="space-y-3">
                    {completed.map(uc => (
                      <div key={uc.id} className="glass-panel p-4 rounded-2xl border border-hiko-primary/30 flex items-center gap-3">
                        <span className="text-2xl">{uc.challenge.icona}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{uc.challenge.nome}</p>
                          <p className="text-xs text-white/40">
                            {uc.completata_at ? new Date(uc.completata_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={16} className="text-hiko-primary" />
                          <span className="text-xs font-bold text-hiko-primary">+{uc.challenge.punti} pt</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sfide disponibili */}
              {loadingChallenges ? (
                <div className="flex justify-center py-8"><Loader2 size={28} className="text-hiko-primary animate-spin" /></div>
              ) : available.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Disponibili</h2>
                  <div className="space-y-3">
                    {available.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="glass-panel p-4 rounded-2xl border border-white/5">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5">{c.icona}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-bold text-sm">{c.nome}</p>
                              <div className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${diffColor(c.difficolta)}`}>{c.difficolta}</div>
                            </div>
                            {c.descrizione && <p className="text-xs text-white/50 mb-2 leading-relaxed">{c.descrizione}</p>}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-white/40">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} /> {c.durata_giorni} giorni
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin size={11} /> {c.tipo === 'km' ? `${c.obiettivo} km` : `${c.obiettivo} corse`}
                                </span>
                              </div>
                              <button
                                onClick={() => acceptChallenge.mutate(c)}
                                disabled={acceptChallenge.isPending}
                                className="flex items-center gap-1.5 bg-hiko-primary text-hiko-deep text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-hiko-primary/90 transition-colors disabled:opacity-60"
                              >
                                {acceptChallenge.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                Accetta · <Star size={10} className="fill-hiko-deep" /> {c.punti}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {active.length === 0 && completed.length === 0 && available.length === 0 && !loadingChallenges && (
                <div className="text-center py-16 text-white/40">
                  <Trophy size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nessuna sfida disponibile</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
