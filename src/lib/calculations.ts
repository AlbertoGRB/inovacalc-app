import { PlanConfig, GheTable, TrainingDiscount, ClientType } from '@/types/database';
import { CIPA_RULES } from '@/lib/constants';

// ── Tipos de entrada/saída ─────────────────────────────────────

export interface PlanCalculatorInputs {
  riskGrade: number;
  totalFunctions: number;
  totalEmployees: number;
  quantificationQty: number;
  hasInsalubridade: boolean;
  periculosidadeQty: number;
  deslocamentoKm: number;
  additionalDiscount: number;
}

export interface PlanResult {
  baseCost: number;
  margin: number;
  subtotal: number;
  tax: number;
  finalValue: number;
  discountValue: number;
  finalValueWithDiscount: number;
  monthlyValue: number;
  hasCipa: boolean;
}

export interface PlansCalculationResult {
  gheValue: number;
  essencial: PlanResult;
  integral: PlanResult;
  avancado: PlanResult;
}

export interface TrainingItem {
  trainingId: string;
  quantity: number;
  totalValue: number;
}

export interface TrainingCalculatorInputs {
  clientType: ClientType;
  additionalDiscount: number;
  items: TrainingItem[];
}

export interface TrainingsCalculationResult {
  subtotal: number;
  planDiscount: number;
  planDiscountValue: number;
  additionalDiscountValue: number;
  finalValue: number;
  monthlyValue: number;
}

// ── Helpers internos ───────────────────────────────────────────

function getGheValue(riskGrade: number, totalFunctions: number, gheTable: GheTable[]): number {
  const range = totalFunctions <= 5 ? 5 : totalFunctions <= 10 ? 10 : 20;
  const row = gheTable.find(r => r.risk_grade === riskGrade && r.function_range === range);
  return row?.value ?? 0;
}

function getMargem(riskGrade: number, configs: PlanConfig[]): number {
  const cfg = configs.find(c => c.key === `margem_g${riskGrade}`);
  return (cfg?.value ?? 40) / 100;
}

function getCfg(configs: PlanConfig[], key: string): number {
  return configs.find(c => c.key === key)?.value ?? 0;
}

function applyMarginAndTax(
  baseCost: number,
  margem: number,
  imposto: number,
  additionalDiscount: number,
): Omit<PlanResult, 'baseCost' | 'hasCipa'> {
  const margin = baseCost * margem;
  const subtotal = baseCost + margin;
  const tax = subtotal * (imposto / 100);
  const finalValue = subtotal + tax;
  const discountValue = finalValue * (additionalDiscount / 100);
  const finalValueWithDiscount = finalValue - discountValue;
  const monthlyValue = finalValueWithDiscount / 12;
  return { margin, subtotal, tax, finalValue, discountValue, finalValueWithDiscount, monthlyValue };
}

// ── Calculadora de Planos ──────────────────────────────────────

export function calculatePlans(
  inputs: PlanCalculatorInputs,
  configs: PlanConfig[],
  gheTable: GheTable[],
): PlansCalculationResult {
  const {
    riskGrade, totalFunctions, totalEmployees,
    quantificationQty, hasInsalubridade, periculosidadeQty,
    deslocamentoKm, additionalDiscount,
  } = inputs;

  const margem       = getMargem(riskGrade, configs);
  const imposto      = getCfg(configs, 'imposto');
  const gheValue     = getGheValue(riskGrade, totalFunctions, gheTable);

  const respTecnica  = getCfg(configs, 'resp_tecnica');
  const tst          = getCfg(configs, 'tst');
  const ruido        = getCfg(configs, 'ruido');
  const cipaValor    = getCfg(configs, 'cipa');
  const visitaTec    = getCfg(configs, 'visita_tecnica');
  const quantUnit    = getCfg(configs, 'quantificacao');
  const insalubUnit  = getCfg(configs, 'insalubridade');
  const pericUnit    = getCfg(configs, 'periculosidade');
  const deslocUnit   = getCfg(configs, 'deslocamento_km');
  const nr01Unit     = getCfg(configs, 'nr01');
  const esocialUnit  = getCfg(configs, 'esocial');
  const periodicoUnit= getCfg(configs, 'periodico');
  const catUnit      = getCfg(configs, 'cat');
  const epiUnit      = getCfg(configs, 'epi');

  const custoEssencial =
    respTecnica + tst + ruido + gheValue +
    nr01Unit * totalEmployees +
    quantUnit * quantificationQty +
    (hasInsalubridade ? insalubUnit : 0) +
    pericUnit * periculosidadeQty +
    deslocUnit * deslocamentoKm;

  const essencial: PlanResult = {
    baseCost: custoEssencial,
    ...applyMarginAndTax(custoEssencial, margem, imposto, additionalDiscount),
    hasCipa: false,
  };

  const custoIntegral = custoEssencial + esocialUnit * totalEmployees + periodicoUnit * totalEmployees;
  const integral: PlanResult = {
    baseCost: custoIntegral,
    ...applyMarginAndTax(custoIntegral, margem, imposto, additionalDiscount),
    hasCipa: false,
  };

  const hasCipa = totalEmployees >= (CIPA_RULES[riskGrade] ?? 999);
  const custoAvancado =
    custoIntegral + visitaTec +
    catUnit * totalEmployees +
    epiUnit * totalEmployees +
    (hasCipa ? cipaValor : 0);

  const avancado: PlanResult = {
    baseCost: custoAvancado,
    ...applyMarginAndTax(custoAvancado, margem, imposto, additionalDiscount),
    hasCipa,
  };

  return { gheValue, essencial, integral, avancado };
}

// ── Calculadora de Treinamentos ────────────────────────────────

export function calculateTrainings(
  inputs: TrainingCalculatorInputs,
  discounts: TrainingDiscount[],
): TrainingsCalculationResult {
  const { clientType, additionalDiscount, items } = inputs;

  const subtotal = items.reduce((sum, item) => sum + item.totalValue, 0);
  const planDiscount = discounts.find(d => d.plan_type === clientType)?.discount_percent ?? 0;
  const planDiscountValue = subtotal * (planDiscount / 100);
  const afterPlan = subtotal - planDiscountValue;
  const additionalDiscountValue = afterPlan * (additionalDiscount / 100);
  const finalValue = afterPlan - additionalDiscountValue;
  const monthlyValue = finalValue / 12;

  return { subtotal, planDiscount, planDiscountValue, additionalDiscountValue, finalValue, monthlyValue };
}
