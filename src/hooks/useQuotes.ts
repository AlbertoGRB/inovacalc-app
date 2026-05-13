/**
 * @module useQuotes
 * Hook de dados de orçamentos com suporte offline + auth guard.
 *
 * Auth guard: a query só dispara quando initialized=true && session!=null.
 * Merge local: orçamentos criados offline (outbox) aparecem na lista imediatamente.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { useOutbox } from '@/stores/outboxStore';
import type { Quote } from '@/types/database';

const TAG = 'useQuotes';

export function useQuotes(status?: string) {
  const { session, initialized } = useAuthStore();
  const ops = useOutbox((s) => s.ops);

  const query = useQuery({
    queryKey: ['quotes', status],
    enabled: initialized && !!session,
    queryFn: async () => {
      logger.debug(TAG, `Buscando orçamentos${status ? ` status=${status}` : ''}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        let q = supabase
          .from('quotes')
          .select('*, companies(company_name, cnpj)')
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal);

        if (status) q = q.eq('status', status);

        const { data, error } = await q;
        if (error) {
          logger.error(TAG, 'Erro ao buscar orçamentos', error.message);
          throw error;
        }
        logger.info(TAG, `${data?.length ?? 0} orçamentos carregados`);
        return data as Quote[];
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  // Merge: orçamentos pendentes offline
  const pendingQuotes: (Quote & { _pendingSync?: boolean })[] = ops
    .filter((o) => o.type === 'quote.create' && o.tempId)
    .filter((o) => !status || o.payload.status === status)
    .map((o) => ({
      id: o.tempId!,
      ...(o.payload as any),
      _pendingSync: true,
    }));

  const merged: Quote[] = [...pendingQuotes, ...(query.data ?? [])];

  return { ...query, data: merged };
}
