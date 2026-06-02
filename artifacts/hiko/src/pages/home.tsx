import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore, Route } from '@/store/useDataStore';
import { useRoutes } from '@/hooks/useRoutes';
import MapView from '@/components/MapView';
import UserLocationMarker from '@/components/UserLocationMarker';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Logo } from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { LocateFixed, Play, Navigation, Users, Zap, MapPin, X, Eye, ArrowLeft } from 'lucide-react';
import { MapStyleButton } from '@/components/MapStyleButton';
import { useMapIsDark, mapPanel } from '@/store/useMapStore';
import { RoutePreviewModal } from '@/components/route/RoutePreviewModal';
import { openDirections } from '@/lib/routeNav';

const LOCATION_PREF_KEY = 'hiko_location_consent';

// Europa dall'alto — vista iniziale prima del fix GPS
const EUROPE_CENTER: [number, number] = [54.0, 13.0];

// Sopravvive ai remount di Home, si resetta solo al reload della pagina.
// Null = prima apertura assoluta → mostra Europa → zoom su GPS.
// Valorizzato = ripristina esattamente la vista lasciata dall'utente.
let savedView: { center: [number, number]; zoom: number } | null = null;

export default function Home() {
  const [, setLocation] = useLocation();
  const user = useAuthStore(state => state.user);
  const requireAuth = useAuthStore(state => state.requireAuth);
  const { runners } = useDataStore();
  const { data: routes = [] } = useRoutes();
  const isDark = useMapIsDark();
  
  // Se l'URL è /routes/:id, pre-selezioniamo quel percorso (come il click sul pin).
  const params = useParams();
  const preselectId = params.id;
  const appliedPreselect = useRef<string | null>(null);

  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  // Bottom sheet trascinabile: collapsed (altezza contenuto) / expanded (tutta la pagina).
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [collapsedH, setCollapsedH] = useState(0);
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const [locationConsent, setLocationConsent] = useState<'granted' | 'denied' | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LOCATION_PREF_KEY);
    if (saved === 'denied') {
      setLocationConsent('denied');
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const showPrompt = () => { timer = setTimeout(() => setShowLocationPrompt(true), 800); };

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          setLocationConsent('granted');
          localStorage.setItem(LOCATION_PREF_KEY, 'granted');
        } else if (result.state === 'denied') {
          setLocationConsent('denied');
          localStorage.setItem(LOCATION_PREF_KEY, 'denied');
        } else {
          showPrompt();
        }
      });
    } else if (saved === 'granted') {
      setLocationConsent('granted');
    } else {
      showPrompt();
    }

    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const handleAllowLocation = () => {
    localStorage.setItem(LOCATION_PREF_KEY, 'granted');
    setLocationConsent('granted');
    setShowLocationPrompt(false);
  };

  const handleDenyLocation = () => {
    localStorage.setItem(LOCATION_PREF_KEY, 'denied');
    setLocationConsent('denied');
    setShowLocationPrompt(false);
  };

  const { pos: geoPos, error: geoError } = useGeolocation(locationConsent === 'granted');

  // Se il browser blocca il permesso, resetta e mostra il prompt con avviso
  useEffect(() => {
    if (geoError === 'denied') {
      localStorage.removeItem(LOCATION_PREF_KEY);
      setLocationConsent(null);
      setShowLocationPrompt(true);
    }
  }, [geoError]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    () => savedView?.center ?? EUROPE_CENTER
  );
  const [mapZoom, setMapZoom] = useState<number>(
    () => savedView?.zoom ?? 4
  );
  // Incrementato ogni volta che vogliamo forzare un flyTo anche se center/zoom non cambiano
  const [flyTrigger, setFlyTrigger] = useState(0);

  // Prima apertura assoluta (savedView null) → vola su GPS al primo fix
  useEffect(() => {
    if (geoPos && !savedView) {
      setMapCenter(geoPos);
      setMapZoom(15);
      setFlyTrigger(t => t + 1);
    }
  }, [geoPos]);

  // Arrivo da /routes/:id → seleziona il percorso e centra la mappa su di esso.
  useEffect(() => {
    if (!preselectId || routes.length === 0) return;
    if (appliedPreselect.current === preselectId) return;
    const r = routes.find(x => x.id === preselectId);
    if (r) {
      appliedPreselect.current = preselectId;
      setSelectedRoute(r);
      setMapCenter(r.center);
      setMapZoom(16);
      setFlyTrigger(t => t + 1);
    }
  }, [preselectId, routes]);

  // TODO [FE1]: runners arriveranno da Supabase Realtime (posizioni GPS live degli utenti attivi)

  const handleRouteClick = (route: Route) => {
    setSelectedRoute(route);
    setSheetExpanded(false);
    setMapCenter(route.center);
    setMapZoom(16);
  };

  const closeSheet = () => {
    setSelectedRoute(null);
    setSheetExpanded(false);
  };

  // Misura l'altezza naturale del contenuto della sheet (stato "collapsed").
  useLayoutEffect(() => {
    if (selectedRoute && sheetContentRef.current) {
      setCollapsedH(sheetContentRef.current.scrollHeight);
    }
  }, [selectedRoute]);

  // Tiene aggiornata l'altezza del viewport per lo stato "expanded".
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleCenterUser = () => {
    setSelectedRoute(null);
    if (geoPos) {
      setMapCenter(geoPos);
      setMapZoom(15);
    } else {
      setMapCenter(EUROPE_CENTER);
      setMapZoom(4);
    }
    setFlyTrigger(t => t + 1);
  };

  const handleViewChange = (center: [number, number], zoom: number) => {
    savedView = { center, zoom };
  };

  const handleStartRun = () => {
    if (!selectedRoute) return;
    requireAuth('Sign in to start tracking your run.', () => {
      setLocation(`/run/${selectedRoute.id}`);
    });
  };


  return (
    <div className="relative w-full h-screen overflow-hidden bg-hiko-deep">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MapView
          center={mapCenter}
          zoom={mapZoom}
          flyTrigger={flyTrigger}
          routes={routes}
          runners={runners}
          onRouteClick={handleRouteClick}
          onViewChange={handleViewChange}
        >
          <UserLocationMarker pos={geoPos} />
        </MapView>
      </div>

      {/* Top Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 pt-12 flex justify-between items-start pointer-events-none">
        <div className={`${mapPanel(isDark)} px-4 py-2 rounded-2xl pointer-events-auto flex items-center gap-3`}>
          <Logo size={32} />
          {user ? (
            <p className="text-sm text-white/80 font-medium">Hi, <span className="text-white">{user.name}</span></p>
          ) : (
            <p className="text-sm text-white/80 font-medium">Explore Hiko</p>
          )}
        </div>
        {user ? (
          <div className={`${mapPanel(isDark)} px-3 py-2 rounded-2xl flex items-center gap-2 pointer-events-auto`}>
            <Zap size={16} className="text-hiko-primary fill-hiko-primary" />
            <span className="text-sm font-bold text-white">{user.currentStreak} Day</span>
          </div>
        ) : (
          <button
            onClick={() => useAuthStore.getState().openAuthModal('Sign in to track your runs and join the community.')}
            className={`${mapPanel(isDark)} px-4 py-2 rounded-2xl text-sm font-bold text-hiko-primary pointer-events-auto hover:bg-white/10 transition-colors`}
            data-testid="button-signin-top"
          >
            Sign in
          </button>
        )}
      </div>

      {/* FAB destra: localizza + cambia stile mappa */}
      <div className="absolute top-32 right-6 z-10 pointer-events-auto flex flex-col gap-2">
        <button
          onClick={handleCenterUser}
          className={`${mapPanel(isDark)} p-3 rounded-full text-white hover:text-hiko-primary transition-colors`}
        >
          <LocateFixed size={24} />
        </button>
        <MapStyleButton isDark={isDark} />
      </div>

      {/* Location Permission Prompt */}
      <AnimatePresence>
        {showLocationPrompt && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 180 }}
            className={`absolute bottom-28 left-4 right-4 z-40 ${mapPanel(isDark)} rounded-2xl p-4`}
          >
            <button
              onClick={handleDenyLocation}
              className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-start gap-3">
              <div className="bg-hiko-primary/20 rounded-xl p-2 mt-0.5 shrink-0">
                <MapPin size={20} className="text-hiko-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {geoError === 'denied' ? (
                  <>
                    <p className="text-white font-semibold text-sm mb-0.5">Posizione bloccata dal browser</p>
                    <p className="text-white/60 text-xs mb-3">
                      Abilita la posizione nelle impostazioni del browser per questo sito, poi riprova.
                    </p>
                    <button
                      onClick={handleDenyLocation}
                      className="w-full bg-white/10 text-white/70 text-xs font-medium py-2 rounded-xl hover:bg-white/20 transition-colors"
                    >
                      OK, capito
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-white font-semibold text-sm mb-0.5">Attiva la posizione in tempo reale</p>
                    <p className="text-white/60 text-xs mb-3">Vedrai la tua posizione sulla mappa e potrai centrare il percorso su di te.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAllowLocation}
                        className="flex-1 bg-hiko-primary text-hiko-deep text-xs font-bold py-2 rounded-xl hover:bg-hiko-primary/90 transition-colors"
                      >
                        Attiva
                      </button>
                      <button
                        onClick={handleDenyLocation}
                        className="flex-1 bg-white/10 text-white/70 text-xs font-medium py-2 rounded-xl hover:bg-white/20 transition-colors"
                      >
                        Non ora
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Bottom Sheet */}
      <AnimatePresence>
        {selectedRoute && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="absolute inset-0 z-20 bg-black/20 backdrop-blur-sm"
            />

            {/* Freccia indietro → torna alla lista percorsi */}
            <button
              onClick={() => setLocation('/routes')}
              aria-label="Torna ai percorsi"
              className={`absolute top-12 left-4 z-40 ${mapPanel(isDark)} p-3 rounded-full text-white hover:bg-white/10 transition-colors`}
            >
              <ArrowLeft size={22} />
            </button>

            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.35, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                const dy = info.offset.y;
                const vy = info.velocity.y;
                if (dy < -70 || vy < -550) {
                  setSheetExpanded(true);            // trascinata su → tutta la pagina
                } else if (dy > 70 || vy > 550) {
                  if (sheetExpanded) setSheetExpanded(false); // da espansa → torna compatta
                  else closeSheet();                  // da compatta → chiudi la corsa
                }
              }}
              initial={{ height: 0 }}
              animate={{ height: sheetExpanded ? viewportH : (collapsedH || 'auto') }}
              exit={{ height: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className={`absolute bottom-0 left-0 right-0 z-30 ${mapPanel(isDark)} rounded-t-3xl overflow-hidden touch-none`}
            >
            <div ref={sheetContentRef} className="px-6 pt-3 pb-28">
              {/* Maniglia di trascinamento */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedRoute.name}</h2>
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <span className="capitalize px-2 py-0.5 rounded-md bg-white/10 text-white">{selectedRoute.difficulty}</span>
                    <span className="capitalize">{selectedRoute.terrain}</span>
                    <span className="flex items-center gap-1"><Users size={14} /> {selectedRoute.activeRunners} active</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-xs text-white/50 mb-1">Distance</p>
                  <p className="text-lg font-bold text-white">{selectedRoute.distance} <span className="text-sm text-white/50">km</span></p>
                </div>
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-xs text-white/50 mb-1">Elevation</p>
                  <p className="text-lg font-bold text-white">+{selectedRoute.elevation} <span className="text-sm text-white/50">m</span></p>
                </div>
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-xs text-white/50 mb-1">Best Time</p>
                  <p className="text-lg font-bold text-white">{selectedRoute.bestTime}</p>
                </div>
              </div>

              {/* Riga 1: Preview + Take me there (metà ciascuno) */}
              <div className="flex gap-4 mb-3">
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex-1 bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <Eye size={20} />
                  Preview
                </button>
                <button
                  onClick={() => selectedRoute && openDirections(selectedRoute)}
                  className="flex-1 bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <Navigation size={20} />
                  Take me there
                </button>
              </div>

              {/* Riga 2: Start run a tutta larghezza */}
              <button
                onClick={handleStartRun}
                className="w-full bg-hiko-primary text-hiko-deep font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-hiko-primary/90 transition-colors"
              >
                <Play size={20} className="fill-hiko-deep" />
                START RUN
              </button>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview percorso — componente condiviso (stessa UI ovunque) */}
      <RoutePreviewModal
        route={selectedRoute}
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onStart={handleStartRun}
      />
    </div>
  );
}
