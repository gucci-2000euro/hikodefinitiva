import { useState, useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Heart, Timer, Target, TrendingUp } from 'lucide-react';
import type { ProfileData } from '@/hooks/useProfileSettings';

interface Props {
  profile: ProfileData;
  onChange: (patch: Partial<ProfileData>) => void;
  onImmediate: (patch: Partial<ProfileData>) => void;
}

const RUNNER_LEVELS = [
  { value: 'principiante', label: 'Principiante', sub: '<6 mesi' },
  { value: 'intermedio',   label: 'Intermedio',   sub: '6 mesi – 2 anni' },
  { value: 'avanzato',     label: 'Avanzato',     sub: '2+ anni' },
  { value: 'competitivo',  label: 'Competitivo',  sub: 'Gare e performance' },
];

const TRAINING_GOALS = [
  'Perdere peso',
  'Migliorare la forma',
  'Correre una 5K',
  'Correre una 10K',
  'Mezza maratona',
  'Maratona',
  'Correre per benessere',
];

const TYPICAL_DISTANCES = [
  { value: '1-5km',  label: '1–5 km' },
  { value: '5-10km', label: '5–10 km' },
  { value: '10-20km',label: '10–20 km' },
  { value: '20+km',  label: '20+ km' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

/** Converte secondi/km in stringa "m:ss" */
function secToMmSs(sec: number | null): string {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Valida e converte "m:ss" in secondi; null se non valido */
function mmSsToSec(str: string): number | null {
  const m = str.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-hiko-primary/60 transition-colors';

export function RunningExperienceSettings({ profile, onChange, onImmediate }: Props) {
  const [level, setLevel] = useState(profile.runner_level);
  const [freq, setFreq] = useState(profile.weekly_frequency);
  const [dist, setDist] = useState(profile.typical_distance);
  const [pace, setPace] = useState(secToMmSs(profile.target_pace_sec));
  const [paceError, setPaceError] = useState(false);
  const [hr, setHr] = useState(profile.max_heart_rate?.toString() ?? '');
  const [goals, setGoals] = useState<string[]>(profile.training_goals);

  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    setLevel(profile.runner_level);
    setFreq(profile.weekly_frequency);
    setDist(profile.typical_distance);
    setPace(secToMmSs(profile.target_pace_sec));
    setHr(profile.max_heart_rate?.toString() ?? '');
    setGoals(profile.training_goals);
    synced.current = true;
  }, [profile]);

  const toggleGoal = (goal: string) => {
    const next = goals.includes(goal)
      ? goals.filter(g => g !== goal)
      : [...goals, goal];
    setGoals(next);
    onImmediate({ training_goals: next });
  };

  return (
    <div className="space-y-6">
      {/* Livello runner */}
      <Field label="Livello runner">
        <div className="grid grid-cols-2 gap-2">
          {RUNNER_LEVELS.map(l => (
            <button
              key={l.value}
              onClick={() => { setLevel(l.value); onImmediate({ runner_level: l.value }); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                level === l.value
                  ? 'border-hiko-primary bg-hiko-primary/15 text-white'
                  : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <p className="text-sm font-semibold">{l.label}</p>
              <p className="text-xs text-white/40 mt-0.5">{l.sub}</p>
            </button>
          ))}
        </div>
      </Field>

      {/* Obiettivi */}
      <Field label="Obiettivi di allenamento">
        <div className="flex flex-wrap gap-2">
          {TRAINING_GOALS.map(goal => (
            <button
              key={goal}
              onClick={() => toggleGoal(goal)}
              aria-pressed={goals.includes(goal)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                goals.includes(goal)
                  ? 'bg-hiko-primary text-hiko-deep border-hiko-primary'
                  : 'bg-white/5 text-white/60 border-white/15 hover:bg-white/10'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </Field>

      {/* Frequenza allenamento */}
      <Field label={`Frequenza settimanale — ${freq} ${freq === 1 ? 'giorno' : 'giorni'}`}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 w-4">1</span>
          <Slider
            min={1}
            max={7}
            step={1}
            value={[freq]}
            onValueChange={([v]) => { setFreq(v); onChange({ weekly_frequency: v }); }}
            className="flex-1 [&_.bg-primary]:bg-hiko-primary [&_.bg-primary\/20]:bg-white/10 [&_.border-primary\/50]:border-hiko-primary/50 [&_.bg-background]:bg-hiko-deep"
            aria-label="Frequenza allenamento settimanale"
          />
          <span className="text-xs text-white/40 w-4">7</span>
        </div>
      </Field>

      {/* Distanza tipica */}
      <Field label="Distanza tipica per uscita">
        <div className="grid grid-cols-4 gap-2">
          {TYPICAL_DISTANCES.map(d => (
            <button
              key={d.value}
              onClick={() => { setDist(d.value); onImmediate({ typical_distance: d.value }); }}
              className={`py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                dist === d.value
                  ? 'border-hiko-primary bg-hiko-primary/15 text-hiko-primary'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        {/* Passo medio target */}
        <Field label="Passo target (min/km)">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-white/30 shrink-0" />
            <input
              type="text"
              value={pace}
              placeholder="5:30"
              aria-label="Passo medio target in minuti per chilometro"
              aria-invalid={paceError}
              className={`${inputCls} ${paceError ? 'border-red-500/60' : ''}`}
              onChange={e => {
                const v = e.target.value;
                setPace(v);
                const sec = mmSsToSec(v);
                if (v === '') {
                  setPaceError(false);
                  onChange({ target_pace_sec: null });
                } else if (sec !== null) {
                  setPaceError(false);
                  onChange({ target_pace_sec: sec });
                } else {
                  setPaceError(true);
                }
              }}
            />
          </div>
          {paceError && <p className="text-[10px] text-red-400">Formato: m:ss (es. 5:30)</p>}
        </Field>

        {/* FC max */}
        <Field label="FC massima (bpm)">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-white/30 shrink-0" />
            <input
              type="number"
              value={hr}
              min={100}
              max={250}
              placeholder="185"
              aria-label="Frequenza cardiaca massima in battiti per minuto"
              className={inputCls}
              onChange={e => {
                setHr(e.target.value);
                onChange({ max_heart_rate: e.target.value ? Number(e.target.value) : null });
              }}
            />
          </div>
        </Field>
      </div>

      <p className="text-xs text-white/30 flex items-center gap-1">
        <TrendingUp size={11} />
        Se non inserisci la FC max, verrà stimata con la formula 220 − età.
      </p>
    </div>
  );
}
