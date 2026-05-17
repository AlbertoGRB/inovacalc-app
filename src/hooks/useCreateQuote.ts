/**
 * @module useCreateQuote
 * Mutation para criar orçamentos com suporte offline-first.
 *
 * Fluxo online:
 *   1. Gera número ORÇ-YYYYMMDD-XXXX via query no banco
 *   2. Insere quotes → plan_quote_details → training_quote_details + items
 *   3. Invalida cache → lista atualizada
 *
 * Fluxo offline:
 *   1. Cálculos são feitos localmente (sem rede)
 *   2. Número local PEND-YYYYMMDD-UUID8 usado como placeholder
 *   3. Payload completo (quote + detalhes aninhados) enfileirado na outbox
 *   4. Atualização otimista do cache local → aparece imediatamente na lista
 *   5. Quando internet voltar, flushOutbox() processa e gera o número real
 */

import { onlineManager, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useOutbox, makeLocalId } from '@/stores/outboxStore';
import { QuoteDraftState } from '@/stores/quoteDraftStore';
import { calculatePlans, calculateTrainings, type PlanResult } from '@/lib/calculations';
import { DEFAULT_TRAININGS } from '@/lib/trainings-catalog';
import {
  PlanConfig, GheTable, TrainingDiscount,
  QuoteStatus, QuoteType, PlanType, Quote,
} from '@/types/database';
import { isNetworkError } from '@/lib/sync';
import { DEFAULT_TRAINING_DISCOUNTS } from '@/lib/constants';
import { scheduleQuoteExpiryNotifications } from '@/lib/notifications';
import { updateClickUpQuoteValue, updateClickUpPlan } from '@/lib/clickup';

type CreateQuoteInput = {
  draft: QuoteDraftState;
  configs: PlanConfig[];
  ghe: GheTable[];
  discounts?: TrainingDiscount[];
  status?: QuoteStatus;
  notes?: string | null;
};

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
    mutationFn: async ({ draft, configs, ghe, discounts, status = 'DRAFT', notes = null }: CreateQuoteInput) => {
      if (!draft.company) throw new Error('Selecione uma empresa antes de salvar.');
      if (!userId)        throw new Error('Sessão inválida.');

      // ── 1. Cálculos locais (sem rede) ────────────────────────────────────
      const plansResult = calculatePlans(draft.planConfig, configs, ghe);
      const planResult  = draft.include.plan && draft.selectedPlan
        ? pickPlanResult(plansResult, draft.selectedPlan)
        : null;

      const trainingItems = draft.trainings.map(sel => {
        const t = DEFAULT_TRAININGS.find(x => x.id === sel.trainingId);
        return {
          trainingId: sel.trainingId,
          quantity:   sel.quantity,
          unitValue:  t?.value ?? 0,
          totalValue: (t?.value ?? 0) * sel.quantity,
        };
      });
      const trainingResult = draft.include.trainings && trainingItems.length > 0
        ? calculateTrainings(
            { clientType: draft.asClientType(), additionalDiscount: 0, items: trainingItems },
            discounts ?? DEFAULT_TRAINING_DISCOUNTS,
          )
        : null;

      const totalAnnual = (planResult?.finalValueWithDiscount ?? 0) + (trainingResult?.finalValue ?? 0);
      const monthly     = totalAnnual / 12;
      const type: QuoteType =
        planResult && trainingResult ? 'BOTH'
        : trainingResult              ? 'TRAINING'
        :                               'PLAN';

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      const validUntilStr = validUntil.toISOString().slice(0, 10);
      const nowIso        = new Date().toISOString();

      // ── 2. Payloads (montados localmente, usados em ambos os caminhos) ───
      const quotePayload = {
        company_id:    draft.company.id,
        type,
        status,
        total_value:   totalAnnual,
        monthly_value: monthly,
        valid_until:   validUntilStr,
        notes,
        created_by:    userId,
      };

      const planDetailsPayload = planResult && draft.selectedPlan ? {
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
      } : null;

      const trainingDetailsPayload = trainingResult ? {
        client_type:         draft.asClientType(),
        additional_discount: 0,
        subtotal:            trainingResult.subtotal,
        plan_discount:       trainingResult.planDiscount,
        final_value:         trainingResult.finalValue,
        monthly_value:       trainingResult.monthlyValue,
        items:               trainingItems,
      } : null;

      // ── 3. OFFLINE — enfileira na outbox e atualiza cache otimisticamente ─
      if (!onlineManager.isOnline()) {
        const tempId  = makeLocalId();
        const dateStr = nowIso.slice(0, 10).replace(/-/g, '');
        const localNumber = `PEND-${dateStr}-${tempId.slice(0, 8).toUpperCase()}`;

        useOutbox.getState().enqueue({
          type:   'quote.create',
          tempId,
          payload: {
            quote:            { ...quotePayload, quote_number: localNumber },
            planDetails:      planDetailsPayload,
            trainingDetails:  trainingDetailsPayload,
          },
        });

        // Adiciona ao cache local para aparecer imediatamente na lista
        const optimistic: Quote = {
          id:            tempId,
          quote_number:  localNumber,
          payment_terms: null,
          pdf_url:       null,
          signature_url: null,
          approved_at:   null,
          rejected_at:   null,
          created_at:    nowIso,
          updated_at:    nowIso,
          ...quotePayload,
          companies: {
            company_name: draft.company.company_name,
            cnpj:         draft.company.cnpj ?? '',
          },
        };
        queryClient.setQueryData<Quote[]>(['quotes'], (old = []) => [optimistic, ...old]);

        return optimistic;
      }

      // ── 4. ONLINE — insere diretamente no banco ───────────────────────────
      try {
        const quoteNumber = await generateQuoteNumber();

        const { data: quote, error: quoteErr } = await supabase
          .from('quotes')
          .insert({ ...quotePayload, quote_number: quoteNumber })
          .select()
          .single();
        if (quoteErr) throw quoteErr;

        if (planDetailsPayload) {
          const { error } = await supabase
            .from('plan_quote_details')
            .insert({ ...planDetailsPayload, quote_id: quote.id });
          if (error) throw error;
        }

        if (trainingDetailsPayload) {
          const { items, ...detailFields } = trainingDetailsPayload;
          const { data: tDetail, error: tErr } = await supabase
            .from('training_quote_details')
            .insert({ ...detailFields, quote_id: quote.id })
            .select()
            .single();
          if (tErr) throw tErr;

          const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const itemsToInsert = items
            .filter((it: typeof items[number]) => uuidRe.test(it.trainingId))
            .map((it: typeof items[number]) => ({
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
      } catch (e) {
        // Perdeu conexão no meio da operação → enfileira para retry
        if (isNetworkError(e)) {
          const tempId  = makeLocalId();
          const dateStr = nowIso.slice(0, 10).replace(/-/g, '');
          const localNumber = `PEND-${dateStr}-${tempId.slice(0, 8).toUpperCase()}`;

          useOutbox.getState().enqueue({
            type:   'quote.create',
            tempId,
            payload: {
              quote:           { ...quotePayload, quote_number: localNumber },
              planDetails:     planDetailsPayload,
              trainingDetails: trainingDetailsPayload,
            },
          });

          const optimistic: Quote = {
            id:            tempId,
            quote_number:  localNumber,
            payment_terms: null,
            pdf_url:       null,
            signature_url: null,
            approved_at:   null,
            rejected_at:   null,
            created_at:    nowIso,
            updated_at:    nowIso,
            ...quotePayload,
            companies: {
              company_name: draft.company.company_name,
              cnpj:         draft.company.cnpj ?? '',
            },
          };
          queryClient.setQueryData<Quote[]>(['quotes'], (old = []) => [optimistic, ...old]);
          return optimistic;
        }
        throw e;
      }
    },

    onSuccess: (_data, variables) => {
      // Só invalida se veio do caminho online (ID é UUID real, não tempId)
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (_data && uuidRe.test(_data.id)) {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
      // Schedule expiry notifications for the new quote
      if (_data) {
        scheduleQuoteExpiryNotifications(
          _data.id,
          _data.quote_number,
          _data.valid_until,
        ).catch(() => {});
      }
      // Update ClickUp task with quote value + plan
      if (_data && variables.draft.company?.clickup_task_id) {
        const taskId = variables.draft.company.clickup_task_id;
        updateClickUpQuoteValue(
          taskId,
          variables.draft.company as any,
          _data.total_value ?? 0,
        ).catch(() => {});
        // Update plan dropdown
        if (variables.draft.selectedPlan) {
          const hasTrainings = variables.draft.include.trainings && variables.draft.trainings.length > 0;
          updateClickUpPlan(taskId, variables.draft.selectedPlan, hasTrainings).catch(() => {});
        }
      }
    },
  });
}
