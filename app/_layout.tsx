/**
 * @module RootLayout
 * Layout raiz do InovaCalc Mobile.
 *
 * Responsabilidades:
 * 1. Configura o network manager (AppState → TanStack onlineManager)
 * 2. Cria e persiste o QueryClient com cache de 7 dias
 * 3. Inicializa as fontes Inter
 * 4. Implementa o AuthGate: redireciona baseado no estado de autenticação
 * 5. Dispara flushOutbox periodicamente quando autenticado
 *
 * Ordem de inicialização crítica:
 *   setupNetworkManager() → QueryClient → PersistQueryClientProvider
 *   → AuthGate.initialize() → session restaurada → queries habilitadas
 */

import '../global.css';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/lib/queryClient';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { useAuthStore } from '@/stores/authStore';
import { flushOutbox } from '@/lib/sync';
import { setupNetworkManager } from '@/lib/network';
import { requestAppPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

// Configura integração de rede com TanStack Query antes de qualquer coisa
setupNetworkManager();

const TAG = 'RootLayout';

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1_000,
  key: 'inovacalc-query-cache-v1',
});

// ─── AuthGate ────────────────────────────────────────────────────────────────

/**
 * Componente nulo que gerencia o fluxo de autenticação.
 * Deve ser filho do PersistQueryClientProvider para que os hooks de Query
 * já estejam disponíveis quando as queries forem habilitadas.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized, initialize } = useAuthStore();

  // Inicializa a sessão do Supabase (lê do AsyncStorage)
  useEffect(() => {
    logger.info(TAG, 'AuthGate montado — inicializando sessão');
    initialize();
  }, [initialize]);

  // Permissões: solicita câmera + notificações uma vez após o login
  useEffect(() => {
    if (!session) return;
    requestAppPermissions();
  }, [session]);

  // Sync engine: flush da outbox ao logar e a cada 30s
  useEffect(() => {
    if (!session) return;
    logger.info(TAG, 'Sessão ativa — iniciando sync engine');
    flushOutbox().catch(() => {});
    const interval = setInterval(() => {
      flushOutbox().catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [session]);

  // Redireciona baseado no estado de auth (só após inicialização completa)
  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      logger.info(TAG, 'Sem sessão → redirecionando para login');
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      logger.info(TAG, 'Sessão ativa → redirecionando para app');
      router.replace('/(app)');
    }
  }, [initialized, session, segments, router]);

  return null;
}

// ─── Layout raiz ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });

  if (!fontsLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
          }}
        >
          <AuthGate />
          <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="quote" />
          </Stack>
          <StatusBar style="light" />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
