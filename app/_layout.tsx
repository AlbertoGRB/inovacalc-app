import '../global.css';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { useAuthStore } from '@/stores/authStore';
import { flushOutbox } from '@/lib/sync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync engine — tenta enviar a fila de pendências periodicamente.
  // Roda no boot e a cada 30s. Sem custo se a fila está vazia.
  useEffect(() => {
    if (!session) return;
    flushOutbox().catch(() => {});
    const interval = setInterval(() => {
      flushOutbox().catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [initialized, session, segments, router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });

  if (!fontsLoaded) return <View style={{ flex: 1 }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: 1000 * 60 * 60 * 24 * 7,
          }}
        >
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <StatusBar style="light" />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
