import { useEffect } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

const STYLE_ID = 'hiko-user-location-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes hiko-location-pulse {
      0%   { transform: scale(1);   opacity: 0.65; }
      70%  { transform: scale(2.6); opacity: 0;    }
      100% { transform: scale(2.6); opacity: 0;    }
    }
    .hiko-location-halo {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: #31E981;
      animation: hiko-location-pulse 2s ease-out infinite;
    }
  `;
  document.head.appendChild(el);
}

const locationIcon = L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="position:relative;width:20px;height:20px;">
    <div class="hiko-location-halo"></div>
    <div style="position:absolute;inset:0;background:#31E981;border-radius:50%;border:2.5px solid white;box-shadow:0 0 10px rgba(49,233,129,0.7);"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Props {
  pos: [number, number] | null;
}

export default function UserLocationMarker({ pos }: Props) {
  useEffect(() => {
    ensureStyle();
  }, []);

  if (!pos) return null;
  return <Marker position={pos} icon={locationIcon} />;
}
