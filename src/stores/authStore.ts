import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    // Evita inicializar mais de uma vez
    if (get().initialized) return;

    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      initialized: true,
    });
    if (data.session?.user) {
      await get().loadProfile();
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[authStore] onAuthStateChange:', event, !!session);
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        await get().loadProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  loadProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ loading: false });
        return { error: error.message };
      }
      // Atualiza a sessão explicitamente — não depende só do onAuthStateChange
      if (data.session) {
        set({ session: data.session, user: data.session.user });
        get().loadProfile(); // não bloqueia
      }
      set({ loading: false });
      return { error: null };
    } catch (e: unknown) {
      set({ loading: false });
      const msg = e instanceof Error ? e.message : 'Erro inesperado ao conectar.';
      return { error: msg };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
