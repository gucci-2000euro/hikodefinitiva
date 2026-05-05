import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  level: number;
  title: string;
  totalKm: number;
  totalRuns: number;
  longestRun: number;
  currentStreak: number;
  weeklyAvg: number;
  avgPace: number;       // seconds per km
  weeklyCalories: number;
  totalCalories: number;
}

interface AuthState {
  user: User | null;
  authModalOpen: boolean;
  authModalReason: string | null;
  pendingAction: (() => void) | null;
  login: (email: string, name: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  openAuthModal: (reason?: string, onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  requireAuth: (reason: string, action: () => void) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      authModalOpen: false,
      authModalReason: null,
      pendingAction: null,
      login: (email, name) => {
        set({
          user: {
            id: 'u1',
            name: name || 'Mara',
            email,
            avatar: 'https://i.pravatar.cc/150?u=u1',
            level: 12,
            title: 'Pathfinder',
            totalKm: 0,
            totalRuns: 0,
            longestRun: 0,
            currentStreak: 0,
            weeklyAvg: 0,
            avgPace: 0,
            weeklyCalories: 0,
            totalCalories: 0
          },
          authModalOpen: false,
          authModalReason: null
        });
        const pending = get().pendingAction;
        if (pending) {
          set({ pendingAction: null });
          setTimeout(pending, 50);
        }
      },
      logout: () => set({ user: null }),
      updateProfile: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
      openAuthModal: (reason, onSuccess) => set({
        authModalOpen: true,
        authModalReason: reason ?? null,
        pendingAction: onSuccess ?? null
      }),
      closeAuthModal: () => set({ authModalOpen: false, authModalReason: null, pendingAction: null }),
      requireAuth: (reason, action) => {
        if (get().user) {
          action();
        } else {
          set({ authModalOpen: true, authModalReason: reason, pendingAction: action });
        }
      }
    }),
    {
      name: 'hiko-auth',
      partialize: (state) => ({ user: state.user })
    }
  )
);
