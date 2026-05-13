/**
 * @module supabase
 * Cliente Supabase configurado para o InovaCalc Mobile.
 *
 * Configurações de segurança:
 * - Sessão persistida via AsyncStorage (sobrevive a reinicializações)
 * - autoRefreshToken: true → renova o JWT antes de expirar
 * - detectSessionInUrl: false → mobile não usa deep-link para auth
 * - A anon key é segura para expor no bundle — o controle de acesso
 *   é feito por RLS no banco de dados, não pela key em si.
 *
 * NUNCA coloque a service_role key no app mobile.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Falha rápido em ambiente de desenvolvimento se as variáveis estiverem ausentes
if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    '[supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY não configurados.\n' +
    'Crie o arquivo calculadoraInovassie/.env com as variáveis de ambiente.';
  logger.error('supabase', msg);
  // Em produção logamos mas não quebramos — a UI vai mostrar erro de conexão
  if (__DEV__) {
    throw new Error(msg);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /** Persiste a sessão entre reinicializações do app. */
    storage: AsyncStorage,
    /** Renova o JWT automaticamente antes de expirar. */
    autoRefreshToken: true,
    /** Mantém a sessão ativa enquanto o app estiver em uso. */
    persistSession: true,
    /** Mobile não usa URL para detectar retorno de OAuth. */
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'inovacalc-mobile/1.0',
    },
  },
});

logger.info('supabase', `Cliente Supabase inicializado → ${supabaseUrl}`);
