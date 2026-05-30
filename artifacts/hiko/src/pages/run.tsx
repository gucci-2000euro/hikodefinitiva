import { useEffect, useState, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useRunStore } from '@/store/useRunStore';
import { useDataStore, Route } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSaveRun } from '@/hooks/useRuns';
import MapView from '@/components/MapView';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, FastForward, Activity, Navigation, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { bearing, distanceM, generateLoop, nearestWaypointIndex, fmtDist, bearingLabel } from '@/lib/geo';

const USER_START: [number, number] = [41.3851, 2.1734];
const ON_ROUTE_THRESHOLD_M = 60;

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatPace = (paceSecs: number) => {
  if (paceSecs === 0 || !isFinite(paceSecs)) return '--:--';
  const m = Math.floor(paceSecs / 60);
  const s = Math.floor(paceSecs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Build a route that always starts and ends at the user's position. */
function buildRunRoute(route: Route): [number, number][] {
  const wps = route.waypoints as [number, number][];
  if (wps.length < 2) return generateLoop(USER_START, 0.8, 14);
  // Prepend user position, append it as the finish
  return [USER_START, ...wps, USER_START];
}

export default function RunSession() {
  const { routeId } = useParams();
  const [, setLocation] = useLocation();
  const { routes } = useDataStore();
  const { isTracking, elapsedTime, distance, currentPace, startRun, endRun, tick, updateMetrics } = useRunStore();
  const user = useAuthStore(s => s.user);
  const openAuthModal = useAuthStore(s => s.openAuthModal);
  const saveRun = useSaveRun();

  const [route, setRoute] = useState<Route | null>(null);
  const [runWaypoints, setRunWaypoints] = useState<[number, number][]>([]);
  const [userPos, setUserPos] = useState<[number, number]>(USER_START);
  const [nextWpIdx, setNextWpIdx] = useState(1);
  const [showEndModal, setShowEndModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const posRef = useRef<[number, number]>(USER_START);
  const nextWpRef = useRef(1);

  // Auth guard
  useEffect(() => {
    if (!user) {
      openAuthModal('Sign in to start tracking your run.', () => {
        if (routeId) setLocation(`/run/${routeId}`);
      });
      setLocation('/');
    }
  }, []);  // eslint-disable-line

  // Load route
  useEffect(() => {
    if (!routeId || !user) return;
    const r = routes.find(r => r.id === routeId);
    if (r) {
      const wps = buildRunRoute(r);
      setRoute(r);
      setRunWaypoints(wps);
      setUserPos(USER_START);
      posRef.current = USER_START;
      setNextWpIdx(1);
      nextWpRef.current = 1;
      startRun(r.id);
    }
    return () => endRun();
  }, [routeId, routes]);  // eslint-disable-line

  // Timer + metric tick
  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      tick();
      updateMetrics(0.012);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking, tick, updateMetrics]);

  // Simulate movement along waypoints
  useEffect(() => {
    if (!isTracking || runWaypoints.length < 2) return;
    const interval = setInterval(() => {
      const current = posRef.current;
      const idx = nextWpRef.current;
      if (idx >= runWaypoints.length) return;

      const target = runWaypoints[idx];
      const dist = distanceM(current, target);

      if (dist < 30) {
        // Advance to next waypoint
        const newIdx = idx + 1;
        nextWpRef.current = newIdx;
        setNextWpIdx(newIdx);
        setUserPos(target);
        posRef.current = target;
      } else {
        // Move 15m toward target
        const brg = bearing(current, target);
        const stepM = 18;
        const latDelta = (stepM / 111320) * Math.cos(brg * Math.PI / 180);
        const lngDelta = (stepM / (111320 * Math.cos(current[0] * Math.PI / 180))) * Math.sin(brg * Math.PI / 180);
        const newPos: [number, number] = [current[0] + latDelta, current[1] + lngDelta];
        posRef.current = newPos;
        setUserPos(newPos);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isTracking, runWaypoints]);

  // Voice guidance toasts
  useEffect(() => {
    if (!isTracking) return;
    const messages = [
      'Maintain your pace.',
      '1.2 km to next checkpoint.',
      "You're ahead of your record.",
      'Keep breathing steady.',
      'Halfway there!'
    ];
    const interval = setInterval(() => {
      setToastMessage(messages[Math.floor(Math.random() * messages.length)]);
      setTimeout(() => setToastMessage(null), 4000);
    }, 15000);
    return () => clearInterval(interval);
  }, [isTracking]);

  if (!route) return null;

  // Direction info
  const targetWp = runWaypoints[Math.min(nextWpIdx, runWaypoints.length - 1)];
  const dirBearing = targetWp ? bearing(userPos, targetWp) : 0;
  const dirDist = targetWp ? distanceM(userPos, targetWp) : 0;
  const nearestIdx = nearestWaypointIndex(userPos, runWaypoints);
  const nearestDist = runWaypoints[nearestIdx] ? distanceM(userPos, runWaypoints[nearestIdx]) : 0;
  const isOnRoute = nearestDist < ON_ROUTE_THRESHOLD_M;
  const isFinished = nextWpIdx >= runWaypoints.length;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-hiko-deep text-white">
      {/* Map — full bleed with route */}
      <div className="absolute inset-0 z-0 opacity-80">
        <MapView
          center={route.center}
          zoom={16}
          activeRoute={{ ...route, waypoints: runWaypoints }}
          userPos={userPos}
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

      {/* Direction Panel — below challenge indicator area */}
      <div className="absolute top-28 left-4 right-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-4"
        >
          {/* Bearing Arrow */}
          <div
            className="w-11 h-11 rounded-full bg-hiko-primary/20 border border-hiko-primary/40 flex items-center justify-center flex-shrink-0"
            style={{ transform: `rotate(${dirBearing}deg)` }}
          >
            <Navigation size={22} className="text-hiko-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50 uppercase tracking-wider font-medium">
              {isFinished ? 'Finish line ahead' : `Head ${bearingLabel(dirBearing)}`}
            </p>
            <p className="text-base font-bold text-white">
              {isFinished ? 'Return to start' : fmtDist(dirDist)}
              {' '}
              <span className="text-sm font-normal text-white/50">to next point</span>
            </p>
          </div>

          {/* On/Off Route badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 ${
            isOnRoute
              ? 'bg-hiko-primary/20 text-hiko-primary border border-hiko-primary/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {isOnRoute
              ? <><CheckCircle size={13} /> On route</>
              : <><AlertCircle size={13} /> Off route</>
            }
          </div>
        </motion.div>
      </div>

      {/* Voice Guidance Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-52 left-1/2 z-20 glass-panel px-5 py-2.5 rounded-2xl flex items-center gap-3 border-hiko-primary/30"
          >
            <Activity size={16} className="text-hiko-primary" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom HUD */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-12 bg-gradient-to-t from-hiko-deep via-hiko-deep/80 to-transparent">
        <div className="text-center mb-6">
          <p
            className="text-[5rem] leading-none font-bold tracking-tighter text-white mb-2"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatTime(elapsedTime)}
          </p>
          <p className="text-hiko-primary font-medium tracking-widest uppercase text-sm">Time</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center">
            <p className="text-3xl font-bold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {distance.toFixed(2)}
            </p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Kilometres</p>
          </div>
          <div className="glass-panel rounded-2xl p-4 flex flex-col items-center">
            <p className="text-3xl font-bold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatPace(currentPace)}
            </p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Avg Pace</p>
          </div>
        </div>
      </div>

      {/* End Run Modal */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-hiko-deep/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-hiko-primary/20 blur-[50px] rounded-full" />

              <div className="text-center mb-8 relative z-10">
                <div className="w-16 h-16 bg-hiko-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-hiko-primary/50">
                  <Trophy className="text-hiko-primary" size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Run Completed</h2>
                <p className="text-white/60">{route.name}</p>
              </div>

              <div className="space-y-4 mb-8 relative z-10">
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Distance</p>
                    <p className="text-2xl font-bold">
                      {distance.toFixed(2)} <span className="text-base text-white/50">km</span>
                    </p>
                  </div>
                  <div className="text-hiko-primary text-sm flex items-center gap-1">
                    <FastForward size={14} /> Personal Best
                  </div>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Time</p>
                    <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Avg Pace</p>
                    <p className="text-2xl font-bold">
                      {formatPace(currentPace)} <span className="text-base text-white/50">/km</span>
                    </p>
                  </div>
                </div>
              </div>

              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await saveRun({
                    distanza_km: Math.round(distance * 1000) / 1000,
                    durata_sec: elapsedTime,
                    pace_medio: Math.round(currentPace),
                    route_id: route?.id ?? null,
                  });
                  setSaving(false);
                  endRun();
                  setLocation('/');
                }}
                className="w-full bg-hiko-primary text-hiko-deep font-bold py-4 rounded-xl hover:bg-hiko-primary/90 transition-colors relative z-10 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                Save &amp; Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
