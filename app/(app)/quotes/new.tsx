import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  FlatList, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { colors, typography, radius } from '@/theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '@/stores/authStore';
import { useCompanies } from '@/hooks/useCompanies';
import { usePlanConfigs, useGheTable, useTrainings, useTrainingDiscounts } from '@/hooks/useSettings';
import {
  calculatePlans, calculateTrainings,
  PlansCalculationResult, TrainingsCalculationResult,
} from '@/lib/calculations';
import {
  DEFAULT_PLAN_CONFIGS, DEFAULT_GHE_TABLE, DEFAULT_TRAINING_DISCOUNTS,
  PLAN_COLORS, CLIENT_TYPE_OPTIONS, CIPA_RULES,
} from '@/lib/constants';
import { formatCurrency, maskCNPJ } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useOutbox, makeLocalId } from '@/stores/outboxStore';
import { flushOutbox, isNetworkError } from '@/lib/sync';
import { Company, ClientType, Training } from '@/types/database';

// ── Tipos locais ───────────────────────────────────────────────

type Step = 'company' | 'services' | 'plan' | 'trainings' | 'avulso' | 'summary';

interface Services {
  plan: boolean;
  trainings: boolean;
  avulso: boolean;
}

interface PlanForm {
  riskGrade: number;
  totalFunctions: string;
  totalEmployees: string;
  quantificationQty: string;
  hasInsalubridade: boolean;
  periculosidadeQty: string;
  deslocamentoKm: string;
  additionalDiscount: string;
}

// Serviços avulsos disponíveis
const AVULSO_SERVICES: { key: string; label: string; unit: string; isFixed: boolean }[] = [
  { key: 'resp_tecnica',    label: 'Responsabilidade Técnica',            unit: 'fixo',  isFixed: true  },
  { key: 'tst',             label: 'Entrega Técnica (TST)',                unit: 'fixo',  isFixed: true  },
  { key: 'ruido',           label: 'Avaliação de Ruído',                   unit: 'fixo',  isFixed: true  },
  { key: 'quantificacao',   label: 'Quantificação de GHEs',                unit: 'GHE',   isFixed: false },
  { key: 'insalubridade',   label: 'Laudo de Insalubridade',               unit: 'fixo',  isFixed: true  },
  { key: 'periculosidade',  label: 'Laudo de Periculosidade (por GHE)',    unit: 'GHE',   isFixed: false },
  { key: 'deslocamento_km', label: 'Deslocamento (por km)',                unit: 'km',    isFixed: false },
  { key: 'cipa',            label: 'CIPA',                                 unit: 'fixo',  isFixed: true  },
  { key: 'visita_tecnica',  label: 'Visita Técnica Bimestral',             unit: 'fixo',  isFixed: true  },
  { key: 'nr01',            label: 'Psicossocial NR-01 (por funcionário)', unit: 'func',  isFixed: false },
  { key: 'esocial',         label: 'eSocial (por funcionário)',             unit: 'func',  isFixed: false },
  { key: 'periodico',       label: 'Periódico (por funcionário)',           unit: 'func',  isFixed: false },
  { key: 'cat',             label: 'CAT / Afastados (por funcionário)',     unit: 'func',  isFixed: false },
  { key: 'epi',             label: 'Gestão de EPI (por funcionário)',       unit: 'func',  isFixed: false },
];

const DEFAULT_PLAN_FORM: PlanForm = {
  riskGrade: 1,
  totalFunctions: '',
  totalEmployees: '',
  quantificationQty: '0',
  hasInsalubridade: false,
  periculosidadeQty: '0',
  deslocamentoKm: '0',
  additionalDiscount: '0',
};

// ── Componente principal ───────────────────────────────────────

export default function NewQuoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { companyId } = useLocalSearchParams<{ companyId?: string }>();

  // Dados do Supabase
  const { data: companies, isLoading: loadingCompanies } = useCompanies();
  const { data: planConfigs } = usePlanConfigs();
  const { data: gheTable } = useGheTable();
  const { data: trainings, isLoading: loadingTrainings } = useTrainings(true);
  const { data: discounts } = useTrainingDiscounts();

  // Estado do wizard
  const [step, setStep] = useState<Step>('company');
  const [company, setCompany] = useState<Company | null>(null);

  // Pré-seleciona empresa se veio de /companies/new
  useEffect(() => {
    if (companyId && companies) {
      const found = companies.find(c => c.id === companyId);
      if (found) {
        setCompany(found);
        setStep('services');
      }
    }
  }, [companyId, companies]);
  const [services, setServices] = useState<Services>({ plan: false, trainings: false, avulso: false });
  const [companySearch, setCompanySearch] = useState('');

  // Estado do plano
  const [planForm, setPlanForm] = useState<PlanForm>(DEFAULT_PLAN_FORM);
  const [planResult, setPlanResult] = useState<PlansCalculationResult | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'essencial' | 'integral' | 'avancado' | null>(null);

  // Estado dos treinamentos
  const [clientType, setClientType] = useState<ClientType>('NONE');
  const [trainingQtys, setTrainingQtys] = useState<Record<string, number>>({});
  const [trainAddDiscount, setTrainAddDiscount] = useState('0');
  const [trainSearch, setTrainSearch] = useState('');

  // Estado dos avulsos
  const [avulsoQtys, setAvulsoQtys] = useState<Record<string, number>>({});
  const [avulsoMargin, setAvulsoMargin] = useState('40');

  const [saving, setSaving] = useState(false);
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null);

  // ── Navegação entre steps ────────────────────────────────────

  function getSteps(): Step[] {
    const s: Step[] = ['company', 'services'];
    if (services.plan) s.push('plan');
    if (services.trainings) s.push('trainings');
    if (services.avulso) s.push('avulso');
    s.push('summary');
    return s;
  }

  function goNext() {
    const steps = getSteps();
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  }

  function goBack() {
    const steps = getSteps();
    const idx = steps.indexOf(step);
    if (idx === 0) { router.back(); return; }
    setStep(steps[idx - 1]);
  }

  const currentIndex = getSteps().indexOf(step);
  const totalSteps = getSteps().length;

  // ── Cálculos derivados ────────────────────────────────────────

  const activeConfigs = planConfigs ?? DEFAULT_PLAN_CONFIGS;
  const activeGhe = gheTable ?? DEFAULT_GHE_TABLE;
  const activeDiscounts = discounts ?? DEFAULT_TRAINING_DISCOUNTS;

  const trainItems = useMemo(() => {
    if (!trainings) return [];
    return trainings
      .filter(t => (trainingQtys[t.id] ?? 0) > 0)
      .map(t => ({ trainingId: t.id, quantity: trainingQtys[t.id]!, totalValue: trainingQtys[t.id]! * t.value }));
  }, [trainings, trainingQtys]);

  const trainResult: TrainingsCalculationResult | null = useMemo(() => {
    if (trainItems.length === 0) return null;
    return calculateTrainings(
      { clientType, additionalDiscount: parseFloat(trainAddDiscount) || 0, items: trainItems },
      activeDiscounts,
    );
  }, [trainItems, clientType, trainAddDiscount, activeDiscounts]);

  const avulsoBaseCost = useMemo(() => {
    return AVULSO_SERVICES.reduce((sum, svc) => {
      const qty = avulsoQtys[svc.key] ?? 0;
      if (qty === 0) return sum;
      const unit = activeConfigs.find(c => c.key === svc.key)?.value ?? 0;
      return sum + qty * unit;
    }, 0);
  }, [avulsoQtys, activeConfigs]);

  const avulsoFinal = useMemo(() => {
    if (avulsoBaseCost === 0) return 0;
    const margin = (parseFloat(avulsoMargin) || 0) / 100;
    const imposto = activeConfigs.find(c => c.key === 'imposto')?.value ?? 8;
    return avulsoBaseCost * (1 + margin) * (1 + imposto / 100);
  }, [avulsoBaseCost, avulsoMargin, activeConfigs]);

  const selectedPlanResult = selectedPlan && planResult ? planResult[selectedPlan] : null;

  // ── Resumo geral ──────────────────────────────────────────────

  const totalAnual = (selectedPlanResult?.finalValueWithDiscount ?? 0)
    + (trainResult?.finalValue ?? 0)
    + avulsoFinal;

  const totalMensal = (selectedPlanResult?.monthlyValue ?? 0)
    + (trainResult?.monthlyValue ?? 0);

  // ── Salvar orçamento ──────────────────────────────────────────

  async function handleSave() {
    if (!company || !user) return;
    if (!services.plan && !services.trainings && !services.avulso) {
      Alert.alert('Atenção', 'Selecione ao menos um serviço para o orçamento.');
      return;
    }

    setSaving(true);
    const dt = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const quoteNumber = `ORC-${dt}-${rand}`;

    const type = (services.plan || services.avulso) && services.trainings
      ? 'BOTH'
      : services.trainings
      ? 'TRAINING'
      : 'PLAN';

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const notes = [
      services.plan && selectedPlan
        ? `Plano ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}: ${formatCurrency(selectedPlanResult?.monthlyValue ?? 0)}/mês`
        : null,
      services.trainings && trainResult
        ? `Treinamentos: ${formatCurrency(trainResult.finalValue)}`
        : null,
      services.avulso && avulsoFinal > 0
        ? `Serviços avulsos: ${formatCurrency(avulsoFinal)}`
        : null,
    ].filter(Boolean).join(' | ');

    const quotePayload = {
      quote_number: quoteNumber,
      company_id: company.id,
      type,
      status: 'DRAFT',
      total_value: totalAnual,
      monthly_value: totalMensal,
      valid_until: validUntil.toISOString().split('T')[0],
      notes,
      created_by: user.id,
    };

    try {
      const { error } = await supabase.from('quotes').insert(quotePayload);
      if (error) throw error;
      setSavedQuoteNumber(quoteNumber);
    } catch (e: any) {
      if (isNetworkError(e)) {
        // Offline — salva na fila com tempId, gera o orçamento mesmo assim
        const tempId = makeLocalId();
        useOutbox.getState().enqueue({
          type: 'quote.create',
          tempId,
          payload: quotePayload,
        });
        setSavedQuoteNumber(quoteNumber);
        flushOutbox().catch(() => {});
      } else {
        Alert.alert('Erro', 'Não foi possível salvar o orçamento. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────

  const STEP_TITLES: Record<Step, string> = {
    company:   'Selecionar Empresa',
    services:  'O que incluir',
    plan:      'Configurar Plano',
    trainings: 'Selecionar Treinamentos',
    avulso:    'Serviços Avulsos',
    summary:   'Resumo do Orçamento',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary[900],
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={goBack}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconChevronLeft size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.sm,
              color: 'rgba(255,255,255,0.8)',
            }}>Voltar</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.xl,
              color: colors.neutral.white,
            }}>{STEP_TITLES[step]}</Text>
            {company && step !== 'company' && (
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.xs,
                color: 'rgba(255,255,255,0.65)',
              }} numberOfLines={1}>{company.company_name}</Text>
            )}
          </View>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.xs,
            color: 'rgba(255,255,255,0.5)',
          }}>{currentIndex + 1}/{totalSteps}</Text>
        </View>

        {/* Barra de progresso */}
        <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <View style={{
            height: 3, borderRadius: 2,
            backgroundColor: colors.neutral.white,
            width: `${((currentIndex + 1) / totalSteps) * 100}%`,
          }} />
        </View>
      </View>

      {/* Conteúdo do step */}
      {step === 'company' && (
        <StepCompany
          companies={companies ?? []}
          loading={loadingCompanies}
          search={companySearch}
          onSearch={setCompanySearch}
          selected={company}
          onSelect={c => { setCompany(c); goNext(); }}
        />
      )}

      {step === 'services' && (
        <StepServices
          services={services}
          onChange={setServices}
          onNext={() => {
            if (!services.plan && !services.trainings && !services.avulso) {
              Alert.alert('Atenção', 'Selecione ao menos um tipo de serviço.');
              return;
            }
            goNext();
          }}
        />
      )}

      {step === 'plan' && (
        <StepPlan
          form={planForm}
          onChange={setPlanForm}
          result={planResult}
          selectedPlan={selectedPlan}
          onCalculate={() => {
            const funcs = parseInt(planForm.totalFunctions) || 0;
            const emps = parseInt(planForm.totalEmployees) || 0;
            if (funcs <= 0 || emps <= 0) {
              Alert.alert('Atenção', 'Informe número de funções e funcionários.');
              return;
            }
            const r = calculatePlans(
              {
                riskGrade: planForm.riskGrade,
                totalFunctions: funcs,
                totalEmployees: emps,
                quantificationQty: parseInt(planForm.quantificationQty) || 0,
                hasInsalubridade: planForm.hasInsalubridade,
                periculosidadeQty: parseInt(planForm.periculosidadeQty) || 0,
                deslocamentoKm: parseFloat(planForm.deslocamentoKm) || 0,
                additionalDiscount: parseFloat(planForm.additionalDiscount) || 0,
              },
              activeConfigs,
              activeGhe,
            );
            setPlanResult(r);
          }}
          onSelectPlan={setSelectedPlan}
          onNext={() => {
            if (!selectedPlan) { Alert.alert('Atenção', 'Selecione um plano calculado.'); return; }
            goNext();
          }}
        />
      )}

      {step === 'trainings' && (
        <StepTrainings
          trainings={trainings ?? []}
          loading={loadingTrainings}
          clientType={clientType}
          onClientType={setClientType}
          quantities={trainingQtys}
          onQty={(id, delta) => setTrainingQtys(prev => {
            const next = Math.max(0, (prev[id] ?? 0) + delta);
            if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
            return { ...prev, [id]: next };
          })}
          additionalDiscount={trainAddDiscount}
          onAddDiscount={setTrainAddDiscount}
          search={trainSearch}
          onSearch={setTrainSearch}
          result={trainResult}
          onNext={goNext}
        />
      )}

      {step === 'avulso' && (
        <StepAvulso
          configs={activeConfigs}
          quantities={avulsoQtys}
          onQty={(key, delta, isFixed) => setAvulsoQtys(prev => {
            const current = prev[key] ?? 0;
            if (isFixed) { return { ...prev, [key]: current > 0 ? 0 : 1 }; }
            const next = Math.max(0, current + delta);
            if (next === 0) { const { [key]: _, ...rest } = prev; return rest; }
            return { ...prev, [key]: next };
          })}
          margin={avulsoMargin}
          onMargin={setAvulsoMargin}
          baseCost={avulsoBaseCost}
          finalCost={avulsoFinal}
          onNext={goNext}
        />
      )}

      {step === 'summary' && (
        <StepSummary
          company={company!}
          services={services}
          planLabel={selectedPlan}
          planResult={selectedPlanResult}
          trainResult={trainResult}
          avulsoFinal={avulsoFinal}
          totalAnual={totalAnual}
          totalMensal={totalMensal}
          saving={saving}
          savedQuoteNumber={savedQuoteNumber}
          onSave={handleSave}
          onViewQuotes={() => router.replace('/quotes')}
        />
      )}
    </View>
  );
}

// ── Step: Empresa ─────────────────────────────────────────────

function StepCompany({
  companies, loading, search, onSearch, selected, onSelect,
}: {
  companies: Company[];
  loading: boolean;
  search: string;
  onSearch: (s: string) => void;
  selected: Company | null;
  onSelect: (c: Company) => void;
}) {
  const filtered = companies.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const normalizedQuery = q.replace(/\D/g, '');
    const normalizedCnpj = c.cnpj.replace(/\D/g, '');
    return (
      c.company_name.toLowerCase().includes(q) ||
      (normalizedQuery.length > 0 && normalizedCnpj.includes(normalizedQuery))
    );
  });

  return (
    <View className="flex-1">
      <View className="px-5 pt-4 pb-2">
        <TextInput
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          placeholder="Buscar empresa..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={onSearch}
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0891b2" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-slate-500">Nenhuma empresa encontrada.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelect(item)}
              className="mb-2 rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
              style={selected?.id === item.id ? { borderColor: '#0891b2', backgroundColor: '#f0f9ff' } : undefined}
            >
              <Text className="font-semibold text-slate-900" numberOfLines={1}>{item.company_name}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{maskCNPJ(item.cnpj)} · Grau {item.risk_grade} · {item.employee_count} func.</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ── Step: Serviços ────────────────────────────────────────────

function StepServices({
  services, onChange, onNext,
}: {
  services: Services;
  onChange: (s: Services) => void;
  onNext: () => void;
}) {
  const options: { key: keyof Services; title: string; subtitle: string }[] = [
    { key: 'plan',      title: 'Plano Mensal SST',       subtitle: 'Essencial · Integral · Avançado' },
    { key: 'trainings', title: 'Treinamentos (NRs)',      subtitle: 'Cursos e capacitações' },
    { key: 'avulso',    title: 'Serviços Avulsos',        subtitle: 'Itens individuais sem mensalidade' },
  ];

  return (
    <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-sm text-slate-500 mb-4">
        Selecione o que será incluído neste orçamento (pode combinar):
      </Text>

      {options.map(opt => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onChange({ ...services, [opt.key]: !services[opt.key] })}
          className="mb-3 flex-row items-center rounded-2xl border bg-white p-4"
          style={{ borderColor: services[opt.key] ? '#0891b2' : '#e2e8f0' }}
        >
          <View
            className="h-6 w-6 rounded-full border-2 items-center justify-center mr-4"
            style={{
              borderColor: services[opt.key] ? '#0891b2' : '#cbd5e1',
              backgroundColor: services[opt.key] ? '#0891b2' : 'transparent',
            }}
          >
            {services[opt.key] && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-slate-900">{opt.title}</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{opt.subtitle}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={onNext}
        className="mt-4 items-center rounded-2xl bg-brand-600 py-4 active:opacity-85"
      >
        <Text className="text-base font-bold text-white">Continuar →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step: Plano ───────────────────────────────────────────────

function StepPlan({
  form, onChange, result, selectedPlan, onCalculate, onSelectPlan, onNext,
}: {
  form: PlanForm;
  onChange: (f: PlanForm) => void;
  result: PlansCalculationResult | null;
  selectedPlan: 'essencial' | 'integral' | 'avancado' | null;
  onCalculate: () => void;
  onSelectPlan: (p: 'essencial' | 'integral' | 'avancado') => void;
  onNext: () => void;
}) {
  const f = (key: keyof PlanForm, val: string | number | boolean) =>
    onChange({ ...form, [key]: val });

  return (
    <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {/* Grau de risco */}
      <Text className="mb-2 text-sm font-semibold text-slate-700">Grau de Risco</Text>
      <View className="mb-4 flex-row" style={{ gap: 8 }}>
        {[1, 2, 3, 4].map(g => (
          <TouchableOpacity
            key={g}
            onPress={() => f('riskGrade', g)}
            className={`flex-1 items-center rounded-xl py-3 ${form.riskGrade === g ? 'bg-brand-600' : 'bg-white border border-slate-200'}`}
          >
            <Text className={`text-sm font-bold ${form.riskGrade === g ? 'text-white' : 'text-slate-700'}`}>G{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Funções e Funcionários */}
      <View className="mb-4 flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="mb-1 text-sm font-medium text-slate-700">Nº Funções</Text>
          <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="Ex: 5" placeholderTextColor="#94a3b8" keyboardType="numeric"
            value={form.totalFunctions} onChangeText={v => f('totalFunctions', v)} />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-sm font-medium text-slate-700">Nº Funcionários</Text>
          <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="Ex: 30" placeholderTextColor="#94a3b8" keyboardType="numeric"
            value={form.totalEmployees} onChangeText={v => f('totalEmployees', v)} />
        </View>
      </View>

      {/* Quantificação */}
      <Text className="mb-1 text-sm font-medium text-slate-700">Quantificação (GHEs)</Text>
      <TextInput className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric"
        value={form.quantificationQty} onChangeText={v => f('quantificationQty', v)} />

      {/* Insalubridade */}
      <View className="mb-4 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Text className="text-sm font-medium text-slate-700">Laudo de Insalubridade</Text>
        <Switch value={form.hasInsalubridade} onValueChange={v => f('hasInsalubridade', v)}
          trackColor={{ false: '#e2e8f0', true: '#0891b2' }} thumbColor="#fff" />
      </View>

      {/* Periculosidade + Deslocamento */}
      <View className="mb-4 flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="mb-1 text-sm font-medium text-slate-700">Periculosidade (GHEs)</Text>
          <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric"
            value={form.periculosidadeQty} onChangeText={v => f('periculosidadeQty', v)} />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-sm font-medium text-slate-700">Deslocamento (km)</Text>
          <TextInput className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad"
            value={form.deslocamentoKm} onChangeText={v => f('deslocamentoKm', v)} />
        </View>
      </View>

      {/* Desconto */}
      <Text className="mb-1 text-sm font-medium text-slate-700">Desconto Adicional (%)</Text>
      <TextInput className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad"
        value={form.additionalDiscount} onChangeText={v => f('additionalDiscount', v)} />

      <TouchableOpacity onPress={onCalculate}
        className="mb-5 items-center rounded-2xl border-2 border-brand-600 py-3.5 active:opacity-80">
        <Text className="text-base font-bold text-brand-600">Calcular Planos</Text>
      </TouchableOpacity>

      {/* Resultados */}
      {result && (
        <>
          <Text className="mb-3 text-xs font-semibold uppercase text-slate-500">
            Selecione o plano · GHE: {formatCurrency(result.gheValue)}
          </Text>
          {(['essencial', 'integral', 'avancado'] as const).map(key => {
            const plan = result[key];
            const color = PLAN_COLORS[key];
            const isSelected = selectedPlan === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onSelectPlan(key)}
                className="mb-3 overflow-hidden rounded-2xl border-2 active:opacity-90"
                style={{ borderColor: isSelected ? color : '#e2e8f0' }}
              >
                <View style={{ backgroundColor: color }} className="flex-row items-center justify-between px-4 py-3">
                  <Text className="font-bold text-white capitalize">{key}</Text>
                  {plan.hasCipa && <Text className="text-xs text-white/80">+ CIPA</Text>}
                  {isSelected && <Text className="text-sm font-bold text-white">✓ Selecionado</Text>}
                </View>
                <View className="bg-white px-4 py-3 flex-row justify-between">
                  <View>
                    <Text className="text-xs text-slate-400">Mensalidade</Text>
                    <Text className="text-xl font-bold text-slate-900">{formatCurrency(plan.monthlyValue)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-slate-400">Anual</Text>
                    <Text className="text-base font-semibold text-slate-700">{formatCurrency(plan.finalValueWithDiscount)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {selectedPlan && (
        <TouchableOpacity onPress={onNext}
          className="mt-2 items-center rounded-2xl bg-brand-600 py-4 active:opacity-85">
          <Text className="text-base font-bold text-white">Continuar →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Step: Treinamentos ────────────────────────────────────────

function StepTrainings({
  trainings, loading, clientType, onClientType,
  quantities, onQty, additionalDiscount, onAddDiscount,
  search, onSearch, result, onNext,
}: {
  trainings: Training[];
  loading: boolean;
  clientType: ClientType;
  onClientType: (t: ClientType) => void;
  quantities: Record<string, number>;
  onQty: (id: string, delta: number) => void;
  additionalDiscount: string;
  onAddDiscount: (v: string) => void;
  search: string;
  onSearch: (s: string) => void;
  result: TrainingsCalculationResult | null;
  onNext: () => void;
}) {
  const filtered = trainings.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  const totalSelected = Object.values(quantities).reduce((s, v) => s + v, 0);

  return (
    <View className="flex-1">
      {/* Filtros no topo */}
      <View className="bg-white border-b border-slate-100 px-5 py-3" style={{ gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CLIENT_TYPE_OPTIONS.map(opt => {
            const active = clientType === opt.value;
            return (
              <TouchableOpacity key={opt.value} onPress={() => onClientType(opt.value as ClientType)}
                className={`rounded-xl px-3 py-2 ${active ? 'bg-brand-600' : 'bg-slate-100'}`}>
                <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-600'}`}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View className="flex-row" style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextInput className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
              placeholder="Desc. adicional (%)" placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad" value={additionalDiscount} onChangeText={onAddDiscount} />
          </View>
          <View style={{ flex: 2 }}>
            <TextInput className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
              placeholder="Buscar treinamento..." placeholderTextColor="#94a3b8"
              value={search} onChangeText={onSearch} autoCorrect={false} />
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0891b2" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingBottom: result ? 180 : 100 }}
          renderItem={({ item }) => {
            const qty = quantities[item.id] ?? 0;
            return (
              <View className={`flex-row items-center px-5 py-3 border-b border-slate-100 ${qty > 0 ? 'bg-cyan-50' : 'bg-white'}`}>
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold text-brand-600">{item.code}</Text>
                  <Text className="text-sm text-slate-800 mt-0.5" numberOfLines={2}>{item.description}</Text>
                  <Text className="text-xs text-brand-600 mt-0.5">{formatCurrency(item.value)}{qty > 0 ? ` × ${qty} = ${formatCurrency(item.value * qty)}` : ''}</Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <QtyControl
                    value={qty}
                    onSet={(n) => onQty(item.id, n - qty)}
                  />
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Painel fixo no rodapé */}
      <View className="bg-white border-t border-slate-200 px-5 pt-3 pb-5" style={{ gap: 8 }}>
        {result ? (
          <>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Total treinamentos</Text>
              <Text className="text-sm font-semibold text-slate-900">{formatCurrency(result.finalValue)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Mensalidade (÷12)</Text>
              <Text className="text-sm font-semibold text-brand-600">{formatCurrency(result.monthlyValue)}</Text>
            </View>
          </>
        ) : (
          <Text className="text-sm text-slate-400 text-center">
            {totalSelected === 0 ? 'Nenhum treinamento selecionado' : 'Calculando...'}
          </Text>
        )}
        <TouchableOpacity onPress={onNext}
          className="items-center rounded-2xl bg-brand-600 py-3.5 active:opacity-85">
          <Text className="text-base font-bold text-white">Continuar →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Step: Avulso ──────────────────────────────────────────────

function StepAvulso({
  configs, quantities, onQty, margin, onMargin, baseCost, finalCost, onNext,
}: {
  configs: ReturnType<typeof DEFAULT_PLAN_CONFIGS>[number][];
  quantities: Record<string, number>;
  onQty: (key: string, delta: number, isFixed: boolean) => void;
  margin: string;
  onMargin: (v: string) => void;
  baseCost: number;
  finalCost: number;
  onNext: () => void;
}) {
  return (
    <View className="flex-1">
      {/* Margem */}
      <View className="bg-white border-b border-slate-100 px-5 py-3 flex-row items-center" style={{ gap: 12 }}>
        <Text className="text-sm font-medium text-slate-700">Margem (%)</Text>
        <TextInput
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          placeholder="40" placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad" value={margin} onChangeText={onMargin}
        />
        <Text className="text-xs text-slate-400">+ 8% imposto</Text>
      </View>

      <FlatList
        data={AVULSO_SERVICES}
        keyExtractor={i => i.key}
        contentContainerStyle={{ paddingBottom: 180 }}
        renderItem={({ item }) => {
          const qty = quantities[item.key] ?? 0;
          const unitCost = configs.find(c => c.key === item.key)?.value ?? 0;
          const isActive = qty > 0;

          return (
            <View className={`flex-row items-center px-5 py-3 border-b border-slate-100 ${isActive ? 'bg-cyan-50' : 'bg-white'}`}>
              <View className="flex-1 pr-3">
                <Text className="text-sm font-medium text-slate-900">{item.label}</Text>
                <Text className="text-xs text-brand-600 mt-0.5">
                  {formatCurrency(unitCost)}{item.unit !== 'fixo' ? `/${item.unit}` : ''}
                  {isActive && ` × ${qty} = ${formatCurrency(unitCost * qty)}`}
                </Text>
              </View>

              {item.isFixed ? (
                <TouchableOpacity
                  onPress={() => onQty(item.key, 0, true)}
                  className={`h-8 w-16 rounded-xl items-center justify-center ${isActive ? 'bg-brand-600' : 'bg-slate-100'}`}
                >
                  <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {isActive ? '✓ Sim' : 'Não'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <QtyControl
                    value={qty}
                    onSet={(n) => onQty(item.key, n - qty, false)}
                  />
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Rodapé */}
      <View className="bg-white border-t border-slate-200 px-5 pt-3 pb-5" style={{ gap: 8 }}>
        {baseCost > 0 ? (
          <>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Custo base</Text>
              <Text className="text-sm text-slate-700">{formatCurrency(baseCost)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm font-semibold text-slate-900">Total avulso (c/ margem)</Text>
              <Text className="text-sm font-bold text-slate-900">{formatCurrency(finalCost)}</Text>
            </View>
          </>
        ) : (
          <Text className="text-sm text-slate-400 text-center">Nenhum serviço selecionado</Text>
        )}
        <TouchableOpacity onPress={onNext}
          className="items-center rounded-2xl bg-brand-600 py-3.5 active:opacity-85">
          <Text className="text-base font-bold text-white">Continuar →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Step: Resumo ──────────────────────────────────────────────

function StepSummary({
  company, services, planLabel, planResult, trainResult,
  avulsoFinal, totalAnual, totalMensal, saving, savedQuoteNumber, onSave, onViewQuotes,
}: {
  company: Company;
  services: Services;
  planLabel: string | null;
  planResult: { monthlyValue: number; finalValueWithDiscount: number } | null;
  trainResult: TrainingsCalculationResult | null;
  avulsoFinal: number;
  totalAnual: number;
  totalMensal: number;
  saving: boolean;
  savedQuoteNumber: string | null;
  onSave: () => void;
  onViewQuotes: () => void;
}) {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  async function buildHtml() {
    const rows = [
      services.plan && planResult && planLabel
        ? `<tr><td>Plano ${planLabel.charAt(0).toUpperCase() + planLabel.slice(1)} (mensal)</td><td style="text-align:right">${formatCurrency(planResult.monthlyValue)}/mês</td></tr>
           <tr><td>Plano ${planLabel.charAt(0).toUpperCase() + planLabel.slice(1)} (anual)</td><td style="text-align:right">${formatCurrency(planResult.finalValueWithDiscount)}</td></tr>`
        : '',
      services.trainings && trainResult
        ? `<tr><td>Treinamentos</td><td style="text-align:right">${formatCurrency(trainResult.finalValue)}</td></tr>`
        : '',
      services.avulso && avulsoFinal > 0
        ? `<tr><td>Serviços Avulsos</td><td style="text-align:right">${formatCurrency(avulsoFinal)}</td></tr>`
        : '',
    ].filter(Boolean).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
      h1 { color: #0891b2; font-size: 22px; margin-bottom: 4px; }
      .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
      .total { font-size: 20px; font-weight: bold; color: #0891b2; }
      .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; }
    </style></head><body>
    <h1>Orçamento ${savedQuoteNumber ?? ''}</h1>
    <div class="sub">${company.company_name} · CNPJ ${maskCNPJ(company.cnpj)}</div>
    <table>${rows}
      <tr><td colspan="2" style="padding:4px"></td></tr>
      <tr><td><strong>TOTAL ANUAL</strong></td><td style="text-align:right" class="total">${formatCurrency(totalAnual)}</td></tr>
      ${totalMensal > 0 ? `<tr><td>Recorrente mensal</td><td style="text-align:right">${formatCurrency(totalMensal)}/mês</td></tr>` : ''}
    </table>
    <div class="footer">Válido até ${validUntil.toLocaleDateString('pt-BR')} · Inovassie © ${new Date().getFullYear()}</div>
    </body></html>`;
  }

  async function handlePrint() {
    try {
      const html = await buildHtml();
      await Print.printAsync({ html });
    } catch {
      Alert.alert('Erro', 'Não foi possível imprimir.');
    }
  }

  async function handleShare() {
    try {
      const html = await buildHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar Orçamento' });
      } else {
        Alert.alert('Indisponível', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  }

  return (
    <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Empresa */}
      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-xs font-semibold uppercase text-slate-400 mb-2">Empresa</Text>
        <Text className="text-base font-bold text-slate-900">{company.company_name}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{maskCNPJ(company.cnpj)} · Grau {company.risk_grade}</Text>
      </View>

      {/* Itens do orçamento */}
      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-xs font-semibold uppercase text-slate-400 mb-3">Composição</Text>

        {services.plan && planResult && planLabel && (
          <View className="mb-3">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-sm font-semibold text-slate-900 capitalize">Plano {planLabel}</Text>
                <Text className="text-xs text-slate-500">Recorrente mensal</Text>
              </View>
              <View className="items-end">
                <Text className="text-base font-bold text-slate-900">{formatCurrency(planResult.monthlyValue)}/mês</Text>
                <Text className="text-xs text-slate-500">{formatCurrency(planResult.finalValueWithDiscount)}/ano</Text>
              </View>
            </View>
          </View>
        )}

        {services.trainings && trainResult && (
          <>
            {services.plan && <View className="h-px bg-slate-100 mb-3" />}
            <View className="mb-3 flex-row justify-between items-start">
              <View>
                <Text className="text-sm font-semibold text-slate-900">Treinamentos</Text>
                <Text className="text-xs text-slate-500">Pacote anual</Text>
              </View>
              <View className="items-end">
                <Text className="text-base font-bold text-slate-900">{formatCurrency(trainResult.finalValue)}</Text>
                <Text className="text-xs text-slate-500">{formatCurrency(trainResult.monthlyValue)}/mês</Text>
              </View>
            </View>
          </>
        )}

        {services.avulso && avulsoFinal > 0 && (
          <>
            {(services.plan || services.trainings) && <View className="h-px bg-slate-100 mb-3" />}
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-sm font-semibold text-slate-900">Serviços Avulsos</Text>
                <Text className="text-xs text-slate-500">Único</Text>
              </View>
              <Text className="text-base font-bold text-slate-900">{formatCurrency(avulsoFinal)}</Text>
            </View>
          </>
        )}
      </View>

      {/* Total */}
      <View className="mb-4 rounded-2xl bg-brand-600 p-5">
        {savedQuoteNumber && (
          <Text className="text-xs font-bold text-white/70 mb-1">{savedQuoteNumber}</Text>
        )}
        <Text className="text-sm text-white/70 mb-1">Total do Orçamento</Text>
        <Text className="text-3xl font-bold text-white">{formatCurrency(totalAnual)}</Text>
        {totalMensal > 0 && (
          <Text className="text-sm text-white/80 mt-1">{formatCurrency(totalMensal)}/mês (recorrente)</Text>
        )}
        <Text className="text-xs text-white/60 mt-2">
          Válido até {validUntil.toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {/* Botões pós-geração */}
      {savedQuoteNumber ? (
        <View style={{ gap: 12 }}>
          <View className="flex-row" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={handleShare}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-emerald-500 py-4 active:opacity-85"
            >
              <Text className="text-base font-bold text-white">Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePrint}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-slate-700 py-4 active:opacity-85"
            >
              <Text className="text-base font-bold text-white">Imprimir / PDF</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onViewQuotes}
            className="items-center rounded-2xl border border-brand-600 py-4 active:opacity-85"
          >
            <Text className="text-base font-semibold text-brand-600">Ver Orçamentos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          className="items-center rounded-2xl bg-slate-900 py-4 active:opacity-85"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white">Gerar Orçamento</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── QtyControl: stepper + input editável ──────────────────────

function QtyControl({
  value, onSet, min = 0, max = 9999,
}: {
  value: number;
  onSet: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const digits = raw.replace(/\D/g, '');
    const n = digits === '' ? min : Math.max(min, Math.min(max, parseInt(digits, 10)));
    setText(String(n));
    if (n !== value) onSet(n);
  }

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <>
      <TouchableOpacity
        onPress={() => !atMin && onSet(value - 1)}
        disabled={atMin}
        className={`h-8 w-8 rounded-full items-center justify-center ${atMin ? 'bg-slate-100' : 'bg-slate-200'}`}
      >
        <Text className={`text-lg font-bold leading-none ${atMin ? 'text-slate-300' : 'text-slate-700'}`}>−</Text>
      </TouchableOpacity>

      <TextInput
        value={text}
        onChangeText={(t) => setText(t.replace(/\D/g, ''))}
        onBlur={() => commit(text)}
        onSubmitEditing={() => commit(text)}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        className="h-8 rounded-md border border-slate-200 bg-white text-center text-sm font-semibold text-slate-900"
        style={{ width: 44, paddingVertical: 0 }}
      />

      <TouchableOpacity
        onPress={() => !atMax && onSet(value + 1)}
        disabled={atMax}
        className={`h-8 w-8 rounded-full items-center justify-center ${atMax ? 'bg-slate-200' : 'bg-brand-600'}`}
      >
        <Text className={`text-lg font-bold leading-none ${atMax ? 'text-slate-400' : 'text-white'}`}>+</Text>
      </TouchableOpacity>
    </>
  );
}
