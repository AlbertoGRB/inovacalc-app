import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconArrowRight, IconSearch, IconAward } from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Counter } from '@/components/ui/Counter';
import { Segmented } from '@/components/ui/Segmented';
import { SectionLabel } from '@/components/ui/CategoryIcon';
import { useQuoteDraft } from '@/stores/quoteDraftStore';
import { DEFAULT_TRAININGS } from '@/lib/trainings-catalog';
import { calculateTrainings } from '@/lib/calculations';
import { colors, typography, radius } from '@/theme';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const DEFAULT_DISCOUNTS = [
  { id: '1', plan_type: 'NONE'      as const, discount_percent: 0,  updated_at: '' },
  { id: '2', plan_type: 'ESSENCIAL' as const, discount_percent: 5,  updated_at: '' },
  { id: '3', plan_type: 'INTEGRAL'  as const, discount_percent: 10, updated_at: '' },
  { id: '4', plan_type: 'AVANCADO'  as const, discount_percent: 15, updated_at: '' },
];

export default function TrainingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trainings, setTrainings, include, asClientType } = useQuoteDraft();

  const setTraining = (id: string, qty: number) => {
    setTrainings(
      qty > 0
        ? [...trainings.filter(t => t.trainingId !== id), { trainingId: id, quantity: qty }]
        : trainings.filter(t => t.trainingId !== id),
    );
  };
  const [search, setSearch] = useState('');

  const selectedCombos = new Set(
    DEFAULT_TRAININGS
      .filter(t => t.is_combo && trainings.some(s => s.trainingId === t.id))
      .flatMap(t => t.combo_items ?? []),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEFAULT_TRAININGS.filter(t =>
      !q || t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [search]);

  const combos = filtered.filter(t => t.is_combo);
  const nrs    = filtered.filter(t => !t.is_combo);

  const items = trainings.map(sel => {
    const t = DEFAULT_TRAININGS.find(x => x.id === sel.trainingId);
    return {
      trainingId: sel.trainingId,
      quantity: sel.quantity,
      totalValue: (t?.value ?? 0) * sel.quantity,
    };
  });
  const calc = calculateTrainings(
    { clientType: asClientType(), additionalDiscount: 0, items },
    DEFAULT_DISCOUNTS,
  );

  const handleNext = () => {
    if (include.extras) router.push('/quote/extras' as any);
    else router.push('/quote/summary' as any);
  };

  const findQty = (id: string) => trainings.find(t => t.trainingId === id)?.quantity ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Treinamentos"
        subtitle="Selecione combos ou NRs avulsas"
        steps={6} currentStep={5}
        onBack={() => router.back()}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: colors.neutral.white,
          borderRadius: radius.lg,
          borderWidth: 0.5, borderColor: colors.neutral.gray200,
          paddingHorizontal: 12, paddingVertical: 10,
        }}>
          <IconSearch size={16} color={colors.neutral.gray500} strokeWidth={1.8} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar NR ou combo"
            placeholderTextColor={colors.neutral.gray400}
            style={{
              flex: 1, padding: 0,
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray900,
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {combos.length > 0 && <SectionLabel>Combos</SectionLabel>}
        <View style={{ gap: 10 }}>
          {combos.map(t => {
            const qty = findQty(t.id);
            return (
              <View
                key={t.id}
                style={{
                  backgroundColor: colors.warning[50],
                  borderRadius: radius.lg,
                  paddingVertical: 14, paddingHorizontal: 14,
                  borderLeftWidth: 3, borderLeftColor: colors.warning[600],
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}
              >
                <IconAward size={18} color={colors.warning[600]} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.md,
                    color: colors.neutral.gray900,
                  }}>{t.description}</Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.sm,
                    color: colors.warning[800],
                    marginTop: 2,
                  }}>{formatBRL(t.value)} / pessoa</Text>
                </View>
                <Counter value={qty} onChange={(v) => setTraining(t.id, v)} />
              </View>
            );
          })}
        </View>

        {nrs.length > 0 && <SectionLabel style={{ marginTop: 20 }}>NRs avulsas</SectionLabel>}
        <Card padding="none">
          {nrs.map((t, i) => {
            const qty = findQty(t.id);
            const disabled = selectedCombos.has(t.code);
            return (
              <View
                key={t.id}
                style={{
                  paddingVertical: 12, paddingHorizontal: 14,
                  borderBottomWidth: i < nrs.length - 1 ? 0.5 : 0,
                  borderBottomColor: colors.neutral.gray200,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  opacity: disabled ? 0.55 : 1,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.md,
                    color: colors.neutral.gray900,
                  }}>{t.code}</Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.sm,
                    color: colors.neutral.gray500,
                    marginTop: 1,
                  }}>{t.description} · {formatBRL(t.value)}</Text>
                  {disabled && (
                    <Text style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: typography.sizes.xs,
                      color: colors.warning[800],
                      marginTop: 2,
                    }}>Incluída no combo</Text>
                  )}
                </View>
                {!disabled && (
                  <Counter value={qty} onChange={(v) => setTraining(t.id, v)} size="sm" />
                )}
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5, borderTopColor: colors.neutral.gray200,
        gap: 10,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.sm,
            color: colors.neutral.gray500,
          }}>Subtotal</Text>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes.lg,
            color: colors.neutral.gray900,
          }}>{formatBRL(calc.finalValue)}</Text>
        </View>
        <Button
          label="Continuar"
          onPress={handleNext}
          iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}
