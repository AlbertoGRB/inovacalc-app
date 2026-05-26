import { PlanConfig, TrainingDiscount, ClientType } from '@/types/database';

// ── Tipos de entrada/saída ─────────────────────────────────────

export interface PlanCalculatorInputs {
  riskGrade: number;
  numFuncionarios: number;
  totalFunctions: number;
  qtdQuantificacoes: number;
  hasInsalubridade: boolean;
  periculosidadeQty: number;
  hasKm: boolean;
  kmDeslocamento: number;
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
  additionalDiscount: number;
  essencial: PlanResult;
  integral: PlanResult;
  avancado: PlanResult;
  selectedPlan: string | null;
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

function getConfig(configs: PlanConfig[], key: string): number {
  return configs.find(c => c.key === key)?.value ?? 0;
}

function getMargem(riskGrade: number, configs: PlanConfig[]): number {
  return getConfig(configs, `margem_g${riskGrade}`) / 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calcularCustoGestao(
  numFuncionarios: number,
  valorBase: number,
  valorPorFuncionario: number
): number {
  if (numFuncionarios <= 10) return valorBase;
  return (numFuncionarios - 10) * valorPorFuncionario;
}

// ── Calculadora de Planos ──────────────────────────────────────

function aplicarMargemEImposto(
  baseCost: number,
  margem: number,
  imposto: number,
  additionalDiscount: number,
): Omit<PlanResult, 'baseCost' | 'hasCipa'> {
  const subtotal = round2(baseCost / (1 - margem));
  const margin = round2(subtotal - baseCost);
  const tax = round2(subtotal * (imposto / 100));
  const finalValue = round2(subtotal + tax);
  const discountValue = round2(finalValue * (additionalDiscount / 100));
  const finalValueWithDiscount = round2(finalValue - discountValue);
  const monthlyValue = round2(finalValueWithDiscount / 12);
  return { margin, subtotal, tax, finalValue, discountValue, finalValueWithDiscount, monthlyValue };
}

export function calculatePlans(
  inputs: PlanCalculatorInputs,
  configs: PlanConfig[],
): PlansCalculationResult {
  const {
    riskGrade, numFuncionarios, totalFunctions,
    qtdQuantificacoes, hasInsalubridade, periculosidadeQty,
    hasKm, kmDeslocamento, additionalDiscount,
  } = inputs;

  const qtdAvaliacoes = totalFunctions;
  const qtdLaudos = totalFunctions;
  const effectiveKm = hasKm ? kmDeslocamento : 0;

  const margem = getMargem(riskGrade, configs);
  const imposto = getConfig(configs, 'imposto');

  const respTecnica = getConfig(configs, 'resp_tecnica');
  const tst = getConfig(configs, `tst_g${riskGrade}`);
  const art = getConfig(configs, `art_g${riskGrade}`);
  const ruido = getConfig(configs, 'ruido');
  const horaTecnica = getConfig(configs, 'hora_tecnica');
  const quantificacao = getConfig(configs, 'quantificacao');
  const deslocEssencial = getConfig(configs, 'deslocamento_km');
  const deslocIntegral = getConfig(configs, 'deslocamento_integral');
  const auditoriaESocial = getConfig(configs, 'auditoria_esocial');
  const gestaoBase = getConfig(configs, 'gestao_base');
  const gestaoPorFunc = getConfig(configs, 'gestao_por_funcionario');
  const visitaTecnica = getConfig(configs, 'visita_tecnica');
  const cipaValor = getConfig(configs, 'cipa');

  // ── ESSENCIAL ──
  const ruidoEssencial = riskGrade === 4 ? 0 : ruido;

  const insalubridadeValor = hasInsalubridade ? getConfig(configs, 'insalubridade') : 0;
  const periculosidadeValor = periculosidadeQty * getConfig(configs, 'periculosidade');

  const custoEssencial = round2(
    (qtdAvaliacoes * horaTecnica) +
    (qtdLaudos * horaTecnica) +
    (qtdQuantificacoes * quantificacao) +
    (effectiveKm * deslocEssencial) +
    respTecnica + tst + art + ruidoEssencial +
    insalubridadeValor + periculosidadeValor
  );

  const essencial: PlanResult = {
    baseCost: custoEssencial,
    ...aplicarMargemEImposto(custoEssencial, margem, imposto, additionalDiscount),
    hasCipa: false,
  };

  // ── INTEGRAL ──
  const gestaoESocial = calcularCustoGestao(numFuncionarios, gestaoBase, gestaoPorFunc);
  const gestaoPeriodicos = calcularCustoGestao(numFuncionarios, gestaoBase, gestaoPorFunc);

  const custoIntegral = round2(
    (qtdAvaliacoes * horaTecnica) +
    (qtdLaudos * horaTecnica) +
    (qtdQuantificacoes * quantificacao) +
    (effectiveKm * deslocIntegral) +
    respTecnica + tst + art + ruido +
    insalubridadeValor + periculosidadeValor +
    auditoriaESocial + gestaoESocial + gestaoPeriodicos
  );

  const integral: PlanResult = {
    baseCost: custoIntegral,
    ...aplicarMargemEImposto(custoIntegral, margem, imposto, additionalDiscount),
    hasCipa: false,
  };

  // ── AVANÇADO ──
  const catGestao = calcularCustoGestao(numFuncionarios, gestaoBase, gestaoPorFunc);
  const epiGestao = calcularCustoGestao(numFuncionarios, gestaoBase, gestaoPorFunc);

  const custoAvancado = round2(
    custoIntegral + visitaTecnica + catGestao + epiGestao + cipaValor
  );

  const avancado: PlanResult = {
    baseCost: custoAvancado,
    ...aplicarMargemEImposto(custoAvancado, margem, imposto, additionalDiscount),
    hasCipa: true,
  };

  return { additionalDiscount, essencial, integral, avancado, selectedPlan: null };
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
