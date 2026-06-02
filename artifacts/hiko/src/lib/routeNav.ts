import type { Route } from '@/store/useDataStore';

// Apre le indicazioni stradali (Google Maps) verso il punto di partenza del percorso.
// Su mobile lancia l'app mappe, su desktop apre il sito in una nuova scheda.
export function openDirections(route: Route) {
  const start = route.waypoints[0] ?? route.center;
  const [lat, lng] = start;
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  );
}
