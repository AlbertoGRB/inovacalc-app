import { View, Text, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconQuestionMark, IconBook, IconMail, IconBrandWhatsapp, IconChevronRight,
} from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { CategoryIcon, SectionLabel } from '@/components/ui/CategoryIcon';
import { colors, typography, radius } from '@/theme';

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Ajuda"
        subtitle="Como podemos te apoiar?"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>Primeiros passos</SectionLabel>
        <View style={{ gap: 10 }}>
          <Row
            icon={<IconBook size={18} color={colors.primary[600]} strokeWidth={1.8} />}
            cat="company"
            title="Como criar um orçamento"
            subtitle="Guia rápido em 6 etapas"
          />
          <Row
            icon={<IconQuestionMark size={18} color="#3B6D11" strokeWidth={1.8} />}
            cat="plan"
            title="Diferenças entre os planos"
            subtitle="Essencial, Integral e Avançado"
          />
        </View>

        <SectionLabel style={{ marginTop: 20 }}>Falar conosco</SectionLabel>
        <View style={{ gap: 10 }}>
          <Row
            icon={<IconBrandWhatsapp size={18} color="#3B6D11" strokeWidth={1.8} />}
            cat="plan"
            title="WhatsApp"
            subtitle="Resposta em até 1h útil"
            onPress={() => Linking.openURL('https://wa.me/5500000000000')}
          />
          <Row
            icon={<IconMail size={18} color={colors.primary[600]} strokeWidth={1.8} />}
            cat="company"
            title="Email"
            subtitle="suporte@inovassie.com.br"
            onPress={() => Linking.openURL('mailto:suporte@inovassie.com.br')}
          />
        </View>

        <Text style={{
          marginTop: 24,
          textAlign: 'center',
          fontFamily: 'Inter_400Regular',
          fontSize: typography.sizes.xs,
          color: colors.neutral.gray400,
        }}>v2.0 · InovaCalc · Inovassie</Text>
      </ScrollView>
    </View>
  );
}

function Row({ icon, cat, title, subtitle, onPress }: {
  icon: React.ReactNode;
  cat: 'company' | 'plan' | 'training' | 'service';
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress}>
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
            marginTop: 2,
          }}>{subtitle}</Text>
        </View>
        <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
      </View>
    </Card>
  );
}
