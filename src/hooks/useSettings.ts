/**
 * @module useSettings
 * Hooks de dados de configuração (plan_configs, ghe_table, trainings, discounts).
 *
 * Auth guard: queries só habilitadas após sessão estar restaurada.
 * Esses dados mudam raramente — staleTime maior para reduzir requisições.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import type { PlanConfig, GheTable, Training, TrainingDiscount } from '@/types/database';

const TAG = 'useSettings';

/** Timeout padrão para queries de configuração. */
function makeAbort(ms = 10_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(t) };
}

export function usePlanConfigs() {
  const { session, initialized } = useAuthStore();

  return useQuery({
    queryKey: ['plan_configs'],
    enabled: initialized && !!session,
    staleTime: 1000 * 60 * 30, // 30 min — muda raramente
    queryFn: async () => {
      logger.debug(TAG, 'Buscando plan_configs...');
      const { signal, clear } = makeAbort();
      try {
        const { data, error } = await supabase
          .from('plan_configs')
          .select('*')
          .order('key')
          .abortSignal(signal);
        if (error) { logger.error(TAG, 'Erro plan_configs', error.message); throw error; }
        logger.info(TAG, `${data?.length ?? 0} plan_configs carregados`);
        return data as PlanConfig[];
      } finally { clear(); }
    },
  });
}

export function useGheTable() {
  const { session, initialized } = useAuthStore();

  return useQuery({
    queryKey: ['ghe_table'],
    enabled: initialized && !!session,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      logger.debug(TAG, 'Buscando ghe_table...');
      const { signal, clear } = makeAbort();
      try {
        const { data, error } = await supabase
          .from('ghe_table')
          .select('*')
          .order('risk_grade')
          .abortSignal(signal);
        if (error) { logger.error(TAG, 'Erro ghe_table', error.message); throw error; }
        logger.info(TAG, `${data?.length ?? 0} entradas GHE carregadas`);
        return data as GheTable[];
      } finally { clear(); }
    },
  });
}

export function useTrainings(onlyActive = false) {
  const { session, initialized } = useAuthStore();

  return useQuery({
    queryKey: ['trainings', onlyActive],
    enabled: initialized && !!session,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      logger.debug(TAG, `Buscando trainings (onlyActive=${onlyActive})...`);
      const { signal, clear } = makeAbort();
      try {
        let q = supabase
          .from('trainings')
          .select('*')
          .order('order_index')
          .abortSignal(signal);
        if (onlyActive) q = q.eq('is_active', true);
        const { data, error } = await q;
        if (error) { logger.error(TAG, 'Erro trainings', error.message); throw error; }
        logger.info(TAG, `${data?.length ?? 0} treinamentos carregados`);
        return data as Training[];
      } finally { clear(); }
    },
  });
}

export function useTrainingDiscounts() {
  const { session, initialized } = useAuthStore();

  return useQuery({
    queryKey: ['training_discounts'],
    enabled: initialized && !!session,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      logger.debug(TAG, 'Buscando training_discounts...');
      const { signal, clear } = makeAbort();
      try {
        const { data, error } = await supabase
          .from('training_discounts')
          .select('*')
          .abortSignal(signal);
        if (error) { logger.error(TAG, 'Erro training_discounts', error.message); throw error; }
        return data as TrainingDiscount[];
      } finally { clear(); }
    },
  });
}
