import { useLocation, useParams } from 'wouter';
import { useRoutes } from '@/hooks/useRoutes';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Play, Activity, Mountain, Clock, ChevronRight } from 'lucide-react';
import MapView from '@/components/MapView';
import { useMapIsDark, mapPanel } from '@/store/useMapStore';

export default function RouteDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: routes = [] } = useRoutes();
  const requireAuth = useAuthStore(state => state.requireAuth);
  const isDark = useMapIsDark();

  const route = routes.find(r => r.id === id);

  if (!route) return <div className="text-white p-6">Route not found</div>;

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24 overflow-y-auto">
      {/* Hero Map Preview */}
      <div className="h-64 relative">
        <button
          onClick={() => setLocation('/routes')}
          className={`absolute top-12 left-4 z-20 ${mapPanel(isDark)} p-2 rounded-full hover:bg-white/10 transition-colors`}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="absolute inset-0 z-0">
          <MapView 
            center={route.center} 
            zoom={15} 
            activeRoute={route}
            interactive={false}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-hiko-deep via-transparent to-transparent" />
      </div>

      <div className="px-6 -mt-8 relative z-20">
        <div className="glass-panel p-6 rounded-3xl mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold">{route.name}</h1>
            <span className="text-xs px-2 py-1 rounded-md font-medium uppercase tracking-wider bg-hiko-primary/20 text-hiko-primary">
              {route.difficulty}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Activity size={12}/> Distance</p>
              <p className="text-xl font-bold">{route.distance} <span className="text-sm font-normal text-white/50">km</span></p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Mountain size={12}/> Elevation</p>
              <p className="text-xl font-bold">+{route.elevation} <span className="text-sm font-normal text-white/50">m</span></p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Clock size={12}/> Best Time</p>
              <p className="text-xl font-bold">{route.bestTime}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Terrain</p>
              <p className="text-lg font-medium capitalize">{route.terrain}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => requireAuth('Sign in to start tracking your run.', () => setLocation(`/run/${route.id}`))}
          className="w-full bg-hiko-primary text-hiko-deep font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-hiko-primary/90 transition-colors mb-8"
        >
          <Play size={20} className="fill-hiko-deep" />
          START RUN
        </button>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Your History</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((attempt) => (
              <div key={attempt} className="glass-panel p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm mb-1">{attempt === 1 ? 'Yesterday' : `${attempt} weeks ago`}</p>
                  <p className="text-xl font-bold text-white/90">{route.bestTime}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/50 mb-1">Pace</p>
                  <p className="font-medium text-white/80">4:52/km</p>
                </div>
                <ChevronRight className="text-white/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
