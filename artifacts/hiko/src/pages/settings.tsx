import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, User, Target, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { RunningExperienceSettings } from '@/components/settings/RunningExperienceSettings';

type Section = 'profile' | 'running';

const SECTIONS: { key: Section; icon: typeof User; label: string }[] = [
  { key: 'profile', icon: User,   label: 'Profilo Runner' },
  { key: 'running', icon: Target, label: 'Esperienza di Corsa' },
];

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const user = useAuthStore(s => s.user);
  const [section, setSection] = useState<Section>('profile');

  const {
    profile,
    isLoading,
    debouncedSave,
    immediateSave,
    completion1,
    completionTotal,
  } = useProfileSettings();

  if (!user) {
    setLocation('/profile');
    return null;
  }

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-hiko-deep/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setLocation('/profile')}
          aria-label="Torna al profilo"
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Impostazioni</h1>
        {isLoading && <Loader2 size={16} className="text-hiko-primary animate-spin ml-auto" />}
      </div>

      {/* Tab selector */}
      <div className="px-4 pt-4 pb-2">
        <div className="glass-panel p-1 rounded-xl flex">
          {SECTIONS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                section === key
                  ? 'bg-hiko-primary text-hiko-deep'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span className="hidden xs:inline">{label}</span>
              <span className="xs:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="text-hiko-primary animate-spin" />
          </div>
        ) : section === 'profile' ? (
          <ProfileSettings
            profile={profile}
            completion={completion1}
            completionTotal={completionTotal}
            onChange={debouncedSave}
            onImmediate={immediateSave}
          />
        ) : (
          <RunningExperienceSettings
            profile={profile}
            onChange={debouncedSave}
            onImmediate={immediateSave}
          />
        )}
      </div>
    </div>
  );
}
