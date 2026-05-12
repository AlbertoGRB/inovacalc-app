import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconChevronLeft, IconCamera, IconLogout } from '@tabler/icons-react-native';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { maskPhone } from '@/lib/format';
import { BottomNav } from '@/components/layout/BottomNav';
import { colors, typography, radius } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  SELLER: 'Vendedor',
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, user, loadProfile, signOut } = useAuthStore();

  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const initials = (profile?.name ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria nas configurações do dispositivo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  }

  async function uploadAvatar(uri: string) {
    if (!user?.id) return;
    setUploading(true);
    try {
      // Detecta extensão e content-type
      const lower = uri.toLowerCase().split('?')[0];
      const dot = lower.lastIndexOf('.');
      const rawExt = dot >= 0 ? lower.slice(dot + 1) : 'jpg';
      const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(rawExt) ? rawExt : 'jpg';
      const contentType =
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'png'  ? 'image/png'  :
        ext === 'webp' ? 'image/webp' :
        ext === 'heic' ? 'image/heic' :
        ext === 'heif' ? 'image/heif' :
        'application/octet-stream';

      // Lê o arquivo como ArrayBuffer (compatível com Expo SDK 54)
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Falha ao ler imagem (${response.status})`);
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('Imagem vazia');

      // Caminho: <userId>/avatar-<timestamp>.<ext> para cache-bust
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      await loadProfile();
      Alert.alert('', 'Foto atualizada com sucesso!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        'Erro ao enviar foto',
        msg.includes('Bucket') || msg.toLowerCase().includes('not found')
          ? 'O bucket "avatars" não existe no Supabase Storage. Crie-o como público e tente novamente.'
          : msg,
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {    if (!user?.id || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim(), phone: phone.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      await loadProfile();
      Alert.alert('', 'Perfil atualizado!');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login' as any);
            } catch {
              Alert.alert('Erro', 'Não foi possível encerrar a sessão.');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{
          backgroundColor: colors.primary[900],
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconChevronLeft size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.sm,
                color: 'rgba(255,255,255,0.8)',
              }}>
                Voltar
              </Text>
            </TouchableOpacity>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.xl,
              color: colors.neutral.white,
            }}>
              Meu Perfil
            </Text>
          </View>

          {/* Avatar */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity onPress={handlePickPhoto} disabled={uploading} activeOpacity={0.85}>
              <View style={{
                width: 88, height: 88,
                borderRadius: 44,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.35)',
              }}>
                {uploading ? (
                  <ActivityIndicator color={colors.neutral.white} size="large" />
                ) : profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 88, height: 88 }} resizeMode="cover" />
                ) : (
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes['3xl'],
                    color: colors.neutral.white,
                  }}>
                    {initials}
                  </Text>
                )}
              </View>
              {/* Badge câmera */}
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: colors.neutral.white,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <IconCamera size={14} color={colors.primary[900]} strokeWidth={2} />
              </View>
            </TouchableOpacity>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.xs,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 10,
            }}>
              {uploading ? 'Enviando...' : 'Toque para alterar a foto'}
            </Text>
          </View>
        </View>

        {/* Card info conta */}
        <View style={{
          marginHorizontal: 20,
          marginTop: -20,
          backgroundColor: colors.neutral.white,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.neutral.gray200,
          padding: 16,
          marginBottom: 20,
        }}>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes.xs,
            color: colors.neutral.gray400,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Informações da Conta
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.base,
              color: colors.neutral.gray500,
            }}>
              E-mail
            </Text>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.base,
              color: colors.neutral.gray800,
            }}>
              {profile?.email ?? '—'}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.neutral.gray100, marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.base,
              color: colors.neutral.gray500,
            }}>
              Nível de acesso
            </Text>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.base,
              color: colors.neutral.gray800,
            }}>
              {ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? '—'}
            </Text>
          </View>
        </View>

        {/* Campos editáveis */}
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <View>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.sm,
              color: colors.neutral.gray700,
              marginBottom: 6,
            }}>
              Nome completo
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.neutral.gray400}
              style={{
                borderWidth: 1,
                borderColor: colors.neutral.gray200,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.base,
                color: colors.neutral.gray900,
                backgroundColor: colors.neutral.white,
              }}
            />
          </View>

          <View>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.sm,
              color: colors.neutral.gray700,
              marginBottom: 6,
            }}>
              Telefone
            </Text>
            <TextInput
              value={phone}
              onChangeText={t => setPhone(maskPhone(t))}
              placeholder="(00) 00000-0000"
              placeholderTextColor={colors.neutral.gray400}
              keyboardType="phone-pad"
              style={{
                borderWidth: 1,
                borderColor: colors.neutral.gray200,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.base,
                color: colors.neutral.gray900,
                backgroundColor: colors.neutral.white,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name.trim()}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.primary[900],
              borderRadius: radius.md,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: saving || !name.trim() ? 0.5 : 1,
              marginTop: 4,
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.lg,
                color: colors.neutral.white,
              }}>
                Salvar alterações
              </Text>
            )}
          </TouchableOpacity>

          {/* Sair da conta */}
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.danger[50],
              backgroundColor: colors.neutral.white,
              paddingVertical: 14,
              marginTop: 12,
            }}
          >
            <IconLogout size={18} color={colors.danger[600]} strokeWidth={2} />
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.lg,
              color: colors.danger[600],
            }}>
              Sair da conta
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}
