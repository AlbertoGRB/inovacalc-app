import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconArrowRight, IconCheck } from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useQuoteDraft, type SelectedPlan } from '@/stores/quoteDraftStore';
import { usePlanConfigs, useGheTable } from '@/hooks/useSettings';
import { calculatePlans, type PlanResult } from '@/lib/calculations';
import { colors, typography, radius } from '@/theme';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type PlanCardData = {
  key: Exclude<SelectedPlan, null>;
  name: string;
  color: string;
  result: PlanResult;
  features: string[];
  badge?: { label: string; variant: any };
};

export default function SelectPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planConfig, selectedPlan, setSelectedPlan, include } = useQuoteDraft();
  const { data: configs = [], isLoading: l1 } = usePlanConfigs();
  const { data: ghe = [], isLoading: l2 } = useGheTable();
  const loading = l1 || l2;

  const result = useMemo(() => {
    if (loading) return null;
    return calculatePlans(planConfig, configs, ghe);
  }, [loading, planConfig, configs, ghe]);

  const plans: PlanCardData[] = result ? [
    {
      key: 'ESSENCIAL', name: 'Essencial', color: colors.plans.essential,
      result: result.essencial,
      features: ['Responsável Técnico', 'TST', 'Ruído + GHE', 'NR-01 básico'],
    },
    {
      key: 'INTEGRAL', name: 'Integral', color: colors.plans.integral,
      result: result.integral,
      features: ['Tudo do Essencial', 'eSocial', 'Exames periódicos'],
      badge: { label: 'Popular', variant: 'warning' },
    },
    {
      key: 'AVANCADO', name: 'Avançado', color: colors.plans.advanced,
      result: result.avancado,
      features: ['Tudo do Integral', 'Visita técnica', 'CAT + EPI', result.avancado.hasCipa ? 'CIPA' : 'CIPA não aplicável'],
      badge: { label: 'Pro', variant: 'primary' },
    },
  ] : [];

  const handleNext = () => {
    if (!selectedPlan) return;
    if (include.trainings) router.push('/quote/trainings' as any);
    else if (include.extras) router.push('/quote/extras' as any);
    else router.push('/quote/summary' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Escolha o plano"
        subtitle="Comparativo entre os planos calculados"
        step={{ current: 4, total: 6 }}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {plans.map(p => {
            const selected = selectedPlan === p.key;
            return (
              <Card
                key={p.key}
                variant={selected ? 'selected' : 'default'}
                onPress={() => setSelectedPlan(p.key)}
                padding="none"
              >
                <View style={{
                  backgroundColor: p.color,
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.lg,
                    color: colors.neutral.white,
                    letterSpacing: -0.2,
                  }}>{p.name}</Text>
                  {p.badge && <Badge label={p.badge.label} variant={p.badge.variant} size="sm" />}
                </View>

                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: typography.sizes['3xl'],
                      color: colors.neutral.gray900,
                      letterSpacing: -0.5,
                    }}>{formatBRL(p.result.monthlyValue)}</Text>
                    <Text style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: typography.sizes.sm,
                      color: colors.neutral.gray500,
                    }}>/mês</Text>
                  </View>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.sm,
                    color: colors.neutral.gray500,
                    marginTop: 2, marginBottom: 12,
                  }}>{formatBRL(p.result.finalValueWithDiscount)} / ano</Text>

                  <View style={{ gap: 6 }}>
                    {p.features.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <IconCheck size={14} color={p.color} strokeWidth={2.2} />
                        <Text style={{
                          fontFamily: 'Inter_400Regular',
                          fontSize: typography.sizes.md,
                          color: colors.neutral.gray700,
                        }}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {selected && (
                    <View style={{
                      marginTop: 12, alignSelf: 'flex-start',
                      backgroundColor: colors.primary[50],
                      borderRadius: radius.sm,
                      paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <Text style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: typography.sizes.xs,
                        color: colors.primary[800],
                        letterSpacing: 0.4,
                      }}>SELECIONADO</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5, borderTopColor: colors.neutral.gray200,
      }}>
        <Button
          label="Continuar"
          disabled={!selectedPlan}
          onPress={handleNext}
          iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}
