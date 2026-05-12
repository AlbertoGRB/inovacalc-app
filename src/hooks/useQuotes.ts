import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Quote } from '@/types/database';
import { useOutbox } from '@/stores/outboxStore';

export function useQuotes(status?: string) {
  const ops = useOutbox(s => s.ops);

  const query = useQuery({
    queryKey: ['quotes', status],
    queryFn: async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      try {
        let query = supabase
          .from('quotes')
          .select('*, companies(company_name, cnpj)')
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal);
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) throw error;
        return data as Quote[];
      } finally {
        clearTimeout(t);
      }
    },
  });

  // Merge orçamentos pendentes (criados offline) na lista
  const pendingQuotes: Quote[] = ops
    .filter(o => o.type === 'quote.create' && o.tempId)
    .filter(o => !status || o.payload.status === status)
    .map(o => ({
      id: o.tempId!,
      ...(o.payload as any),
      _pendingSync: true,
    } as Quote & { _pendingSync?: boolean }));

  const merged: Quote[] = [
    ...pendingQuotes,
    ...(query.data ?? []),
  ];

  return {
    ...query,
    data: merged,
  };
}
