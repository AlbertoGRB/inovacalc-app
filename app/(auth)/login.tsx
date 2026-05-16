import { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView,
  TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight, IconCheck,
} from '@tabler/icons-react-native';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography, radius } from '@/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { signIn, loading } = useAuthStore();

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Informe e-mail e senha.');
      return;
    }
    const { error } = await signIn(email.trim(), password);
    if (error) setErrorMsg('E-mail ou senha inválidos.');
    else router.replace('/(app)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.primary[900] }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{
            width: 96, height: 96,
            borderRadius: radius.xl,
            backgroundColor: colors.neutral.white,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            overflow: 'hidden',
          }}>
            <Image
              source={require('../../assets/favicon.png')}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
          </View>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes['3xl'],
            color: colors.neutral.white,
            letterSpacing: -0.5,
          }}>InovaCalc</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.md,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 2,
          }}>Plataforma SST</Text>
        </View>

        {/* Card */}
        <View style={{
          backgroundColor: colors.neutral.white,
          borderRadius: radius['2xl'],
          paddingVertical: 28,
          paddingHorizontal: 20,
        }}>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes.xl,
            color: colors.neutral.gray900,
          }}>Acesse sua conta</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.md,
            color: colors.neutral.gray500,
            marginTop: 2,
            marginBottom: 20,
          }}>Continue de onde parou</Text>

          <View style={{ gap: 14 }}>
            <Input
              label="EMAIL"
              icon={<IconMail size={16} color={colors.neutral.gray500} strokeWidth={1.8} />}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="voce@email.com"
              editable={!loading}
            />
            <Input
              label="SENHA"
              icon={<IconLock size={16} color={colors.neutral.gray500} strokeWidth={1.8} />}
              iconRight={showPassword
                ? <IconEyeOff size={16} color={colors.neutral.gray500} strokeWidth={1.8} />
                : <IconEye size={16} color={colors.neutral.gray500} strokeWidth={1.8} />}
              onIconRightPress={() => setShowPassword(s => !s)}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              editable={!loading}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 16, marginBottom: 20,
          }}>
            <TouchableOpacity
              onPress={() => setRemember(r => !r)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{
                width: 18, height: 18, borderRadius: 4,
                borderWidth: remember ? 0 : 0.5,
                borderColor: colors.neutral.gray300,
                backgroundColor: remember ? colors.primary[900] : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {remember && <IconCheck size={12} color={colors.neutral.white} strokeWidth={3} />}
              </View>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray700,
              }}>Manter conectado</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/forgot-password' as any)}>
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.md,
                color: colors.primary[600],
              }}>Esqueci a senha</Text>
            </TouchableOpacity>
          </View>

          <Button
            label="Entrar"
            onPress={handleSubmit}
            loading={loading}
            iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
          />

          {errorMsg && (
            <View style={{
              marginTop: 14,
              backgroundColor: colors.danger[50],
              borderRadius: radius.md,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.sm,
                color: colors.danger[600],
              }}>{errorMsg}</Text>
            </View>
          )}
        </View>

        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: typography.sizes.xs,
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          marginTop: 24,
        }}>v2.0 · Inovassie © {new Date().getFullYear()}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
