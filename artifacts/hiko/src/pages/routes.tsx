import { useState } from 'react';
import { useRoutes } from '@/hooks/useRoutes';
import { Link } from 'wouter';
import { MapIcon, Activity, Mountain, Users, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RoutesList() {
  const { data: routes = [], isLoading } = useRoutes();
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  const filteredRoutes = routes.filter(r => filter === 'all' || r.difficulty === filter);

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 border-b border-white/10">
        <h1 className="text-2xl font-bold mb-4">Routes</h1>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['all', 'easy', 'medium', 'hard'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-hiko-primary text-hiko-deep' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="text-hiko-primary animate-spin" />
          </div>
        )}
        {filteredRoutes.map((route, i) => (
          <Link key={route.id} href={`/routes/${route.id}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-4 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors group"
            >
              <div className="h-32 rounded-xl mb-4 relative overflow-hidden bg-gradient-to-br from-hiko-muted to-hiko-dark flex items-center justify-center">
                {/* Abstract SVG route line */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-50 stroke-hiko-primary fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10,50 Q30,20 50,50 T90,50" />
                </svg>
                <MapIcon className="text-hiko-primary opacity-50 w-8 h-8 relative z-10" />
              </div>
              
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold group-hover:text-hiko-primary transition-colors">{route.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-md font-medium uppercase tracking-wider ${
                  route.difficulty === 'easy' ? 'bg-hiko-primary/20 text-hiko-primary' :
                  route.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-red-500/20 text-red-500'
                }`}>
                  {route.difficulty}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span className="flex items-center gap-1"><Activity size={14}/> {route.distance}km</span>
                <span className="flex items-center gap-1"><Mountain size={14}/> +{route.elevation}m</span>
                <span className="flex items-center gap-1"><Users size={14}/> {route.activeRunners}</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
