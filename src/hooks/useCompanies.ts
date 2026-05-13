/**
 * @module useCompanies
 * Hook de dados de empresas com suporte offline + auth guard.
 *
 * Auth guard: a query só dispara quando initialized=true && session!=null,
 * evitando requisições sem token que o RLS do Supabase bloquearia silenciosamente.
 *
 * Offline: dados persistidos no cache TanStack Query (7 dias). Se offline,
 * a lista é servida do cache enquanto a outbox mantém edições pendentes.
 *
 * Merge local: empresas criadas ou editadas offline (na outbox) são mescladas
 * na lista em tempo real, antes de serem enviadas ao servidor.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { useOutbox } from '@/stores/outboxStore';
import type { Company } from '@/types/database';

const TAG = 'useCompanies';

export function useCompanies() {
  // Auth guard — queries só habilitadas após sessão estar restaurada
  const { session, initialized } = useAuthStore();
  const ops = useOutbox((s) => s.ops);

  const query = useQuery({
    queryKey: ['companies'],
    enabled: initialized && !!session,
    queryFn: async () => {
      logger.debug(TAG, 'Buscando empresas do servidor...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('company_name')
          .abortSignal(controller.signal);

        if (error) {
          logger.error(TAG, 'Erro ao buscar empresas', error.message);
          throw error;
        }
        logger.info(TAG, `${data?.length ?? 0} empresas carregadas`);
        return data as Company[];
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  // ── Merge: servidor + pendentes offline ────────────────────────────────────

  const serverData = query.data ?? [];

  // Empresas criadas offline (com tempId)
  const pendingCreates: (Company & { _pendingSync?: boolean })[] = ops
    .filter((o) => o.type === 'company.create' && o.tempId)
    .map((o) => ({
      id: o.tempId!,
      ...(o.payload as any),
      _pendingSync: true,
    }));

  // Edições locais pendentes (por ID)
  const pendingUpdatesById: Record<string, Record<string, unknown>> = {};
  for (const o of ops) {
    if (o.type === 'company.update' && o.recordId) {
      pendingUpdatesById[o.recordId] = {
        ...pendingUpdatesById[o.recordId],
        ...o.payload,
      };
    }
  }

  const merged: Company[] = [
    ...serverData.map((c) =>
      pendingUpdatesById[c.id]
        ? ({ ...c, ...pendingUpdatesById[c.id], _pendingSync: true } as Company)
        : c,
    ),
    ...pendingCreates,
  ].sort((a, b) => (a.company_name ?? '').localeCompare(b.company_name ?? ''));

  return { ...query, data: merged };
}
