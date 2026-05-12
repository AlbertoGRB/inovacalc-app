import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconMail, IconArrowRight, IconArrowLeft } from '@tabler/icons-react-native';
import { supabase } from '@/lib/supabase';
import { colors, typography, radius } from '@/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Informe o e-mail.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) setErrorMsg('Não foi possível enviar. Tente novamente.');
    else setSent(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.primary[900] }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1, justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes['2xl'],
            color: colors.neutral.white,
          }}>Recuperar senha</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.md,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 4, textAlign: 'center',
          }}>Enviaremos um link para o seu e-mail</Text>
        </View>

        <View style={{
          backgroundColor: colors.neutral.white,
          borderRadius: radius['2xl'],
          paddingVertical: 28, paddingHorizontal: 20,
        }}>
          {sent ? (
            <View style={{ gap: 12, alignItems: 'center' }}>
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.xl,
                color: colors.success[600],
              }}>Verifique seu e-mail</Text>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray600,
                textAlign: 'center',
              }}>Enviamos um link para {email}. Abra-o no celular para redefinir sua senha.</Text>
              <View style={{ marginTop: 8, width: '100%' }}>
                <Button
                  label="Voltar ao login"
                  variant="secondary"
                  icon={<IconArrowLeft size={16} color={colors.neutral.gray800} strokeWidth={2} />}
                  onPress={() => router.replace('/(auth)/login')}
                />
              </View>
            </View>
          ) : (
            <>
              <Input
                label="EMAIL"
                icon={<IconMail size={16} color={colors.neutral.gray500} strokeWidth={1.8} />}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="voce@email.com"
                editable={!loading}
              />
              {errorMsg && (
                <Text style={{
                  marginTop: 8,
                  fontFamily: 'Inter_400Regular',
                  fontSize: typography.sizes.sm,
                  color: colors.danger[600],
                }}>{errorMsg}</Text>
              )}
              <View style={{ marginTop: 18, gap: 10 }}>
                <Button
                  label="Enviar link"
                  loading={loading}
                  onPress={handleSubmit}
                  iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
                />
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => router.back()}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
