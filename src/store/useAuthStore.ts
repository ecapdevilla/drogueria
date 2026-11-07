import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { UserProfile } from '../auth/types';
import { isAuthEnabled, supabase } from '../lib/supabase';
import { fetchProfile, getSession, signIn, signOut } from '../services/auth.service';

interface AuthStore {
  session: Session | null;
  profile: UserProfile | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  profile: null,
  initialized: false,
  loading: false,
  error: null,

  initialize: async () => {
    if (get().initialized) return;

    if (!isAuthEnabled || !supabase) {
      set({ initialized: true, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const session = await getSession();
      set({ session });
      if (session) await get().refreshProfile();
    } catch {
      set({ error: 'No se pudo iniciar la sesión' });
    } finally {
      set({ loading: false, initialized: true });
    }

    if (!authSubscription) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
        if (session) void get().refreshProfile();
        else set({ profile: null });
      });
      authSubscription = data.subscription;
    }
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!supabase || !session) {
      set({ profile: null });
      return;
    }

    try {
      const profile = await fetchProfile(session.user.id);
      set({ profile, error: profile ? null : 'Tu usuario no tiene perfil asignado' });
    } catch {
      set({ profile: null, error: 'No se pudo cargar el perfil del usuario' });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await signIn(email, password);
      const session = await getSession();
      set({ session });
      if (session) await get().refreshProfile();
      return Boolean(session);
    } catch {
      set({ error: 'Correo o contraseña incorrectos' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await signOut();
    } catch {
      // La sesión local se limpia igualmente.
    }
    set({ session: null, profile: null, error: null });
  },
}));
