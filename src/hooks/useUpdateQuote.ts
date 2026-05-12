import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QuoteStatus } from '@/types/database';

type UpdateQuoteInput = {
  id: string;
  status?: QuoteStatus;
  notes?: string | null;
};

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateQuoteInput) => {
      const payload: Record<string, any> = { ...patch };
      if (patch.status === 'APPROVED') payload.approved_at = new Date().toISOString();
      if (patch.status === 'REJECTED') payload.rejected_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('quotes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', vars.id] });
    },
  });
}
