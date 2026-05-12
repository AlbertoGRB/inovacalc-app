import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconUser, IconBell, IconLock, IconLogout, IconChevronRight,
  IconQuestionMark, IconMoon,
} from '@tabler/icons-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Toggle } from '@/components/ui/Toggle';
import { SectionLabel } from '@/components/ui/CategoryIcon';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography, radius } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuthStore();
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair', style: 'destructive', onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Configurações"
        subtitle="Conta, preferências e segurança"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Perfil */}
        <Card onPress={() => router.push('/profile')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar name={profile?.name ?? 'U'} uri={profile?.avatar_url ?? undefined} size="md" />
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.lg,
                color: colors.neutral.gray900,
              }}>{profile?.name ?? 'Usuário'}</Text>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.sm,
                color: colors.neutral.gray500,
              }}>{profile?.email ?? ''}</Text>
            </View>
            <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
          </View>
        </Card>

        <SectionLabel style={{ marginTop: 20 }}>Preferências</SectionLabel>
        <Card padding="none">
          <SwitchRow
            icon={<IconBell size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Notificações push"
            value={notifPush}
            onChange={setNotifPush}
          />
          <Divider />
          <SwitchRow
            icon={<IconBell size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Notificações por email"
            value={notifEmail}
            onChange={setNotifEmail}
          />
          <Divider />
          <SwitchRow
            icon={<IconMoon size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Modo escuro"
            value={darkMode}
            onChange={setDarkMode}
          />
        </Card>

        <SectionLabel style={{ marginTop: 20 }}>Conta</SectionLabel>
        <Card padding="none">
          <LinkRow
            icon={<IconUser size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Editar perfil"
            onPress={() => router.push('/profile')}
          />
          <Divider />
          <LinkRow
            icon={<IconLock size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Alterar senha"
            onPress={() => Alert.alert('Em breve', 'Em desenvolvimento.')}
          />
          <Divider />
          <LinkRow
            icon={<IconQuestionMark size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Ajuda e suporte"
            onPress={() => router.push('/help' as any)}
          />
        </Card>

        <Card style={{ marginTop: 20 }} onPress={handleSignOut}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconLogout size={16} color={colors.danger[600]} strokeWidth={1.8} />
            <Text style={{
              flex: 1,
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.md,
              color: colors.danger[600],
            }}>Sair da conta</Text>
          </View>
        </Card>

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

function SwitchRow({ icon, label, value, onChange }: {
  icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 14, gap: 12,
    }}>
      {icon}
      <Text style={{
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: typography.sizes.md,
        color: colors.neutral.gray800,
      }}>{label}</Text>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

function LinkRow({ icon, label, onPress }: {
  icon: React.ReactNode; label: string; onPress?: () => void;
}) {
  const { TouchableOpacity } = require('react-native');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 14, gap: 12,
    }}>
      {icon}
      <Text style={{
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: typography.sizes.md,
        color: colors.neutral.gray800,
      }}>{label}</Text>
      <IconChevronRight size={14} color={colors.neutral.gray400} strokeWidth={2} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={{ height: 0.5, backgroundColor: colors.neutral.gray200, marginHorizontal: 14 }} />;
}
