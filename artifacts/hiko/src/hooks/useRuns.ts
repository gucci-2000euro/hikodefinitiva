import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { Run } from '@/types/index';

export function useRuns(limit = 50) {
  const user = useAuthStore(s => s.user);
  return useQuery<Run[]>({
    queryKey: ['runs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data ?? []) as Run[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useSaveRun() {
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const updateProfile = useAuthStore(s => s.updateProfile);

  return async (run: {
    distanza_km: number;
    durata_sec: number;
    pace_medio: number;
    route_id?: string | null;
    waypoints?: { lat: number; lng: number }[];
  }) => {
    if (!user) return null;
    const { data, error } = await supabase.from('runs').insert({
      user_id: user.id,
      route_id: run.route_id ?? null,
      distanza_km: run.distanza_km,
      durata_sec: run.durata_sec,
      pace_medio: run.pace_medio,
      waypoints: run.waypoints ?? null,
      completata: true,
    }).select().single();

    if (!error) {
      // aggiorna stats locali ottimisticamente (il trigger aggiorna anche il DB)
      updateProfile({
        totalKm: (user.totalKm ?? 0) + run.distanza_km,
        totalRuns: (user.totalRuns ?? 0) + 1,
      });
      queryClient.invalidateQueries({ queryKey: ['runs', user.id] });
    }
    return error ? null : data as Run;
  };
}
