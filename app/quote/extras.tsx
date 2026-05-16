import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconArrowRight } from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Counter } from '@/components/ui/Counter';
import { Toggle } from '@/components/ui/Toggle';
import { Segmented } from '@/components/ui/Segmented';
import { SectionLabel } from '@/components/ui/CategoryIcon';
import { colors, typography } from '@/theme';

type Tab = 'sst' | 'desloc' | 'outros';

type ExtrasState = {
  respTecnica: boolean;
  ruido: boolean;
  insalubridade: boolean;
  quantificacaoQty: number;
  periculosidadeQty: number;
  deslocamentoKm: number;
  margin: number;
};

const DEFAULT_EXTRAS: ExtrasState = {
  respTecnica: false,
  ruido: false,
  insalubridade: false,
  quantificacaoQty: 0,
  periculosidadeQty: 0,
  deslocamentoKm: 0,
  margin: 0,
};

export default function ExtrasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [extras, setExtrasState] = useState<ExtrasState>(DEFAULT_EXTRAS);
  const setExtras = (patch: Partial<ExtrasState>) =>
    setExtrasState((prev) => ({ ...prev, ...patch }));
  const [tab, setTab] = useState<Tab>('sst');

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Serviços avulsos"
        subtitle="Adicione itens fora do plano"
        steps={6} currentStep={6}
        onBack={() => router.back()}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sst',    label: 'SST' },
            { value: 'desloc', label: 'Desloc.' },
            { value: 'outros', label: 'Outros' },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'sst' && (
          <>
            <SectionLabel>Itens técnicos</SectionLabel>
            <Card>
              <ToggleRow
                label="Responsável técnico"
                value={extras.respTecnica}
                onChange={(v) => setExtras({ respTecnica: v })}
              />
              <Divider />
              <ToggleRow
                label="Ruído"
                value={extras.ruido}
                onChange={(v) => setExtras({ ruido: v })}
              />
              <Divider />
              <ToggleRow
                label="Insalubridade"
                value={extras.insalubridade}
                onChange={(v) => setExtras({ insalubridade: v })}
              />
            </Card>

            <SectionLabel style={{ marginTop: 20 }}>Quantidades</SectionLabel>
            <Card>
              <CounterRow
                label="Quantificação"
                value={extras.quantificacaoQty}
                onChange={(v) => setExtras({ quantificacaoQty: v })}
              />
              <Divider />
              <CounterRow
                label="Periculosidade"
                value={extras.periculosidadeQty}
                onChange={(v) => setExtras({ periculosidadeQty: v })}
              />
            </Card>
          </>
        )}

        {tab === 'desloc' && (
          <Card>
            <CounterRow
              label="Quilometragem"
              value={extras.deslocamentoKm}
              onChange={(v) => setExtras({ deslocamentoKm: v })}
              max={9999}
            />
          </Card>
        )}

        {tab === 'outros' && (
          <Card>
            <CounterRow
              label="Margem (%)"
              value={extras.margin}
              onChange={(v) => setExtras({ margin: v })}
              min={0}
              max={100}
            />
          </Card>
        )}
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5, borderTopColor: colors.neutral.gray200,
      }}>
        <Button
          label="Ver resumo"
          onPress={() => router.push('/quote/summary' as any)}
          iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
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
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

function CounterRow({ label, value, onChange, min = 0, max = 999 }: {
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
