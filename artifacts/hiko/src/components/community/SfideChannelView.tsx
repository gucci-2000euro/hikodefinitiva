import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Trophy, Clock, Target, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
}

interface Props {
  communityId: string;
}

function daysLeft(scadenza: string) {
  const diff = Math.ceil((new Date(scadenza).getTime() - Date.now()) / 86_400_000);
  if (diff <= 0) return 'Scaduta';
  return diff === 1 ? '1 giorno rimasto' : `${diff} giorni rimasti`;
}

function unitLabel(tipo: 'km' | 'tempo' | 'corse', valore: number) {
  if (tipo === 'km') return `${valore} km`;
  if (tipo === 'tempo') return `${valore} min`;
  return `${valore} corse`;
}

export function SfideChannelView({ communityId }: Props) {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const { data: challenges = [], isLoading } = useQuery<CommunityChallengeRow[]>({
    queryKey: ['community-challenges-channel', communityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_challenges')
        .select('*')
        .eq('community_id', communityId)
        .gt('scadenza', new Date().toISOString())
        .order('scadenza', { ascending: true });
      return (data ?? []) as CommunityChallengeRow[];
    },
  });

  const { data: accepted = [] } = useQuery<{ challenge_id: string }[]>({
    queryKey: ['community-challenge-progress', user?.id, communityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_challenge_progress')
        .select('challenge_id')
        .eq('user_id', user!.id);
      return (data ?? []) as { challenge_id: string }[];
    },
    enabled: !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error('Non autenticato');
      const { error } = await supabase.from('community_challenge_progress').insert({
        user_id: user.id,
        challenge_id: challengeId,
        valore_attuale: 0,
        completata: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-challenge-progress'] });
      qc.invalidateQueries({ queryKey: ['community-challenges'] });
    },
  });

  const acceptedIds = new Set(accepted.map(a => a.challenge_id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <Loader2 size={28} className="text-hiko-primary animate-spin" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-center px-8">
        <Trophy size={36} className="text-white/20 mb-3" />
        <p className="text-white/40 text-sm">Nessuna sfida attiva in questa community.</p>
        <p className="text-white/30 text-xs mt-1">Gli admin possono crearne di nuove dal pannello di gestione.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {challenges.map((ch, i) => {
        const isAccepted = acceptedIds.has(ch.id);
        const days = daysLeft(ch.scadenza);
        const expired = days === 'Scaduta';

        return (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-panel rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm leading-tight mb-1">{ch.nome}</h3>
                {ch.descrizione && (
                  <p className="text-white/50 text-xs leading-relaxed">{ch.descrizione}</p>
                )}
              </div>
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg ${
                ch.tipo === 'competitiva' ? 'bg-orange-500/20 text-orange-400' : 'bg-hiko-primary/20 text-hiko-primary'
              }`}>
                {ch.tipo === 'competitiva' ? 'Competitiva' : 'Collettiva'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1 text-[11px] text-white/60 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                <Target size={10} /> {unitLabel(ch.obiettivo_tipo, ch.obiettivo_valore)}
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] bg-white/5 border border-white/10 rounded-full px-2.5 py-1 ${expired ? 'text-red-400' : 'text-white/60'}`}>
                <Clock size={10} /> {days}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-hiko-primary bg-hiko-primary/10 border border-hiko-primary/20 rounded-full px-2.5 py-1">
                <Zap size={10} /> {ch.punti} pt
              </span>
            </div>

            {isAccepted ? (
              <div className="flex items-center gap-2 text-hiko-primary text-sm font-medium">
                <CheckCircle2 size={16} className="fill-hiko-primary/20" />
                Sfida accettata — visibile in Sfide
              </div>
            ) : (
              <button
                onClick={() => acceptMutation.mutate(ch.id)}
                disabled={acceptMutation.isPending || expired || !user}
                className="w-full bg-hiko-primary text-hiko-deep font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-hiko-primary/90 transition-colors"
              >
                {acceptMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                {!user ? 'Accedi per accettare' : expired ? 'Sfida scaduta' : 'Accetta sfida'}
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
