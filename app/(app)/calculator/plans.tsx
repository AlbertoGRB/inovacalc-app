import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { usePlanConfigs } from '@/hooks/useSettings';
import { calculatePlans, PlansCalculationResult, PlanResult } from '@/lib/calculations';
import { DEFAULT_PLAN_CONFIGS, PLAN_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { colors, typography } from '@/theme';

const RISK_GRADES = [1, 2, 3, 4] as const;

export default function PlansCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: configs } = usePlanConfigs();

  const [riskGrade, setRiskGrade] = useState(1);
  const [numFuncionarios, setNumFuncionarios] = useState('');
  const [totalFunctions, setTotalFunctions] = useState('1');
  const [qtdQuantificacoes, setQtdQuantificacoes] = useState('0');
  const [hasInsalubridade, setHasInsalubridade] = useState(false);
  const [periculosidadeQty, setPericulosidadeQty] = useState('0');
  const [hasKm, setHasKm] = useState(false);
  const [kmDeslocamento, setKmDeslocamento] = useState('0');
  const [additionalDiscount, setAdditionalDiscount] = useState('0');
  const [result, setResult] = useState<PlansCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCalculate() {
    setError(null);
    const emps = parseInt(numFuncionarios) || 0;

    if (emps <= 0) {
      setError('Informe o número de funcionários.');
      return;
    }

    const activeConfigs = configs ?? DEFAULT_PLAN_CONFIGS;

    const r = calculatePlans(
      {
        riskGrade,
        numFuncionarios: emps,
        totalFunctions: parseInt(totalFunctions) || 1,
        qtdQuantificacoes: parseInt(qtdQuantificacoes) || 0,
        hasInsalubridade,
        periculosidadeQty: parseInt(periculosidadeQty) || 0,
        hasKm,
        kmDeslocamento: hasKm ? (parseFloat(kmDeslocamento) || 0) : 0,
        additionalDiscount: parseFloat(additionalDiscount) || 0,
      },
      activeConfigs,
    );
    setResult(r);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{
          backgroundColor: colors.primary[900],
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconChevronLeft size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)' }}>Voltar</Text>
            </TouchableOpacity>
            <View>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.xl, color: colors.neutral.white }}>Calculadora de Planos</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: typography.sizes.xs, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>Mensalidade SST</Text>
            </View>
          </View>
        </View>

        <View className="px-5 pt-5">
          {/* Grau de Risco */}
          <Text className="mb-2 text-sm font-semibold text-slate-700">Grau de Risco</Text>
          <View className="mb-4 flex-row" style={{ gap: 8 }}>
            {RISK_GRADES.map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => setRiskGrade(g)}
                className={`flex-1 items-center rounded-xl py-3 ${
                  riskGrade === g ? 'bg-brand-600' : 'bg-white border border-slate-200'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    riskGrade === g ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  G{g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Funcionários e Funções */}
          <View className="mb-4 flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Nº de Funcionários</Text>
              <TextInput
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                placeholder="Ex: 30"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={numFuncionarios}
                onChangeText={setNumFuncionarios}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Nº de Funções</Text>
              <TextInput
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                placeholder="1"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={totalFunctions}
                onChangeText={setTotalFunctions}
              />
            </View>
          </View>

          {/* Quantificação e Periculosidade */}
          <View className="mb-4 flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Quantificações</Text>
              <TextInput
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={qtdQuantificacoes}
                onChangeText={setQtdQuantificacoes}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Periculosidade</Text>
              <TextInput
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={periculosidadeQty}
                onChangeText={setPericulosidadeQty}
              />
            </View>
          </View>

          {/* Insalubridade toggle */}
          <View className="mb-4 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Text className="text-sm font-medium text-slate-700">Insalubridade</Text>
            <Switch
              value={hasInsalubridade}
              onValueChange={setHasInsalubridade}
              trackColor={{ false: '#e2e8f0', true: colors.primary[600] }}
              thumbColor="#fff"
            />
          </View>

          {/* KM toggle + campo */}
          <View className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-slate-700">Incluir KM</Text>
              <Switch
                value={hasKm}
                onValueChange={setHasKm}
                trackColor={{ false: '#e2e8f0', true: colors.primary[600] }}
                thumbColor="#fff"
              />
            </View>
            {hasKm && (
              <View className="mt-3">
                <Text className="mb-1.5 text-xs font-medium text-slate-500">Quilometragem</Text>
                <TextInput
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={kmDeslocamento}
                  onChangeText={setKmDeslocamento}
                />
              </View>
            )}
          </View>

          {/* Desconto adicional */}
          <View className="mb-5">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">
              Desconto Adicional (%)
            </Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={additionalDiscount}
              onChangeText={setAdditionalDiscount}
            />
          </View>

          {/* Erro */}
          {error && (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{error}</Text>
            </View>
          )}

          {/* Botão calcular */}
          <TouchableOpacity
            onPress={handleCalculate}
            className="mb-6 items-center rounded-2xl bg-brand-600 py-4 active:opacity-85"
          >
            <Text className="text-base font-bold text-white">Calcular Planos</Text>
          </TouchableOpacity>

          {/* Resultados */}
          {result && (
            <View>
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resultado
              </Text>
              <PlanCard label="Plano Essencial" color={PLAN_COLORS.essencial} plan={result.essencial} />
              <PlanCard label="Plano Integral"  color={PLAN_COLORS.integral}  plan={result.integral} />
              <PlanCard label="Plano Avançado"  color={PLAN_COLORS.avancado}  plan={result.avancado} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PlanCard({
  label,
  color,
  plan,
}: {
  label: string;
  color: string;
  plan: PlanResult;
}) {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <View style={{ backgroundColor: color }} className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">{label}</Text>
          {plan.hasCipa && (
            <View className="rounded-full bg-white/20 px-2.5 py-0.5">
              <Text className="text-xs font-semibold text-white">+ CIPA</Text>
            </View>
          )}
        </View>
      </View>

      <View className="px-4 py-4">
        <Text className="text-xs text-slate-400 mb-0.5">Mensalidade</Text>
        <Text className="text-2xl font-bold text-slate-900">
          {formatCurrency(plan.monthlyValue)}
        </Text>
        <Text className="text-xs text-slate-500 mt-0.5">
          {formatCurrency(plan.finalValueWithDiscount)}/ano
        </Text>

        <View className="mt-3 h-px bg-slate-100" />

        <View className="mt-3 flex-row justify-between">
          <View>
            <Text className="text-xs text-slate-400">Custo base</Text>
            <Text className="text-sm text-slate-700">{formatCurrency(plan.baseCost)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-slate-400">Margem + Imposto</Text>
            <Text className="text-sm text-slate-700">
              {formatCurrency(plan.margin + plan.tax)}
            </Text>
          </View>
          {plan.discountValue > 0 && (
            <View className="items-end">
              <Text className="text-xs text-slate-400">Desconto</Text>
              <Text className="text-sm text-green-600">
                -{formatCurrency(plan.discountValue)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
