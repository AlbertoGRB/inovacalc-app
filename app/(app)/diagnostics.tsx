/**
 * Tela de diagnóstico — acessível via Perfil.
 * Mostra estado de auth, queries, rede e permissões para depuração.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconChevronLeft, IconRefresh, IconCopy } from '@tabler/icons-react-native';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { checkConnectivity } from '@/lib/network';
import { colors, typography, radius } from '@/theme';

interface DiagResult {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'error' | 'info';
}

export default function DiagnosticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, user, profile, initialized } = useAuthStore();
  const [results, setResults] = useState<DiagResult[]>([]);
  const [running, setRunning] = useState(false);

  async function runDiagnostics() {
    setRunning(true);
    const diag: DiagResult[] = [];

    // 1. Auth state
    diag.push({
      label: 'Auth initialized',
      value: String(initialized),
      status: initialized ? 'ok' : 'error',
    });
    diag.push({
      label: 'Session',
      value: session ? `Ativa (exp: ${new Date((session.expires_at ?? 0) * 1000).toLocaleString('pt-BR')})` : 'Nenhuma',
      status: session ? 'ok' : 'error',
    });
    diag.push({
      label: 'User ID',
      value: user?.id ?? 'N/A',
      status: user ? 'ok' : 'error',
    });
    diag.push({
      label: 'User Email',
      value: user?.email ?? 'N/A',
      status: user ? 'ok' : 'warn',
    });

    // 2. Profile
    diag.push({
      label: 'Profile carregado',
      value: profile ? `Sim (${profile.name})` : 'Nao',
      status: profile ? 'ok' : 'error',
    });
    diag.push({
      label: 'Profile role',
      value: profile?.role ?? 'N/A',
      status: profile?.role ? 'ok' : 'error',
    });
    diag.push({
      label: 'Profile is_active',
      value: profile?.is_active === undefined ? 'campo ausente' : String(profile.is_active),
      status: profile?.is_active === true ? 'ok' : 'error',
    });

    // 3. Supabase config
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    diag.push({
      label: 'SUPABASE_URL',
      value: url ? `${url.slice(0, 30)}...` : 'UNDEFINED',
      status: url ? 'ok' : 'error',
    });
    diag.push({
      label: 'SUPABASE_ANON_KEY',
      value: key ? `${key.slice(0, 20)}...` : 'UNDEFINED',
      status: key ? 'ok' : 'error',
    });

    // 4. Connectivity
    try {
      const online = await checkConnectivity();
      diag.push({
        label: 'Conectividade (HEAD)',
        value: online ? 'Online' : 'Offline',
        status: online ? 'ok' : 'error',
      });
    } catch (e) {
      diag.push({
        label: 'Conectividade (HEAD)',
        value: `Erro: ${e}`,
        status: 'error',
      });
    }

    // 5. Direct Supabase queries (bypass hooks)
    // Profile query
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, is_active')
          .eq('id', user.id)
          .single();
        if (error) {
          diag.push({
            label: 'DB: profiles (direto)',
            value: `ERRO: ${error.message} (code: ${error.code})`,
            status: 'error',
          });
        } else {
          diag.push({
            label: 'DB: profiles (direto)',
            value: `role=${data.role}, is_active=${data.is_active}`,
            status: data.is_active ? 'ok' : 'error',
          });
        }
      } catch (e: any) {
        diag.push({
          label: 'DB: profiles (direto)',
          value: `EXCEPTION: ${e.message}`,
          status: 'error',
        });
      }
    }

    // Companies query
    try {
      const { data, error, count } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true });
      if (error) {
        diag.push({
          label: 'DB: companies',
          value: `ERRO: ${error.message} (code: ${error.code})`,
          status: 'error',
        });
      } else {
        diag.push({
          label: 'DB: companies',
          value: `${count ?? 0} registros visíveis`,
          status: (count ?? 0) > 0 ? 'ok' : 'warn',
        });
      }
    } catch (e: any) {
      diag.push({
        label: 'DB: companies',
        value: `EXCEPTION: ${e.message}`,
        status: 'error',
      });
    }

    // Quotes query
    try {
      const { data, error, count } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true });
      if (error) {
        diag.push({
          label: 'DB: quotes',
          value: `ERRO: ${error.message} (code: ${error.code})`,
          status: 'error',
        });
      } else {
        diag.push({
          label: 'DB: quotes',
          value: `${count ?? 0} registros visíveis`,
          status: (count ?? 0) > 0 ? 'ok' : 'warn',
        });
      }
    } catch (e: any) {
      diag.push({
        label: 'DB: quotes',
        value: `EXCEPTION: ${e.message}`,
        status: 'error',
      });
    }

    // Plan configs
    try {
      const { data, error } = await supabase
        .from('plan_configs')
        .select('id', { count: 'exact', head: true });
      if (error) {
        diag.push({
          label: 'DB: plan_configs',
          value: `ERRO: ${error.message}`,
          status: 'error',
        });
      } else {
        diag.push({
          label: 'DB: plan_configs',
          value: `OK`,
          status: 'ok',
        });
      }
    } catch (e: any) {
      diag.push({
        label: 'DB: plan_configs',
        value: `EXCEPTION: ${e.message}`,
        status: 'error',
      });
    }

    // 6. Recent logs (last 5 errors/warns)
    const recentErrors = logger.getLogs()
      .filter(l => l.level === 'ERROR' || l.level === 'WARN')
      .slice(-5);
    if (recentErrors.length > 0) {
      recentErrors.forEach((log, i) => {
        diag.push({
          label: `Log ${log.level} [${log.tag}]`,
          value: log.message,
          status: log.level === 'ERROR' ? 'error' : 'warn',
        });
      });
    } else {
      diag.push({
        label: 'Logs recentes',
        value: 'Nenhum erro ou warning',
        status: 'ok',
      });
    }

    setResults(diag);
    setRunning(false);
  }

  useEffect(() => {
    runDiagnostics();
  }, []);

  const statusColor = {
    ok: '#16a34a',
    warn: '#d97706',
    error: '#dc2626',
    info: colors.primary[600],
  };

  async function handleShareAll() {
    const text = results.map(r => `[${r.status.toUpperCase()}] ${r.label}: ${r.value}`).join('\n');
    try {
      await Share.share({ message: `InovaCalc Diagnostico\n\n${text}` });
    } catch {
      Alert.alert('Erro', 'Nao foi possivel compartilhar.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary[900],
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <IconChevronLeft size={20} color="rgba(255,255,255,0.8)" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{
          fontFamily: 'Inter_500Medium',
          fontSize: typography.sizes.xl,
          color: colors.neutral.white,
          flex: 1,
        }}>Diagnostico</Text>
        <TouchableOpacity onPress={handleShareAll} hitSlop={8}>
          <IconCopy size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={runDiagnostics} hitSlop={8} disabled={running}>
          <IconRefresh size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {running ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary[600]} size="large" />
          <Text style={{
            marginTop: 12,
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.md,
            color: colors.neutral.gray500,
          }}>Executando diagnostico...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.sm,
            color: colors.neutral.gray500,
            marginBottom: 8,
          }}>
            Toque no icone de copiar para enviar ao suporte.
          </Text>

          {results.map((r, i) => (
            <View key={i} style={{
              backgroundColor: colors.neutral.white,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.neutral.gray200,
              padding: 12,
              borderLeftWidth: 4,
              borderLeftColor: statusColor[r.status],
            }}>
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.sm,
                color: colors.neutral.gray700,
                marginBottom: 2,
              }}>{r.label}</Text>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.sm,
                color: statusColor[r.status],
              }} selectable>{r.value}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
