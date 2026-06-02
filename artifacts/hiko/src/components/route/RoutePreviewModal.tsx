import { AnimatePresence, motion } from 'framer-motion';
import { X, Play } from 'lucide-react';
import MapView from '@/components/MapView';
import { useMapIsDark, mapPanel } from '@/store/useMapStore';
import type { Route } from '@/store/useDataStore';

interface RoutePreviewModalProps {
  route: Route | null;
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

// Anteprima a schermo intero del percorso: mappa interattiva (pan + zoom)
// con i marker START/FINISH e la possibilità di avviare la corsa.
export function RoutePreviewModal({ route, open, onClose, onStart }: RoutePreviewModalProps) {
  const isDark = useMapIsDark();

  return (
    <AnimatePresence>
      {open && route && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-hiko-deep"
        >
          {/* La mappa va in un contenitore posizionato: così i suoi pannelli
              non coprono header e footer (che restano cliccabili). */}
          <div className="absolute inset-0 z-0">
            <MapView
              center={route.center}
              zoom={15}
              activeRoute={route}
              interactive
              showRouteEndpoints
            />
          </div>

          {/* Header: info percorso + chiudi */}
          <div className="absolute top-0 left-0 right-0 z-20 p-6 pt-12 flex justify-between items-start pointer-events-none">
            <div className={`${mapPanel(isDark)} px-4 py-2 rounded-2xl pointer-events-auto`}>
              <p className="text-sm font-bold text-white">{route.name}</p>
              <p className="text-xs text-white/60">
                {route.distance} km · +{route.elevation} m · {route.terrain}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Chiudi anteprima"
              className={`${mapPanel(isDark)} p-3 rounded-full text-white hover:bg-white/10 transition-colors pointer-events-auto`}
            >
              <X size={22} />
            </button>
          </div>

          {/* Footer: hint + avvio corsa */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-10 bg-gradient-to-t from-hiko-deep via-hiko-deep/80 to-transparent">
            <p className="text-center text-xs text-white/60 mb-4">
              Trascina per spostarti · pizzica o usa la rotella per zoomare
            </p>
            <button
              onClick={onStart}
              className="w-full bg-hiko-primary text-hiko-deep font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-hiko-primary/90 transition-colors"
            >
              <Play size={20} className="fill-hiko-deep" />
              START RUN
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
