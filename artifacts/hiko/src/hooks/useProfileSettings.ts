import { useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/hooks/use-toast';

export interface ProfileData {
  nome: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  runner_level: string;
  training_goals: string[];
  weekly_frequency: number;
  typical_distance: string;
  target_pace_sec: number | null;
  max_heart_rate: number | null;
}

const PROFILE_DEFAULTS: ProfileData = {
  nome: '',
  avatar_url: null,
  bio: null,
  city: null,
  birth_date: null,
  gender: null,
  height_cm: null,
  weight_kg: null,
  runner_level: 'principiante',
  training_goals: [],
  weekly_frequency: 3,
  typical_distance: '5-10km',
  target_pace_sec: null,
  max_heart_rate: null,
};

const PROFILE_SELECT = [
  'nome', 'avatar_url', 'bio', 'city', 'birth_date', 'gender',
  'height_cm', 'weight_kg', 'runner_level', 'training_goals',
  'weekly_frequency', 'typical_distance', 'target_pace_sec', 'max_heart_rate',
].join(', ');

// Campi che contano per il completamento profilo (sezione 1)
const COMPLETION_FIELDS_1: (keyof ProfileData)[] = [
  'nome', 'avatar_url', 'bio', 'city', 'birth_date', 'gender', 'height_cm', 'weight_kg',
];

export function useProfileSettings() {
  const user = useAuthStore(s => s.user);
  const updateProfileStore = useAuthStore(s => s.updateProfile);
  const queryClient = useQueryClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savingRef = useRef(false);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile-settings', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', user!.id)
        .maybeSingle();
      if (!data) return { ...PROFILE_DEFAULTS };
      return { ...PROFILE_DEFAULTS, ...(data as unknown as Record<string, unknown>) } as ProfileData;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const save = useCallback(async (patch: Partial<ProfileData>) => {
    if (!user || savingRef.current) return;
    savingRef.current = true;
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    savingRef.current = false;

    if (error) {
      toast({ title: 'Errore nel salvataggio — riprova', variant: 'destructive' });
    } else {
      toast({ title: 'Impostazioni salvate' });
      queryClient.invalidateQueries({ queryKey: ['profile-settings', user.id] });
      // Aggiorna anche lo store auth per nome e avatar
      if (patch.nome !== undefined) updateProfileStore({ name: patch.nome });
      if (patch.avatar_url !== undefined) updateProfileStore({ avatar: patch.avatar_url ?? '' });
    }
  }, [user, queryClient, updateProfileStore]);

  // Aggiornamento con debounce 1000ms
  const debouncedSave = useCallback((patch: Partial<ProfileData>) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(patch), 1000);
  }, [save]);

  // Salvataggio immediato (es. per toggle multi-select)
  const immediateSave = useCallback((patch: Partial<ProfileData>) => {
    clearTimeout(saveTimer.current);
    save(patch);
  }, [save]);

  // Completamento sezione 1
  const completion1 = profile
    ? COMPLETION_FIELDS_1.filter(f => {
        const v = profile[f];
        return v !== null && v !== '' && v !== undefined;
      }).length
    : 0;
  const completionTotal = COMPLETION_FIELDS_1.length; // 8

  return {
    profile: profile ?? PROFILE_DEFAULTS,
    isLoading,
    debouncedSave,
    immediateSave,
    completion1,
    completionTotal,
  };
}
