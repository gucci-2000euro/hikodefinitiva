import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Route } from '@/store/useDataStore';

export function useRoutes() {
  return useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('routes')
        .select('*')
        .order('created_at');
      return (data ?? []).map(r => ({
        id: r.id,
        name: r.nome,
        distance: Number(r.distanza_km),
        elevation: r.elevazione,
        difficulty: r.difficolta as Route['difficulty'],
        terrain: r.terreno as Route['terrain'],
        bestTime: r.best_time,
        activeRunners: 0,
        center: r.centro as [number, number],
        waypoints: r.waypoints as [number, number][],
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
