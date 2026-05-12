import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Company } from '@/types/database';
import { useOutbox } from '@/stores/outboxStore';

export function useCompanies() {
  const ops = useOutbox(s => s.ops);

  const query = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('company_name')
          .abortSignal(controller.signal);
        if (error) throw error;
        return data as Company[];
      } finally {
        clearTimeout(t);
      }
    },
  });

  // Merge: empresas do servidor + empresas pendentes (criadas offline)
  // Aplicar também updates locais pendentes em cima das do servidor.
  const serverData = query.data ?? [];

  const pendingCreates: Company[] = ops
    .filter(o => o.type === 'company.create' && o.tempId)
    .map(o => ({
      id: o.tempId!,
      ...(o.payload as any),
      _pendingSync: true,
    } as Company & { _pendingSync?: boolean }));

  // Updates locais — mescla por id
  const pendingUpdatesById: Record<string, Record<string, any>> = {};
  for (const o of ops) {
    if (o.type === 'company.update' && o.recordId) {
      pendingUpdatesById[o.recordId] = { ...pendingUpdatesById[o.recordId], ...o.payload };
    }
  }

  const merged: Company[] = [
    ...serverData.map(c =>
      pendingUpdatesById[c.id]
        ? ({ ...c, ...pendingUpdatesById[c.id], _pendingSync: true } as Company)
        : c,
    ),
    ...pendingCreates,
  ].sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));

  return {
    ...query,
    data: merged,
  };
}
