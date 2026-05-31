import { useState, useEffect, useRef } from 'react';
import { Camera, User, MapPin, Calendar, Ruler, Weight, FileText } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAuthStore } from '@/store/useAuthStore';
import type { ProfileData } from '@/hooks/useProfileSettings';

interface Props {
  profile: ProfileData;
  completion: number;
  completionTotal: number;
  onChange: (patch: Partial<ProfileData>) => void;
  onImmediate: (patch: Partial<ProfileData>) => void;
}

const GENDER_OPTIONS = [
  { value: 'uomo', label: 'Uomo' },
  { value: 'donna', label: 'Donna' },
  { value: 'non_specificato', label: 'Preferisco non dirlo' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-hiko-primary/60 transition-colors';

export function ProfileSettings({ profile, completion, completionTotal, onChange, onImmediate }: Props) {
  const user = useAuthStore(s => s.user);
  const avatarUpload = useImageUpload('avatars');

  // Local form state
  const [nome, setNome] = useState(profile.nome);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '');
  const [gender, setGender] = useState(profile.gender ?? '');
  const [heightCm, setHeightCm] = useState(profile.height_cm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(profile.weight_kg?.toString() ?? '');

  // Sync quando il profilo viene caricato dal DB
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    setNome(profile.nome || '');
    setBio(profile.bio ?? '');
    setCity(profile.city ?? '');
    setBirthDate(profile.birth_date ?? '');
    setGender(profile.gender ?? '');
    setHeightCm(profile.height_cm?.toString() ?? '');
    setWeightKg(profile.weight_kg?.toString() ?? '');
    synced.current = true;
  }, [profile]);

  const pct = Math.round((completion / completionTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Indicatore completamento */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-white/70">Profilo completato</span>
          <span className="text-sm font-bold text-hiko-primary">{completion}/{completionTotal} campi</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-hiko-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Avatar */}
      <Field label="Foto profilo">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              ref={avatarUpload.inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Carica foto profilo"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !user) return;
                const url = await avatarUpload.handleFile(file, user.id);
                if (url) onImmediate({ avatar_url: url });
              }}
            />
            <button
              onClick={avatarUpload.open}
              className="relative group w-16 h-16 rounded-full overflow-hidden border-2 border-hiko-primary/50 hover:border-hiko-primary transition-colors"
              aria-label="Cambia foto profilo"
            >
              {(profile.avatar_url || avatarUpload.preview)
                ? <img src={avatarUpload.preview ?? profile.avatar_url!} alt="Avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-hiko-primary/20 flex items-center justify-center text-hiko-primary text-2xl font-bold">
                    {nome[0]?.toUpperCase() ?? <User size={24} />}
                  </div>
              }
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={18} className="text-white" />
              </div>
            </button>
          </div>
          <div className="text-xs text-white/40">
            <p>JPG, PNG, WebP</p>
            <p>Max 5 MB</p>
          </div>
        </div>
      </Field>

      {/* Nome */}
      <Field label="Nome visualizzato">
        <div className="flex items-center gap-2">
          <User size={16} className="text-white/30 shrink-0" />
          <input
            type="text"
            value={nome}
            maxLength={50}
            placeholder="Il tuo nome nella community"
            aria-label="Nome visualizzato"
            className={inputCls}
            onChange={e => { setNome(e.target.value); onChange({ nome: e.target.value }); }}
          />
        </div>
      </Field>

      {/* Bio */}
      <Field label="Biografia">
        <div className="relative">
          <textarea
            value={bio}
            maxLength={160}
            rows={3}
            placeholder="Raccontati in breve..."
            aria-label="Biografia"
            className={`${inputCls} resize-none`}
            onChange={e => { setBio(e.target.value); onChange({ bio: e.target.value || null }); }}
          />
          <span className="absolute bottom-2 right-3 text-[10px] text-white/30">{bio.length}/160</span>
        </div>
      </Field>

      {/* Città */}
      <Field label="Città / Zona">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-white/30 shrink-0" />
          <input
            type="text"
            value={city}
            placeholder="Milano, Roma, Torino..."
            aria-label="Città o zona"
            className={inputCls}
            onChange={e => { setCity(e.target.value); onChange({ city: e.target.value || null }); }}
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        {/* Data di nascita */}
        <Field label="Data di nascita">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-white/30 shrink-0" />
            <input
              type="date"
              value={birthDate}
              aria-label="Data di nascita"
              className={`${inputCls} [color-scheme:dark]`}
              onChange={e => { setBirthDate(e.target.value); onChange({ birth_date: e.target.value || null }); }}
            />
          </div>
        </Field>

        {/* Sesso */}
        <Field label="Sesso">
          <select
            value={gender}
            aria-label="Sesso"
            className={inputCls}
            onChange={e => { setGender(e.target.value); onImmediate({ gender: e.target.value || null }); }}
          >
            <option value="">Seleziona</option>
            {GENDER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Altezza */}
        <Field label="Altezza (cm)">
          <div className="flex items-center gap-2">
            <Ruler size={16} className="text-white/30 shrink-0" />
            <input
              type="number"
              value={heightCm}
              min={100}
              max={250}
              placeholder="175"
              aria-label="Altezza in centimetri"
              className={inputCls}
              onChange={e => { setHeightCm(e.target.value); onChange({ height_cm: e.target.value ? Number(e.target.value) : null }); }}
            />
          </div>
        </Field>

        {/* Peso */}
        <Field label="Peso (kg)">
          <div className="flex items-center gap-2">
            <Weight size={16} className="text-white/30 shrink-0" />
            <input
              type="number"
              value={weightKg}
              min={30}
              max={300}
              step={0.5}
              placeholder="70"
              aria-label="Peso in chilogrammi"
              className={inputCls}
              onChange={e => { setWeightKg(e.target.value); onChange({ weight_kg: e.target.value ? Number(e.target.value) : null }); }}
            />
          </div>
        </Field>
      </div>
      <p className="text-xs text-white/30 flex items-center gap-1">
        <FileText size={11} /> Data di nascita, sesso, altezza e peso non vengono mostrati pubblicamente.
      </p>
    </div>
  );
}
