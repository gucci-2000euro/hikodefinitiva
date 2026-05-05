/** Bearing in degrees (0=N, 90=E, 180=S, 270=W) from point a to point b */
export function bearing(a: [number, number], b: [number, number]): number {
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Haversine distance in metres between two lat/lng points */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const c = s1 * s1 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

/** Generate a roughly circular route around a centre point. */
export function generateLoop(
  center: [number, number],
  radiusKm: number,
  numPoints = 16
): [number, number][] {
  const latDeg = radiusKm / 111.32;
  const lngDeg = radiusKm / (111.32 * Math.cos(center[0] * Math.PI / 180));
  const pts: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI - Math.PI / 2;
    pts.push([
      center[0] + latDeg * Math.cos(angle),
      center[1] + lngDeg * Math.sin(angle),
    ]);
  }
  return pts;
}

/** Find the nearest waypoint index in a sequence from a given position. */
export function nearestWaypointIndex(pos: [number, number], waypoints: [number, number][]): number {
  let best = 0;
  let bestDist = Infinity;
  waypoints.forEach((wp, i) => {
    const d = distanceM(pos, wp);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

/** Format metres into a readable string */
export function fmtDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Bearing to a cardinal/intercardinal label */
export function bearingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}
