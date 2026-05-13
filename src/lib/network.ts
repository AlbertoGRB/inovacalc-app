/**
 * @module network
 * Gerenciamento de conectividade para o InovaCalc Mobile.
 *
 * Estratégia sem dependências nativas extras:
 * - Integra o onlineManager do TanStack Query com AppState do React Native
 * - Quando o app volta ao primeiro plano, TQ revalida queries automaticamente
 * - checkConnectivity() faz um HEAD request leve para diagnóstico pontual
 *
 * Para detecção de rede em tempo real mais precisa, instale
 * @react-native-community/netinfo e substitua o setEventListener.
 */

import { AppState, type AppStateStatus } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { logger } from './logger';

let networkManagerInitialized = false;

/**
 * Configura o onlineManager do TanStack Query para usar AppState do RN.
 * Chame uma única vez no boot (app/_layout.tsx), antes do QueryClientProvider.
 *
 * Efeito: quando o app volta ao foreground, TQ marca as queries como stale
 * e refaz o fetch se o usuário estiver autenticado.
 */
export function setupNetworkManager(): void {
  if (networkManagerInitialized) return;
  networkManagerInitialized = true;

  onlineManager.setEventListener((setOnline) => {
    const handleChange = (state: AppStateStatus) => {
      const online = state === 'active';
      logger.debug('network', `AppState → "${state}" | online=${online}`);
      setOnline(online);
    };

    const sub = AppState.addEventListener('change', handleChange);
    logger.info('network', 'Network manager initialized (AppState strategy)');

    return () => sub.remove();
  });
}

/**
 * Verifica conectividade real com o backend Supabase via HEAD request.
 * Útil para diagnóstico pontual — não deve ser chamado em loops.
 *
 * @returns true se o servidor respondeu (mesmo com 401 = sem auth, mas online)
 */
export async function checkConnectivity(): Promise<boolean> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    logger.warn('network', 'EXPO_PUBLIC_SUPABASE_URL não configurado');
    return false;
  }
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5_000),
    });
    // 200 ou 401 = servidor respondeu = online
    const online = res.ok || res.status === 401;
    logger.debug('network', `checkConnectivity → ${res.status} | online=${online}`);
    return online;
  } catch (e: unknown) {
    logger.debug('network', 'checkConnectivity → offline', e);
    return false;
  }
}
