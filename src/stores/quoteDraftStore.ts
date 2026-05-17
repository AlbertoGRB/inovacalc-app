/**
 * @module quoteDraftStore
 * Store Zustand para o rascunho de orçamento em criação.
 *
 * Mantém em memória (não persistido) todos os dados da wizard de orçamento:
 *   1. Empresa selecionada
 *   2. Flags de inclusão (plano / treinamentos / extras)
 *   3. Configuração do plano (risco, dimensões, descontos)
 *   4. Plano selecionado
 *   5. Treinamentos escolhidos
 *
 * Não persiste em AsyncStorage intencionalmente — um rascunho parcial
 * corromperia a wizard ao reabrir o app.
 */

import { create } from 'zustand';
import type { Company, PlanType, ClientType } from '@/types/database';

// ─── Tipos públicos ────────────────────────────────────────────────────────

export interface IncludeFlags {
  /** Incluir cálculo de plano SST (Essencial / Integral / Avançado). */
  plan: boolean;
  /** Incluir treinamentos (NRs, combos). */
  trainings: boolean;
  /** Incluir serviços avulsos (quantificação, ruído, periculosidade). */
  extras: boolean;
}

export interface PlanDraftConfig {
  /** Grau de risco da empresa (1–4). */
  riskGrade: 1 | 2 | 3 | 4;
  /** Total de funções (GHE lookup). */
  totalFunctions: number;
  /** Total de funcionários. */
  totalEmployees: number;
  /** Quantidade de quantificações. */
  quantificationQty: number;
  /** Quantidade de laudos de periculosidade. */
  periculosidadeQty: number;
  /** Distância de deslocamento em km. */
  deslocamentoKm: number;
  /** Possui laudo de insalubridade. */
  hasInsalubridade: boolean;
  /** Desconto adicional aplicado manualmente (0–50%). */
  additionalDiscount: number;
}

export interface TrainingSelection {
  trainingId: string;
  quantity: number;
}

export interface QuoteDraftState {
  // ── Estado ──────────────────────────────────────────────────────────────
  company: Company | null;
  include: IncludeFlags;
  planConfig: PlanDraftConfig;
  selectedPlan: PlanType | null;
  trainings: TrainingSelection[];
  /** Empresa recém-criada, para auto-selecionar ao voltar para a wizard. */
  pendingCompany: Company | null;

  // ── Computed ─────────────────────────────────────────────────────────────
  /**
   * Retorna o tipo de cliente para desconto de treinamentos.
   * Se nenhum plano foi selecionado, retorna 'NONE'.
   */
  asClientType: () => ClientType;

  // ── Actions ──────────────────────────────────────────────────────────────
  setCompany: (company: Company | null) => void;
  toggleInclude: (key: keyof IncludeFlags) => void;
  setPlanConfig: (patch: Partial<PlanDraftConfig>) => void;
  setSelectedPlan: (plan: PlanType | null) => void;
  setTrainings: (trainings: TrainingSelection[]) => void;
  setPendingCompany: (company: Company | null) => void;
  reset: () => void;
}

// ─── Valores padrão ────────────────────────────────────────────────────────

const DEFAULT_INCLUDE: IncludeFlags = {
  plan: false,
  trainings: false,
  extras: false,
};

const DEFAULT_PLAN_CONFIG: PlanDraftConfig = {
  riskGrade: 1,
  totalFunctions: 1,
  totalEmployees: 1,
  quantificationQty: 0,
  periculosidadeQty: 0,
  deslocamentoKm: 0,
  hasInsalubridade: false,
  additionalDiscount: 0,
};

// ─── Store ─────────────────────────────────────────────────────────────────

export const useQuoteDraft = create<QuoteDraftState>((set, get) => ({
  company: null,
  include: { ...DEFAULT_INCLUDE },
  planConfig: { ...DEFAULT_PLAN_CONFIG },
  selectedPlan: null,
  trainings: [],
  pendingCompany: null,

  asClientType: (): ClientType => {
    const plan = get().selectedPlan;
    if (!plan) return 'NONE';
    // PlanType ('ESSENCIAL'|'INTEGRAL'|'AVANCADO') é subconjunto de ClientType
    return plan as ClientType;
  },

  setCompany: (company) => set({ company }),

  toggleInclude: (key) =>
    set((s) => ({ include: { ...s.include, [key]: !s.include[key] } })),

  setPlanConfig: (patch) =>
    set((s) => ({ planConfig: { ...s.planConfig, ...patch } })),

  setSelectedPlan: (plan) => set({ selectedPlan: plan }),

  setTrainings: (trainings) => set({ trainings }),

  setPendingCompany: (company) => set({ pendingCompany: company }),

  reset: () =>
    set({
      company: null,
      include: { ...DEFAULT_INCLUDE },
      planConfig: { ...DEFAULT_PLAN_CONFIG },
      selectedPlan: null,
      trainings: [],
      pendingCompany: null,
    }),
}));
