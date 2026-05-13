/**
 * @module authStore
 * Store Zustand de autenticação do InovaCalc Mobile.
 *
 * Fluxo de inicialização:
 *   1. initialize() lê a sessão persitida do AsyncStorage via supabase.auth.getSession()
 *   2. Define initialized = true — sinal para os hooks de dados habilitarem queries
 *   3. Se sessão existe, carrega o profile do banco
 *   4. onAuthStateChange escuta mudanças futuras (logout, token refresh, etc.)
 *
 * IMPORTANTE: queries de dados (empresas, orçamentos, etc.) devem aguardar
 * initialized = true && session != null antes de disparar — caso contrário
 * o RLS do Supabase bloqueia as requisições por falta de token.
 */

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/database';

const TAG = 'authStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** true quando o carregamento inicial da sessão (AsyncStorage) terminou. */
  initialized: boolean;
  loading: boolean;

  initialize: () => Promise<void>;
  loadProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  loading: false,

  initialize: async () => {
    // Idempotente — evita inicializar mais de uma vez
    if (get().initialized) return;

    logger.info(TAG, 'Iniciando restauração de sessão...');

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logger.warn(TAG, 'Erro ao restaurar sessão', error.message);
      }

      set({
        session: data.session,
        user: data.session?.user ?? null,
        initialized: true,
      });

      if (data.session?.user) {
        logger.info(TAG, `Sessão restaurada para uid=${data.session.user.id}`);
        await get().loadProfile();
      } else {
        logger.info(TAG, 'Nenhuma sessão ativa — usuário precisa fazer login');
      }
    } catch (e: unknown) {
      logger.error(TAG, 'Falha crítica ao inicializar auth', e);
      // Mesmo com erro, marcamos como initialized para desbloquear o fluxo
      set({ initialized: true });
    }

    // Escuta mudanças futuras de sessão (refresh de token, logout remoto, etc.)
    supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info(TAG, `onAuthStateChange: ${event}`, { hasSession: !!session });
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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.warn(TAG, 'Erro ao carregar profile', error.message);
        return;
      }
      if (data) {
        logger.debug(TAG, `Profile carregado: ${data.name} (${data.role})`);
        set({ profile: data as Profile });
      }
    } catch (e: unknown) {
      logger.error(TAG, 'Falha ao carregar profile', e);
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    logger.info(TAG, `Tentativa de login: ${email}`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        logger.warn(TAG, `Login falhou: ${error.message}`);
        set({ loading: false });
        return { error: error.message };
      }

      if (data.session) {
        logger.info(TAG, `Login OK: uid=${data.session.user.id}`);
        set({ session: data.session, user: data.session.user });
        get().loadProfile(); // não bloqueia — continua em background
      }
      set({ loading: false });
      return { error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro inesperado ao conectar.';
      logger.error(TAG, 'Exceção no signIn', e);
      set({ loading: false });
      return { error: msg };
    }
  },

  signOut: async () => {
    logger.info(TAG, 'Fazendo logout...');
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
    logger.info(TAG, 'Logout concluído');
  },
}));
