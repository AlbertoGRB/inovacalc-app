import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { QuoteDraftState } from '@/stores/quoteDraftStore';
import { calculatePlans, calculateTrainings, type PlanResult } from '@/lib/calculations';
import { DEFAULT_TRAININGS } from '@/lib/trainings-catalog';
import { PlanConfig, GheTable, TrainingDiscount, QuoteStatus, QuoteType, PlanType } from '@/types/database';

const DEFAULT_DISCOUNTS: TrainingDiscount[] = [
  { id: '1', plan_type: 'NONE',      discount_percent: 0,  updated_at: '' },
  { id: '2', plan_type: 'ESSENCIAL', discount_percent: 5,  updated_at: '' },
  { id: '3', plan_type: 'INTEGRAL',  discount_percent: 10, updated_at: '' },
  { id: '4', plan_type: 'AVANCADO',  discount_percent: 15, updated_at: '' },
];

type CreateQuoteInput = {
  draft: QuoteDraftState;
  configs: PlanConfig[];
  ghe: GheTable[];
  status?: QuoteStatus;
  notes?: string | null;
};

/** Gera número do orçamento no formato ORÇ-YYYYMMDD-XXXX (sequencial do dia). */
async function generateQuoteNumber(): Promise<string> {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `ORÇ-${yyyymmdd}-`;

  const { count } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .like('quote_number', `${prefix}%`);

  const seq = String((count ?? 0) + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

function pickPlanResult(result: ReturnType<typeof calculatePlans>, plan: PlanType): PlanResult {
  return plan === 'ESSENCIAL' ? result.essencial
       : plan === 'INTEGRAL'  ? result.integral
       :                        result.avancado;
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.profile?.id ?? null);

  return useMutation({
    mutationFn: async ({ draft, configs, ghe, status = 'DRAFT', notes = null }: CreateQuoteInput) => {
      if (!draft.company) throw new Error('Selecione uma empresa antes de salvar.');
      if (!userId)        throw new Error('Sessão inválida.');

      // 1) Calcula
      const plansResult = calculatePlans(draft.planConfig, configs, ghe);
      const planResult  = draft.include.plan && draft.selectedPlan
        ? pickPlanResult(plansResult, draft.selectedPlan)
        : null;

      const trainingItems = draft.trainings.map(sel => {
        const t = DEFAULT_TRAININGS.find(x => x.id === sel.trainingId);
        return {
          trainingId: sel.trainingId,
          quantity: sel.quantity,
          unitValue: t?.value ?? 0,
          totalValue: (t?.value ?? 0) * sel.quantity,
        };
      });
      const trainingResult = draft.include.trainings && trainingItems.length > 0
        ? calculateTrainings(
            { clientType: draft.asClientType(), additionalDiscount: 0, items: trainingItems },
            DEFAULT_DISCOUNTS,
          )
        : null;

      const totalAnnual = (planResult?.finalValueWithDiscount ?? 0) + (trainingResult?.finalValue ?? 0);
      const monthly     = totalAnnual / 12;

      // 2) Tipo
      const type: QuoteType =
        planResult && trainingResult ? 'BOTH'
        : trainingResult              ? 'TRAINING'
        :                               'PLAN';

      const quoteNumber = await generateQuoteNumber();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      // 3) Insert quote
      const { data: quote, error: quoteErr } = await supabase
        .from('quotes')
        .insert({
          quote_number:  quoteNumber,
          company_id:    draft.company.id,
          type,
          status,
          total_value:   totalAnnual,
          monthly_value: monthly,
          valid_until:   validUntil.toISOString().slice(0, 10),
          notes,
          created_by:    userId,
        })
        .select()
        .single();
      if (quoteErr) throw quoteErr;

      // 4) plan_quote_details (sempre — guarda o cálculo completo se houve seleção)
      if (planResult && draft.selectedPlan) {
        const { error } = await supabase.from('plan_quote_details').insert({
          quote_id:                quote.id,
          risk_grade:              draft.planConfig.riskGrade,
          total_functions:         draft.planConfig.totalFunctions,
          total_employees:         draft.planConfig.totalEmployees,
          quantification_qty:      draft.planConfig.quantificationQty,
          has_insalubridade:       draft.planConfig.hasInsalubridade,
          periculosidade_qty:      draft.planConfig.periculosidadeQty,
          deslocamento_km:         draft.planConfig.deslocamentoKm,
          ghe_value:               plansResult.gheValue,
          essencial_base_cost:     plansResult.essencial.baseCost,
          essencial_final_value:   plansResult.essencial.finalValueWithDiscount,
          essencial_monthly_value: plansResult.essencial.monthlyValue,
          integral_base_cost:      plansResult.integral.baseCost,
          integral_final_value:    plansResult.integral.finalValueWithDiscount,
          integral_monthly_value:  plansResult.integral.monthlyValue,
          advanced_base_cost:      plansResult.avancado.baseCost,
          advanced_final_value:    plansResult.avancado.finalValueWithDiscount,
          advanced_monthly_value:  plansResult.avancado.monthlyValue,
          selected_plan:           draft.selectedPlan,
        });
        if (error) throw error;
      }

      // 5) training_quote_details + items
      if (trainingResult) {
        const { data: tDetail, error: tErr } = await supabase
          .from('training_quote_details')
          .insert({
            quote_id:            quote.id,
            client_type:         draft.asClientType(),
            additional_discount: 0,
            subtotal:            trainingResult.subtotal,
            plan_discount:       trainingResult.planDiscount,
            final_value:         trainingResult.finalValue,
            monthly_value:       trainingResult.monthlyValue,
          })
          .select()
          .single();
        if (tErr) throw tErr;

        // Itens — somente os com training_id válido (UUID do banco). Os do catálogo
        // mock (DEFAULT_TRAININGS) usam IDs string não-UUID; pulamos quando inválido.
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const itemsToInsert = trainingItems
          .filter(it => uuidRe.test(it.trainingId))
          .map(it => ({
            training_quote_detail_id: tDetail.id,
            training_id:              it.trainingId,
            quantity:                 it.quantity,
            unit_value:               it.unitValue,
            total_value:              it.totalValue,
          }));
        if (itemsToInsert.length > 0) {
          const { error } = await supabase.from('training_quote_items').insert(itemsToInsert);
          if (error) throw error;
        }
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}
