import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Returns the list of company_ids that the current user has favorited.
 */
export function useFavorites() {
  const { session, initialized } = useAuthStore();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_favorites')
        .select('company_id')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? []).map(f => f.company_id) as string[];
    },
    enabled: initialized && !!session && !!userId,
  });
}

/**
 * Toggle a company as favorite (add or remove).
 * Uses optimistic update for instant UI feedback.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user?.id);

  return useMutation({
    mutationFn: async (companyId: string) => {
      if (!userId) throw new Error('Not authenticated');

      const currentFavorites = queryClient.getQueryData<string[]>(['favorites', userId]) ?? [];
      const isFavorited = currentFavorites.includes(companyId);

      if (isFavorited) {
        const { error } = await supabase
          .from('company_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('company_id', companyId);
        if (error) throw error;
        return { companyId, action: 'removed' as const };
      } else {
        const { error } = await supabase
          .from('company_favorites')
          .insert({ user_id: userId, company_id: companyId });
        if (error) throw error;
        return { companyId, action: 'added' as const };
      }
    },

    onMutate: async (companyId: string) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', userId] });
      const previous = queryClient.getQueryData<string[]>(['favorites', userId]) ?? [];

      const isFavorited = previous.includes(companyId);
      const next = isFavorited
        ? previous.filter(id => id !== companyId)
        : [...previous, companyId];

      queryClient.setQueryData(['favorites', userId], next);
      return { previous };
    },

    onError: (_err, _companyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites', userId], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });
}
