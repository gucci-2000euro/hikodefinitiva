import { useState } from 'react';
import { useRoutes } from '@/hooks/useRoutes';
import { useCommunityStore } from '@/store/useCommunityStore';
import { RouteCard } from '@/components/route/RouteCard';
import type { Route } from '@/store/useDataStore';
import { MapPin, Send, X, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  canPost: boolean;
  onSendMessage: (partial: { contenuto: string; tipo: string; riferimento_id?: string }) => Promise<string | null>;
}

export function PercorsiChannelView({ canPost, onSendMessage }: Props) {
  const messages = useCommunityStore(s => s.messages);
  const { data: routes = [], isLoading: loadingRoutes } = useRoutes();

  const [showSheet, setShowSheet] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [comment, setComment] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  const routeMessages = messages.filter(m => m.tipo === 'percorso' && !m.eliminato);

  const filteredRoutes = routes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleShare = async () => {
    if (!selectedRoute || !comment.trim()) return;
    setSending(true);
    await onSendMessage({ tipo: 'percorso', contenuto: comment.trim(), riferimento_id: selectedRoute.id });
    setComment('');
    setSelectedRoute(null);
    setSearch('');
    setShowSheet(false);
    setSending(false);
  };

  const closeSheet = () => {
    setShowSheet(false);
    setSelectedRoute(null);
    setComment('');
    setSearch('');
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Feed percorsi condivisi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {routeMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MapPin size={36} className="text-white/20 mb-3" />
            <p className="text-white/40 text-sm">Nessun percorso condiviso ancora.</p>
            <p className="text-white/30 text-xs mt-1">Sii il primo a consigliarne uno!</p>
          </div>
        )}
        {routeMessages.map(msg => {
          const route = routes.find(r => r.id === msg.riferimento_id);
          const name = msg.profiles?.nome ?? 'Runner';
          const avatar = msg.profiles?.avatar_url;
          const date = new Date(msg.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
          return (
            <div key={msg.id} className="space-y-2">
              <div className="flex items-center gap-2">
                {avatar
                  ? <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                  : <div className="w-7 h-7 rounded-full bg-hiko-primary/20 flex items-center justify-center text-xs font-bold text-hiko-primary">{name[0]?.toUpperCase()}</div>
                }
                <span className="text-xs font-semibold text-white/70">{name}</span>
                <span className="text-[10px] text-white/30">{date}</span>
              </div>
              <div className="ml-9">
                {route
                  ? <RouteCard route={route} />
                  : <div className="glass-panel rounded-2xl p-4 text-white/30 text-sm">Percorso non disponibile</div>
                }
              </div>
              {msg.contenuto && (
                <div className="ml-9 bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <p className="text-sm text-white/80 leading-relaxed">{msg.contenuto}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottone condividi */}
      {canPost && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-white/10">
          <button
            onClick={() => setShowSheet(true)}
            className="w-full flex items-center justify-center gap-2 bg-hiko-primary/15 border border-hiko-primary/30 text-hiko-primary rounded-2xl py-3 text-sm font-semibold hover:bg-hiko-primary/25 transition-colors"
          >
            <MapPin size={16} /> Condividi percorso
          </button>
        </div>
      )}

      {/* Sheet selezione percorso */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={closeSheet}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-hiko-deep border-t border-white/10 rounded-t-3xl flex flex-col overflow-hidden max-h-[75vh]"
            >
              {/* Header fisso */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                <h3 className="text-white font-bold text-base">
                  {selectedRoute ? 'Aggiungi un commento' : 'Scegli un percorso'}
                </h3>
                <button onClick={closeSheet} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {selectedRoute ? (
                /* Vista: percorso scelto + commento */
                <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                  <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-3 pb-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">Percorso selezionato</span>
                      <button
                        onClick={() => setSelectedRoute(null)}
                        className="text-xs text-hiko-primary hover:text-hiko-primary/80 transition-colors"
                      >
                        Cambia
                      </button>
                    </div>
                    <RouteCard route={selectedRoute} />
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Racconta la tua esperienza (es. «Ho fatto questo percorso ieri, panorama fantastico!»)"
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-hiko-primary/50 transition-colors"
                    />
                  </div>
                  {/* Bottone fisso in fondo */}
                  <div className="flex-shrink-0 px-4 py-3 border-t border-white/10">
                    <button
                      onClick={handleShare}
                      disabled={!comment.trim() || sending}
                      className="w-full bg-hiko-primary text-hiko-deep font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-hiko-primary/90 transition-colors"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Condividi
                    </button>
                  </div>
                </div>
              ) : (
                /* Vista: lista percorsi con ricerca */
                <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                  {/* Barra ricerca fissa */}
                  <div className="flex-shrink-0 px-4 py-2.5 border-b border-white/5">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-hiko-primary/40 transition-colors">
                      <Search size={14} className="text-white/40 shrink-0" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cerca percorso per nome..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista percorsi scrollabile */}
                  <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3">
                    {loadingRoutes ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={24} className="text-hiko-primary animate-spin" />
                      </div>
                    ) : filteredRoutes.length === 0 ? (
                      <div className="text-center py-8 text-white/40 text-sm">
                        Nessun percorso trovato per «{search}»
                      </div>
                    ) : (
                      filteredRoutes.map(r => (
                        <RouteCard key={r.id} route={r} onClick={() => setSelectedRoute(r)} />
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
