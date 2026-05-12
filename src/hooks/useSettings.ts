import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PlanConfig, GheTable, Training, TrainingDiscount } from '@/types/database';

function withTimeout(ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(t) };
}

export function usePlanConfigs() {
  return useQuery({
    queryKey: ['plan_configs'],
    queryFn: async () => {
      const { signal, clear } = withTimeout(8000);
      try {
        const { data, error } = await supabase
          .from('plan_configs').select('*').order('key')
          .abortSignal(signal);
        if (error) throw error;
        return data as PlanConfig[];
      } finally { clear(); }
    },
  });
}

export function useGheTable() {
  return useQuery({
    queryKey: ['ghe_table'],
    queryFn: async () => {
      const { signal, clear } = withTimeout(8000);
      try {
        const { data, error } = await supabase
          .from('ghe_table').select('*').order('risk_grade')
          .abortSignal(signal);
        if (error) throw error;
        return data as GheTable[];
      } finally { clear(); }
    },
  });
}

export function useTrainings(onlyActive = false) {
  return useQuery({
    queryKey: ['trainings', onlyActive],
    queryFn: async () => {
      const { signal, clear } = withTimeout(8000);
      try {
        let query = supabase
          .from('trainings').select('*').order('order_index')
          .abortSignal(signal);
        if (onlyActive) query = query.eq('is_active', true);
        const { data, error } = await query;
        if (error) throw error;
        return data as Training[];
      } finally { clear(); }
    },
  });
}

export function useTrainingDiscounts() {
  return useQuery({
    queryKey: ['training_discounts'],
    queryFn: async () => {
      const { signal, clear } = withTimeout(8000);
      try {
        const { data, error } = await supabase
          .from('training_discounts').select('*')
          .abortSignal(signal);
        if (error) throw error;
        return data as TrainingDiscount[];
      } finally { clear(); }
    },
  });
}
