import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { checkBlacklist } from '@/lib/moderation';
import { Trophy, Clock, Target, Zap, Loader2, CheckCircle2, Plus, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  ricorrente: boolean;
  periodo: string | null;
}

interface Props {
  communityId: string;
  canCreate: boolean;
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

// Prossima domenica a mezzanotte (= lunedì 00:00), allineato a next_sunday_midnight() SQL
function nextSundayMidnight(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = ((1 - day + 7) % 7) || 7;
  const next = new Date(d);
  next.setDate(d.getDate() + daysUntilMonday);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

export function SfideChannelView({ communityId, canCreate }: Props) {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    descrizione: '',
    tipo: 'collettiva' as 'collettiva' | 'competitiva',
    obiettivo_tipo: 'km' as 'km' | 'tempo' | 'corse',
    obiettivo_valore: 10,
    punti: 15,
    durata_giorni: 7,
    settimanale: false,
  });
  const [formError, setFormError] = useState('');

  const { data: challenges = [], isLoading } = useQuery<CommunityChallengeRow[]>({
    queryKey: ['community-challenges-channel', communityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_challenges')
        .select('*')
        .eq('community_id', communityId)
        .gt('scadenza', new Date().toISOString())
        .order('ricorrente', { ascending: false })
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
        user_id: user.id, challenge_id: challengeId, valore_attuale: 0, completata: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-challenge-progress'] });
      qc.invalidateQueries({ queryKey: ['community-challenges'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non autenticato');
      const scadenza = form.settimanale
        ? nextSundayMidnight()
        : new Date(Date.now() + form.durata_giorni * 86_400_000).toISOString();
      const { error } = await supabase.from('community_challenges').insert({
        community_id: communityId,
        nome: form.nome.trim(),
        descrizione: form.descrizione.trim() || null,
        tipo: form.tipo,
        obiettivo_tipo: form.obiettivo_tipo,
        obiettivo_valore: form.obiettivo_valore,
        punti: form.punti,
        scadenza,
        created_by: user.id,
        ricorrente: form.settimanale,
        periodo: form.settimanale ? 'settimanale' : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-challenges-channel', communityId] });
      setShowForm(false);
      setForm({ nome: '', descrizione: '', tipo: 'collettiva', obiettivo_tipo: 'km', obiettivo_valore: 10, punti: 15, durata_giorni: 7, settimanale: false });
      setFormError('');
    },
    onError: (e: any) => setFormError(e.message ?? 'Errore durante la creazione'),
  });

  const handleCreate = () => {
    setFormError('');
    if (form.nome.trim().length < 3) { setFormError('Il nome deve avere almeno 3 caratteri.'); return; }
    const v = checkBlacklist(form.nome) ?? checkBlacklist(form.descrizione);
    if (v?.decision === 'blocked') { setFormError(v.reason); return; }
    if (form.obiettivo_valore <= 0) { setFormError('L\'obiettivo deve essere maggiore di zero.'); return; }
    createMutation.mutate();
  };

  const acceptedIds = new Set(accepted.map(a => a.challenge_id));

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-hiko-primary animate-spin" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <Trophy size={36} className="text-white/20 mb-3" />
            <p className="text-white/40 text-sm">Nessuna sfida attiva in questa community.</p>
            <p className="text-white/30 text-xs mt-1">{canCreate ? 'Pubblica la prima sfida!' : 'Unisciti per partecipare.'}</p>
          </div>
        ) : challenges.map((ch, i) => {
          const isAccepted = acceptedIds.has(ch.id);
          const days = daysLeft(ch.scadenza);
          const expired = days === 'Scaduta';

          return (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              className="glass-panel rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-sm leading-tight">{ch.nome}</h3>
                    {ch.ricorrente && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-blue-300 bg-blue-500/20 border border-blue-400/30 rounded-md px-1.5 py-0.5">
                        <RefreshCw size={9} /> Settimanale
                      </span>
                    )}
                  </div>
                  {ch.descrizione && <p className="text-white/50 text-xs leading-relaxed">{ch.descrizione}</p>}
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
                  <Clock size={10} /> {ch.ricorrente ? 'Reset domenica' : days}
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

      {/* Bottone crea sfida */}
      {canCreate && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-white/10">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-hiko-primary/15 border border-hiko-primary/30 text-hiko-primary rounded-2xl py-3 text-sm font-semibold hover:bg-hiko-primary/25 transition-colors"
          >
            <Plus size={16} /> Pubblica una sfida
          </button>
        </div>
      )}

      {/* Form sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-hiko-deep border-t border-white/10 rounded-t-3xl flex flex-col overflow-hidden max-h-[85vh]"
            >
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                <h3 className="text-white font-bold">Pubblica una sfida</h3>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
                {/* Nome */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Nome della sfida</label>
                  <input
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    maxLength={60}
                    placeholder="Es. 50 km in una settimana"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-hiko-primary/50 transition-colors"
                  />
                </div>

                {/* Descrizione */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Descrizione (opzionale)</label>
                  <textarea
                    value={form.descrizione}
                    onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                    maxLength={200}
                    rows={2}
                    placeholder="Spiega in cosa consiste..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none resize-none focus:border-hiko-primary/50 transition-colors"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Tipo</label>
                  <div className="flex gap-2">
                    {(['collettiva', 'competitiva'] as const).map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-colors ${form.tipo === t ? 'border-hiko-primary bg-hiko-primary/10 text-hiko-primary' : 'border-white/10 text-white/60 hover:border-white/30'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Obiettivo */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Obiettivo</label>
                  <div className="flex gap-2">
                    <input
                      type="number" min={1}
                      value={form.obiettivo_valore}
                      onChange={e => setForm(f => ({ ...f, obiettivo_valore: Number(e.target.value) }))}
                      className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-hiko-primary/50 transition-colors"
                    />
                    <div className="flex-1 flex gap-1.5">
                      {(['km', 'tempo', 'corse'] as const).map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, obiettivo_tipo: t }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${form.obiettivo_tipo === t ? 'border-hiko-primary bg-hiko-primary/10 text-hiko-primary' : 'border-white/10 text-white/60 hover:border-white/30'}`}>
                          {t === 'tempo' ? 'min' : t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Punti */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Punti (stelle) al completamento</label>
                  <input
                    type="number" min={1} max={100}
                    value={form.punti}
                    onChange={e => setForm(f => ({ ...f, punti: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-hiko-primary/50 transition-colors"
                  />
                </div>

                {/* Settimanale toggle */}
                <button
                  onClick={() => setForm(f => ({ ...f, settimanale: !f.settimanale }))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${form.settimanale ? 'border-blue-400/40 bg-blue-500/10' : 'border-white/10'}`}
                >
                  <div className="flex items-center gap-2 text-left">
                    <RefreshCw size={16} className={form.settimanale ? 'text-blue-300' : 'text-white/40'} />
                    <div>
                      <p className={`text-sm font-medium ${form.settimanale ? 'text-blue-300' : 'text-white/70'}`}>Sfida settimanale</p>
                      <p className="text-[11px] text-white/40">Si azzera ogni domenica a mezzanotte</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${form.settimanale ? 'bg-blue-500' : 'bg-white/15'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${form.settimanale ? 'translate-x-4' : ''}`} />
                  </div>
                </button>

                {/* Durata (solo se non settimanale) */}
                {!form.settimanale && (
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Durata (giorni)</label>
                    <input
                      type="number" min={1} max={90}
                      value={form.durata_giorni}
                      onChange={e => setForm(f => ({ ...f, durata_giorni: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-hiko-primary/50 transition-colors"
                    />
                  </div>
                )}

                {formError && (
                  <div className="flex items-start gap-2 text-red-400 text-xs">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {formError}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 px-4 py-3 border-t border-white/10">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full bg-hiko-primary text-hiko-deep font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-hiko-primary/90 transition-colors"
                >
                  {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
                  Pubblica sfida
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
