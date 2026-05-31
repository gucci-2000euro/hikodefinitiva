import { useState, useRef, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { useMapStore, MAP_STYLES, mapPanel } from '@/store/useMapStore';

interface Props {
  isDark: boolean;
  className?: string;
}

export function MapStyleButton({ isDark, className = '' }: Props) {
  const { styleId, setStyleId } = useMapStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Chiude il popup cliccando fuori — non usa un backdrop full-screen
  // che coprirebbe altri controlli (es. il tasto back)
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Popup apre VERSO IL BASSO (top-full) per evitare overflow in alto */}
      {open && (
        <div
          className={`absolute top-full mt-1 right-0 z-50 ${mapPanel(isDark)} rounded-2xl p-1.5 w-36 flex flex-col gap-0.5`}
        >
          {MAP_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => { setStyleId(style.id); setOpen(false); }}
              aria-label={`Stile mappa: ${style.name}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left w-full ${
                styleId === style.id
                  ? 'bg-hiko-primary text-hiko-deep'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">{style.emoji}</span>
              <span className="truncate">{style.name}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Cambia stile mappa"
        aria-expanded={open}
        className={`${mapPanel(isDark)} w-10 h-10 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors`}
      >
        <Layers size={18} />
      </button>
    </div>
  );
}
