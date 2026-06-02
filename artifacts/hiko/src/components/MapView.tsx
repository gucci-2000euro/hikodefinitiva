import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Route } from "@/store/useDataStore";
import { useMapStore, getMapStyle } from "@/store/useMapStore";

// Custom icons
const createDotIcon = (color: string, size: number = 24) => {
  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `<div style="width:${size}px;height:${size}px;background-color:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 10px ${color};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createPinIcon = (color: string, size: number = 36, label?: string) => {
  const w = size;
  const h = Math.round(size * 1.3);
  const labelHtml = label
    ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:${color};color:#0E402D;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;letter-spacing:0.04em;">${label}</div>`
    : '';
  const html = `
    <div style="position:relative;width:${w}px;height:${h + (label ? 24 : 0)}px;display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
      ${labelHtml}
      <svg width="${w}" height="${h}" viewBox="0 0 24 31" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 19 12 19s12-10.5 12-19C24 5.373 18.627 0 12 0z" fill="${color}"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 19 12 19s12-10.5 12-19C24 5.373 18.627 0 12 0z" fill="none" stroke="white" stroke-width="1.5" stroke-opacity="0.9"/>
        <circle cx="12" cy="12" r="4.5" fill="white"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    className: "custom-leaflet-icon",
    html,
    iconSize: [w, h + (label ? 24 : 0)],
    iconAnchor: [w / 2, h + (label ? 24 : 0)],
  });
};

const userIcon = L.divIcon({
  className: "custom-leaflet-icon",
  html: `<div style="width:22px;height:22px;background-color:#0ebc68;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(14,188,104,0.35),0 0 16px rgba(14,188,104,0.6);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const routeIcon = createPinIcon("#0ebc68", 36);
const startIcon = createPinIcon("#0ebc68", 38, "START");
const finishIcon = createPinIcon("#FFB800", 38, "FINISH");
const runnerIcon = createDotIcon("rgba(255,255,255,0.85)", 13);

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  flyTrigger?: number;
  routes?: Route[];
  runners?: { id: string; lat: number; lng: number }[];
  activeRoute?: Route | null;
  userPos?: [number, number];
  onRouteClick?: (route: Route) => void;
  onViewChange?: (center: [number, number], zoom: number) => void;
  interactive?: boolean;
  showRouteEndpoints?: boolean;
  /** Se valorizzato, la mappa segue questa posizione (pan, senza toccare lo zoom).
   *  Passa null per sospendere il follow lasciando l'utente libero di muoversi. */
  followPos?: [number, number] | null;
  /** Incrementa per forzare una ri-centratura immediata su followPos. */
  followTrigger?: number;
  /** Chiamato quando l'utente trascina la mappa (per disattivare il follow). */
  onUserInteract?: () => void;
  children?: React.ReactNode;
}

function MapUpdater({ center, zoom, flyTrigger }: { center: [number, number]; zoom?: number; flyTrigger?: number }) {
  const map = useMap();
  useEffect(() => {
    if (zoom) {
      map.flyTo(center, zoom, { duration: 1.5 });
    } else {
      map.panTo(center, { animate: true, duration: 1 });
    }
    // flyTrigger è nelle dipendenze per forzare il re-esecuzione anche quando center/zoom non cambiano
  }, [center, zoom, flyTrigger, map]);  // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function MapPositionTracker({ onViewChange }: { onViewChange: (center: [number, number], zoom: number) => void }) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      const z = e.target.getZoom();
      onViewChange([c.lat, c.lng], z);
    },
  });
  return null;
}

function UserMarker({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(pos, { animate: true, duration: 0.8 });
  }, [pos, map]);
  return <Marker position={pos} icon={userIcon} />;
}

// Segue una posizione muovendo solo il centro (lo zoom resta quello scelto dall'utente).
function FollowController({ pos, trigger }: { pos?: [number, number] | null; trigger?: number }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.panTo(pos, { animate: true, duration: 0.6 });
  }, [pos, trigger, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Rileva il trascinamento manuale della mappa (non gli spostamenti programmatici).
function UserInteractTracker({ onUserInteract }: { onUserInteract: () => void }) {
  useMapEvents({ dragstart() { onUserInteract(); } });
  return null;
}


export default function MapView({
  center,
  zoom = 14,
  flyTrigger,
  routes = [],
  runners = [],
  activeRoute,
  userPos,
  onRouteClick,
  onViewChange,
  interactive = true,
  showRouteEndpoints = false,
  followPos,
  followTrigger,
  onUserInteract,
  children,
}: MapViewProps) {
  const styleId = useMapStore(s => s.styleId);
  const style = getMapStyle(styleId);
  const waypoints = activeRoute?.waypoints as [number, number][] | undefined;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      dragging={interactive}
      touchZoom={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      style={{ background: style.bg }}
      className="w-full h-full"
    >
      <TileLayer
        key={style.id}
        url={style.url}
        attribution={style.attribution}
      />

      <MapUpdater center={center} zoom={zoom} flyTrigger={flyTrigger} />
      {onViewChange && <MapPositionTracker onViewChange={onViewChange} />}
      {followPos !== undefined && <FollowController pos={followPos} trigger={followTrigger} />}
      {onUserInteract && <UserInteractTracker onUserInteract={onUserInteract} />}

      {/* Browse-mode route pins */}
      {!activeRoute && routes.map(route => (
        <Marker
          key={route.id}
          position={route.center}
          icon={routeIcon}
          eventHandlers={{ click: () => onRouteClick?.(route) }}
        />
      ))}

      {/* Active run route — glow underlay + main line */}
      {activeRoute && waypoints && waypoints.length > 1 && (
        <>
          <Polyline positions={waypoints} color="#0ebc68" weight={12} opacity={0.18} />
          <Polyline positions={waypoints} color="#0ebc68" weight={4} opacity={0.9} />
          {waypoints.slice(1, -1).map((wp, i) => (
            <CircleMarker
              key={i}
              center={wp}
              radius={4}
              pathOptions={{ color: '#0ebc68', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
            />
          ))}
          {showRouteEndpoints && (
            <>
              <Marker position={waypoints[0]} icon={startIcon} />
              <Marker position={waypoints[waypoints.length - 1]} icon={finishIcon} />
            </>
          )}
        </>
      )}

      {/* Other runners */}
      {runners.map(runner => (
        <Marker key={runner.id} position={[runner.lat, runner.lng]} icon={runnerIcon} />
      ))}

      {/* User position */}
      {userPos && !interactive && <UserMarker pos={userPos} />}
      {userPos && interactive && <Marker position={userPos} icon={userIcon} />}

      {children}
    </MapContainer>
  );
}
