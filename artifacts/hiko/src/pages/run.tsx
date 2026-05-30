import { useEffect, useState, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useRunStore } from '@/store/useRunStore';
import { useRoutes } from '@/hooks/useRoutes';
import type { Route } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSaveRun } from '@/hooks/useRuns';
import { useGeolocation } from '@/hooks/useGeolocation';
import MapView from '@/components/MapView';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Trophy, FastForward, Activity, Navigation,
  CheckCircle, AlertCircle, Loader2, Play, MapPin,
} from 'lucide-react';
import { bearing, distanceM, nearestWaypointIndex, fmtDist, bearingLabel } from '@/lib/geo';

const ON_ROUTE_THRESHOLD_M = 80;

type Phase = 'ready' | 'running';

const formatTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

const formatPace = (sec: number) => {
  if (!sec || !isFinite(sec)) return '--:--';
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
};

export default function RunSession() {
  const { routeId } = useParams();
  const [, setLocation] = useLocation();
  const { data: routes = [] } = useRoutes();
  const { isTracking, elapsedTime, distance, currentPace, startRun, endRun, tick, updateMetrics } = useRunStore();
  const user = useAuthStore(s => s.user);
  const openAuthModal = useAuthStore(s => s.openAuthModal);
  const saveRun = useSaveRun();

  const [route, setRoute] = useState<Route | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [nextWpIdx, setNextWpIdx] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastPosRef = useRef<[number, number] | null>(null);
  const nextWpRef = useRef(0);
  const waypointsRef = useRef<[number, number][]>([]);

  // GPS sempre attivo sulla pagina
  const { pos: geoPos, error: geoError } = useGeolocation(true);

  // Auth guard
  useEffect(() => {
    if (!user) {
      openAuthModal('Accedi per iniziare a correre.', () => {
        if (routeId) setLocation(`/run/${routeId}`);
      });
      setLocation('/');
    }
  }, []); // eslint-disable-line

  // Carica route
  useEffect(() => {
    if (!routeId || !user) return;
    const r = routes.find(r => r.id === routeId);
    if (r) {
      setRoute(r);
      waypointsRef.current = r.waypoints as [number, number][];
    }
  }, [routeId, routes]); // eslint-disable-line

  // Pulisce lo store solo all'unmount (non ad ogni re-render)
  useEffect(() => () => endRun(), []); // eslint-disable-line

  // Aggiorna posizione GPS e calcola distanza percorsa (solo durante corsa)
  useEffect(() => {
    if (!geoPos) return;
    if (phase === 'running' && lastPosRef.current) {
      const moved = distanceM(lastPosRef.current, geoPos);
      if (moved > 3 && moved < 200) { // filtra rumore e salti GPS anomali
        updateMetrics(moved / 1000);
      }
      // Avanza waypoint di destinazione se raggiunto
      const wps = waypointsRef.current;
      const idx = nextWpRef.current;
      if (idx < wps.length && distanceM(geoPos, wps[idx]) < 30) {
        nextWpRef.current = idx + 1;
        setNextWpIdx(idx + 1);
      }
    }
    lastPosRef.current = geoPos;
    setUserPos(geoPos);
  }, [geoPos, phase, updateMetrics]);

  // Timer — solo durante corsa
  useEffect(() => {
    if (phase !== 'running') return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, tick]);

  // Voice guidance
  useEffect(() => {
    if (phase !== 'running') return;
    const messages = [
      'Mantieni il ritmo!',
      'Respira in modo regolare.',
      'Sei sulla strada giusta.',
      'Continua così!',
      'A metà percorso!',
    ];
    const interval = setInterval(() => {
      setToastMessage(messages[Math.floor(Math.random() * messages.length)]);
      setTimeout(() => setToastMessage(null), 4000);
    }, 20000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleStart = () => {
    if (!route) return;
    lastPosRef.current = geoPos ?? null;
    // Cerca il waypoint più vicino alla posizione attuale come punto di partenza
    const wps = waypointsRef.current;
    if (geoPos && wps.length > 0) {
      const nearest = nearestWaypointIndex(geoPos, wps);
      nextWpRef.current = nearest;
      setNextWpIdx(nearest);
    } else {
      nextWpRef.current = 0;
      setNextWpIdx(0);
    }
    startRun(route.id);
    setPhase('running');
  };

  if (!route) return null;

  const mapCenter: [number, number] = userPos ?? (route.waypoints[0] as [number, number]) ?? route.center;
  const wps = waypointsRef.current;
  const targetWp = wps[Math.min(nextWpIdx, wps.length - 1)];
  const dirBearing = targetWp && userPos ? bearing(userPos, targetWp) : 0;
  const dirDist = targetWp && userPos ? distanceM(userPos, targetWp) : 0;
  const nearestIdx = userPos ? nearestWaypointIndex(userPos, wps) : 0;
  const nearestDist = userPos && wps[nearestIdx] ? distanceM(userPos, wps[nearestIdx]) : 999;
  const isOnRoute = nearestDist < ON_ROUTE_THRESHOLD_M;
  const isFinished = nextWpIdx >= wps.length && wps.length > 0;

  /* ── FASE READY ───────────────────────────────────────────────── */
  if (phase === 'ready') {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-hiko-deep text-white">
        {/* Mappa con il percorso */}
        <div className="absolute inset-0 z-0 opacity-85">
          <MapView
            center={mapCenter}
            zoom={15}
            activeRoute={route}
            userPos={userPos ?? undefined}
            interactive={false}
            showRouteEndpoints
          />
        </div>

        {/* Back button */}
        <button
          onClick={() => setLocation('/routes')}
          className="absolute top-12 left-4 z-10 glass-panel p-3 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={22} />
        </button>

        {/* GPS status */}
        <div className="absolute top-12 right-4 z-10">
          {geoPos ? (
            <div className="glass-panel px-3 py-2 rounded-full flex items-center gap-2 text-hiko-primary text-xs font-bold">
              <MapPin size={13} /> GPS OK
            </div>
          ) : geoError ? (
            <div className="glass-panel px-3 py-2 rounded-full text-red-400 text-xs font-bold">
              GPS non disponibile
            </div>
          ) : (
            <div className="glass-panel px-3 py-2 rounded-full text-white/50 text-xs flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" /> Acquisizione GPS…
            </div>
          )}
        </div>

        {/* Card percorso + START */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-10 bg-gradient-to-t from-hiko-deep via-hiko-deep/90 to-transparent">
          <div className="glass-panel rounded-3xl p-5 mb-4 border border-white/10">
            <h2 className="text-lg font-bold mb-1">{route.name}</h2>
            <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
              <span>{route.distance} km</span>
              <span>+{route.elevation} m</span>
              <span className={`capitalize font-medium ${
                route.difficulty === 'easy' ? 'text-hiko-primary' :
                route.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'
              }`}>{route.difficulty}</span>
            </div>
            {!geoPos && (
              <p className="text-xs text-white/40 mb-3">
                Puoi avviare la corsa anche senza GPS. La distanza verrà stimata.
              </p>
            )}
            <button
              onClick={handleStart}
              className="w-full bg-hiko-primary text-hiko-deep font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-hiko-primary/90 transition-colors text-lg"
            >
              <Play size={22} className="fill-hiko-deep" />
              AVVIA CORSA
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FASE RUNNING ─────────────────────────────────────────────── */
  return (
    <div className="relative w-full h-screen overflow-hidden bg-hiko-deep text-white">
      {/* Mappa */}
      <div className="absolute inset-0 z-0 opacity-80">
        <MapView
          center={userPos ?? mapCenter}
          zoom={16}
          activeRoute={route}
          userPos={userPos ?? undefined}
          interactive={false}
          showRouteEndpoints
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-12 flex justify-between items-center pointer-events-none">
        <button
          onClick={() => setShowEndModal(true)}
          className="glass-panel p-3 rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto"
        >
          <X size={22} />
        </button>
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-hiko-primary animate-pulse" />
          <span className="text-sm font-bold text-hiko-primary tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Pannello direzione */}
      {userPos && (
        <div className="absolute top-28 left-4 right-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-4"
          >
            <div
              className="w-11 h-11 rounded-full bg-hiko-primary/20 border border-hiko-primary/40 flex items-center justify-center flex-shrink-0"
              style={{ transform: `rotate(${dirBearing}deg)` }}
            >
              <Navigation size={22} className="text-hiko-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 uppercase tracking-wider font-medium">
                {isFinished ? 'Arrivo raggiunto!' : `Vai verso ${bearingLabel(dirBearing)}`}
              </p>
              <p className="text-base font-bold text-white">
                {isFinished ? '🏁 Ottimo lavoro!' : fmtDist(dirDist)}
                {!isFinished && <span className="text-sm font-normal text-white/50"> al prossimo punto</span>}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 ${
              isOnRoute
                ? 'bg-hiko-primary/20 text-hiko-primary border border-hiko-primary/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {isOnRoute ? <><CheckCircle size={13} /> Sul percorso</> : <><AlertCircle size={13} /> Fuori percorso</>}
            </div>
          </motion.div>
        </div>
      )}

      {/* No GPS warning */}
      {!userPos && (
        <div className="absolute top-28 left-4 right-4 z-10">
          <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 border border-yellow-500/30">
            <Loader2 size={18} className="text-yellow-400 animate-spin flex-shrink-0" />
            <p className="text-sm text-yellow-300">In attesa del segnale GPS…</p>
          </div>
        </div>
      )}

      {/* Toast guidance */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-52 left-1/2 z-20 glass-panel px-5 py-2.5 rounded-2xl flex items-center gap-3"
          >
            <Activity size={16} className="text-hiko-primary" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD metriche */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-12 bg-gradient-to-t from-hiko-deep via-hiko-deep/80 to-transparent">
        <div className="text-center mb-6">
          <p className="text-[5rem] leading-none font-bold tracking-tighter text-white mb-2"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(elapsedTime)}
          </p>
          <p className="text-hiko-primary font-medium tracking-widest uppercase text-sm">Tempo</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center">
            <p className="text-3xl font-bold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {distance.toFixed(2)}
            </p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Chilometri</p>
          </div>
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center">
            <p className="text-3xl font-bold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatPace(currentPace)}
            </p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Passo medio</p>
          </div>
        </div>
      </div>

      {/* Modal fine corsa */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-hiko-deep/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-hiko-primary/20 blur-[50px] rounded-full" />
              <div className="text-center mb-8 relative z-10">
                <div className="w-16 h-16 bg-hiko-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-hiko-primary/50">
                  <Trophy className="text-hiko-primary" size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Corsa completata!</h2>
                <p className="text-white/60">{route.name}</p>
              </div>
              <div className="space-y-4 mb-8 relative z-10">
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Distanza</p>
                    <p className="text-2xl font-bold">{distance.toFixed(2)} <span className="text-base text-white/50">km</span></p>
                  </div>
                  {distance >= route.distance * 0.9 && (
                    <div className="text-hiko-primary text-sm flex items-center gap-1">
                      <FastForward size={14} /> Percorso completato
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Tempo</p>
                    <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Passo medio</p>
                    <p className="text-2xl font-bold">{formatPace(currentPace)} <span className="text-base text-white/50">/km</span></p>
                  </div>
                </div>
              </div>
              {saveError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm relative z-10">
                  {saveError}
                </div>
              )}
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setSaveError(null);
                  const result = await saveRun({
                    distanza_km: Math.round(distance * 1000) / 1000,
                    durata_sec: elapsedTime,
                    pace_medio: Math.round(currentPace),
                    route_id: route?.id ?? null,
                  });
                  setSaving(false);
                  if (!result.ok) {
                    setSaveError(result.error ?? 'Errore nel salvataggio');
                    return;
                  }
                  endRun();
                  setLocation('/');
                }}
                className="w-full bg-hiko-primary text-hiko-deep font-bold py-4 rounded-xl hover:bg-hiko-primary/90 transition-colors relative z-10 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                Salva e continua
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
