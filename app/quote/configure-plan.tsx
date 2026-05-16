import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconArrowRight, IconShieldHalf } from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Counter } from '@/components/ui/Counter';
import { Toggle } from '@/components/ui/Toggle';
import { SectionLabel } from '@/components/ui/CategoryIcon';
import { useQuoteDraft } from '@/stores/quoteDraftStore';
import { colors, typography, radius } from '@/theme';

const GRADES = [1, 2, 3, 4] as const;

export default function ConfigurePlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planConfig, setPlanConfig } = useQuoteDraft();

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Configurar plano"
        subtitle="Defina o perfil da empresa"
        steps={6} currentStep={3}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>Grau de risco</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {GRADES.map(g => {
            const active = planConfig.riskGrade === g;
            return (
              <Card
                key={g}
                variant={active ? 'selected' : 'default'}
                onPress={() => setPlanConfig({ riskGrade: g })}
                padding="md"
                style={{ flex: 1, alignItems: 'center' }}
              >
                <IconShieldHalf
                  size={18}
                  color={active ? colors.primary[600] : colors.neutral.gray500}
                  strokeWidth={1.8}
                />
                <Text style={{
                  marginTop: 4,
                  fontFamily: 'Inter_500Medium',
                  fontSize: typography.sizes.lg,
                  color: active ? colors.primary[800] : colors.neutral.gray800,
                }}>G{g}</Text>
              </Card>
            );
          })}
        </View>

        <SectionLabel>Dimensões</SectionLabel>
        <Card>
          <Row
            label="Total de funções"
            value={planConfig.totalFunctions}
            onChange={(v) => setPlanConfig({ totalFunctions: v })}
            min={1}
          />
          <Divider />
          <Row
            label="Total de funcionários"
            value={planConfig.totalEmployees}
            onChange={(v) => setPlanConfig({ totalEmployees: v })}
            min={1}
            max={9999}
          />
        </Card>

        <SectionLabel style={{ marginTop: 20 }}>Itens variáveis</SectionLabel>
        <Card>
          <Row
            label="Quantificação"
            value={planConfig.quantificationQty}
            onChange={(v) => setPlanConfig({ quantificationQty: v })}
          />
          <Divider />
          <Row
            label="Periculosidade"
            value={planConfig.periculosidadeQty}
            onChange={(v) => setPlanConfig({ periculosidadeQty: v })}
          />
          <Divider />
          <Row
            label="Deslocamento (km)"
            value={planConfig.deslocamentoKm}
            onChange={(v) => setPlanConfig({ deslocamentoKm: v })}
            max={9999}
          />
          <Divider />
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 6,
          }}>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray800,
            }}>Insalubridade</Text>
            <Toggle
              value={planConfig.hasInsalubridade}
              onChange={(v) => setPlanConfig({ hasInsalubridade: v })}
            />
          </View>
        </Card>

        <SectionLabel style={{ marginTop: 20 }}>Desconto adicional</SectionLabel>
        <Card>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray800,
            }}>Desconto</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Counter
                value={planConfig.additionalDiscount}
                onChange={(v) => setPlanConfig({ additionalDiscount: v })}
                min={0}
                max={50}
              />
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray600,
                minWidth: 18,
              }}>%</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5, borderTopColor: colors.neutral.gray200,
      }}>
        <Button
          label="Calcular planos"
          onPress={() => router.push('/quote/select-plan' as any)}
          iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

function Row({ label, value, onChange, min = 0, max = 999 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 6,
    }}>
      <Text style={{
        fontFamily: 'Inter_400Regular',
        fontSize: typography.sizes.md,
        color: colors.neutral.gray800,
      }}>{label}</Text>
      <Counter value={value} onChange={onChange} min={min} max={max} />
    </View>
  );
}

function Divider() {
  return <View style={{ height: 0.5, backgroundColor: colors.neutral.gray200, marginVertical: 8 }} />;
}
