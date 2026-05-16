/**
 * Singleton do QueryClient — compartilhado entre _layout.tsx e sync.ts.
 * Centralizar aqui permite que o motor de sync invalide o cache após
 * sincronizar operações pendentes da outbox.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime:    1000 * 60 * 60 * 24 * 7,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});
