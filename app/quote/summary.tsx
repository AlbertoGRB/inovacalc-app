import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconBuilding, IconShieldCheck, IconSchool, IconStethoscope,
  IconShare, IconFileText, IconCopy, IconEdit, IconCheck,
} from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon, SectionLabel } from '@/components/ui/CategoryIcon';
import { useQuoteDraft } from '@/stores/quoteDraftStore';
import { usePlanConfigs, useGheTable } from '@/hooks/useSettings';
import { useCreateQuote } from '@/hooks/useCreateQuote';
import { calculatePlans, calculateTrainings, type PlanResult } from '@/lib/calculations';
import { DEFAULT_TRAININGS } from '@/lib/trainings-catalog';
import { colors, typography, radius } from '@/theme';

const DEFAULT_DISCOUNTS = [
  { id: '1', plan_type: 'NONE'      as const, discount_percent: 0,  updated_at: '' },
  { id: '2', plan_type: 'ESSENCIAL' as const, discount_percent: 5,  updated_at: '' },
  { id: '3', plan_type: 'INTEGRAL'  as const, discount_percent: 10, updated_at: '' },
  { id: '4', plan_type: 'AVANCADO'  as const, discount_percent: 15, updated_at: '' },
];

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useQuoteDraft();
  const { company, include, planConfig, selectedPlan, trainings, asClientType, reset } = draft;
  const { data: configs = [] } = usePlanConfigs();
  const { data: ghe = [] } = useGheTable();
  const createQuote = useCreateQuote();
  const [saved, setSaved] = useState(false);

  const planResult: PlanResult | null = useMemo(() => {
    if (!include.plan || !selectedPlan) return null;
    const r = calculatePlans(planConfig, configs, ghe);
    return selectedPlan === 'ESSENCIAL' ? r.essencial
      : selectedPlan === 'INTEGRAL' ? r.integral
      : r.avancado;
  }, [include.plan, selectedPlan, planConfig, configs, ghe]);

  const trainingItems = trainings.map(sel => {
    const t = DEFAULT_TRAININGS.find(x => x.id === sel.trainingId);
    return {
      trainingId: sel.trainingId,
      quantity: sel.quantity,
      totalValue: (t?.value ?? 0) * sel.quantity,
    };
  });
  const trainingResult = include.trainings && trainingItems.length > 0
    ? calculateTrainings(
        { clientType: asClientType(), additionalDiscount: 0, items: trainingItems },
        DEFAULT_DISCOUNTS,
      )
    : null;

  const totalAnnual = (planResult?.finalValueWithDiscount ?? 0) + (trainingResult?.finalValue ?? 0);
  const totalMonthly = totalAnnual / 12;

  const buildMessage = () => {
    const lines = ['*Orçamento Inovassie*', ''];
    if (company) lines.push(`Empresa: ${company.company_name}`);
    if (planResult && selectedPlan) {
      lines.push(`Plano ${selectedPlan}: ${formatBRL(planResult.monthlyValue)}/mês`);
    }
    if (trainingResult) {
      lines.push(`Treinamentos: ${formatBRL(trainingResult.finalValue)}`);
    }
    lines.push('', `*Total anual:* ${formatBRL(totalAnnual)}`);
    lines.push(`*Mensal:* ${formatBRL(totalMonthly)}`);
    return lines.join('\n');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: buildMessage() });
    } catch {}
  };

  const handleSaveDraft = async () => {
    if (!company) {
      Alert.alert('Empresa obrigatória', 'Selecione uma empresa antes de salvar.');
      return;
    }
    try {
      await createQuote.mutateAsync({
        draft,
        configs,
        ghe,
        status: 'DRAFT',
      });
      setSaved(true);
      setTimeout(() => {
        reset();
        router.replace('/(app)/quotes');
      }, 700);
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e?.message ?? 'Não foi possível salvar o orçamento.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Resumo"
        subtitle="Confira antes de salvar"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Card total destacado */}
        <Card variant="dark" padding="lg">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.sm,
              color: 'rgba(255,255,255,0.6)',
            }}>Total estimado</Text>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: radius.sm,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.xs,
                color: colors.neutral.white,
                letterSpacing: 0.4,
              }}>RASCUNHO</Text>
            </View>
          </View>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes['4xl'],
            color: colors.neutral.white,
            letterSpacing: -1,
            marginTop: 8,
          }}>{formatBRL(totalAnnual)}</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.md,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 2,
          }}>ou {formatBRL(totalMonthly)} / mês</Text>
        </Card>

        {/* Empresa */}
        {company && (
          <>
            <SectionLabel style={{ marginTop: 20 }}>Empresa</SectionLabel>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CategoryIcon
                  category="company"
                  icon={<IconBuilding size={18} color={colors.primary[600]} strokeWidth={1.8} />}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.md,
                    color: colors.neutral.gray900,
                  }}>{company.company_name}</Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.sm,
                    color: colors.neutral.gray500,
                  }}>{company.cnpj ?? 'Sem CNPJ'}</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* Composição */}
        <SectionLabel style={{ marginTop: 20 }}>Composição</SectionLabel>
        <View style={{ gap: 10 }}>
          {planResult && selectedPlan && (
            <ComposeRow
              icon={<IconShieldCheck size={18} color="#3B6D11" strokeWidth={1.8} />}
              cat="plan"
              title={`Plano ${selectedPlan}`}
              subtitle="Anual"
              value={formatBRL(planResult.finalValueWithDiscount)}
            />
          )}
          {trainingResult && (
            <ComposeRow
              icon={<IconSchool size={18} color={colors.plans.advanced} strokeWidth={1.8} />}
              cat="training"
              title="Treinamentos"
              subtitle={`${trainings.reduce((a, b) => a + b.quantity, 0)} item(s)`}
              value={formatBRL(trainingResult.finalValue)}
            />
          )}
          {include.extras && (
            <ComposeRow
              icon={<IconStethoscope size={18} color={colors.warning[600]} strokeWidth={1.8} />}
              cat="service"
              title="Serviços avulsos"
              subtitle="Incluídos"
              value="—"
            />
          )}
          {!planResult && !trainingResult && !include.extras && (
            <Card variant="flat">
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray500,
                textAlign: 'center',
              }}>Nenhum item adicionado.</Text>
            </Card>
          )}
        </View>

        {/* Ações inline */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <Button label="Compartilhar" variant="secondary" onPress={handleShare}
              icon={<IconShare size={16} color={colors.neutral.gray800} strokeWidth={1.8} />} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Copiar texto" variant="secondary"
              onPress={() => {
                Alert.alert('Texto pronto', buildMessage());
              }}
              icon={<IconCopy size={16} color={colors.neutral.gray800} strokeWidth={1.8} />} />
          </View>
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5, borderTopColor: colors.neutral.gray200,
        gap: 10,
      }}>
        <Button
          label={saved ? 'Salvo!' : 'Salvar rascunho'}
          onPress={handleSaveDraft}
          loading={createQuote.isPending}
          disabled={createQuote.isPending || saved}
          icon={saved
            ? <IconCheck size={16} color={colors.neutral.white} strokeWidth={2.4} />
            : <IconFileText size={16} color={colors.neutral.white} strokeWidth={1.8} />}
        />
      </View>
    </View>
  );
}

function ComposeRow({ icon, cat, title, subtitle, value }: {
  icon: React.ReactNode;
  cat: 'plan' | 'training' | 'service' | 'company';
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CategoryIcon category={cat} icon={icon} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes.md,
            color: colors.neutral.gray900,
          }}>{title}</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.sm,
            color: colors.neutral.gray500,
          }}>{subtitle}</Text>
        </View>
        <Text style={{
          fontFamily: 'Inter_500Medium',
          fontSize: typography.sizes.md,
          color: colors.neutral.gray900,
        }}>{value}</Text>
      </View>
    </Card>
  );
}
