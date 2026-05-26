import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconShieldCheck, IconSchool, IconStethoscope, IconArrowRight, IconCheck, IconInfoCircle,
} from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useQuoteDraft, type IncludeFlags } from '@/stores/quoteDraftStore';
import { colors, typography, radius } from '@/theme';

const OPTIONS: Array<{
  key: keyof IncludeFlags;
  title: string;
  desc: string;
  cat: 'plan' | 'training' | 'service';
  icon: any;
}> = [
  { key: 'plan',      title: 'Plano de SST',  desc: 'Essencial, Integral ou Avançado', cat: 'plan',     icon: IconShieldCheck },
  { key: 'trainings', title: 'Treinamentos',  desc: 'NRs, combos e cursos avulsos',          cat: 'training', icon: IconSchool },
  { key: 'extras',    title: 'Serviços avulsos', desc: 'Quantificação, ruído e outros',        cat: 'service',  icon: IconStethoscope },
];

export default function WhatIncludeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { include, toggleInclude } = useQuoteDraft();
  const anySelected = include.plan || include.trainings || include.extras;

  const handleNext = () => {
    if (include.plan) router.push('/quote/configure-plan' as any);
    else if (include.trainings) router.push('/quote/trainings' as any);
    else if (include.extras) router.push('/quote/extras' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="O que incluir?"
        subtitle="Marque tudo que fará parte do orçamento"
        steps={6} currentStep={2}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 10 }}>
          {OPTIONS.map(opt => {
            const Icon = opt.icon;
            const selected = include[opt.key];
            return (
              <Card
                key={opt.key}
                variant={selected ? 'selected' : 'default'}
                onPress={() => toggleInclude(opt.key)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <CategoryIcon
                    category={opt.cat}
                    size={40}
                    icon={<Icon size={22} color={colors.categories[opt.cat].icon} strokeWidth={1.8} />}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: typography.sizes.lg,
                      color: colors.neutral.gray900,
                    }}>{opt.title}</Text>
                    <Text style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: typography.sizes.sm,
                      color: colors.neutral.gray500,
                      marginTop: 2,
                    }}>{opt.desc}</Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 6,
                    borderWidth: selected ? 0 : 1,
                    borderColor: colors.neutral.gray300,
                    backgroundColor: selected ? colors.primary[600] : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <IconCheck size={14} color={colors.neutral.white} strokeWidth={3} />}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        <View style={{
          marginTop: 20,
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: colors.info[50],
          borderRadius: radius.md,
          padding: 12,
        }}>
          <IconInfoCircle size={16} color={colors.info[800]} strokeWidth={1.8} />
          <Text style={{
            flex: 1,
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.sm,
            color: colors.info[800],
            lineHeight: 18,
          }}>
            Você pode combinar Plano + Treinamentos para aplicar descontos progressivos.
          </Text>
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5, borderTopColor: colors.neutral.gray200,
      }}>
        <Button
          label="Continuar"
          disabled={!anySelected}
          onPress={handleNext}
          iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}
