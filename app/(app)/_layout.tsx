/**
 * @module AppLayout
 * Layout das telas autenticadas.
 * Exibe o NetworkBanner no topo quando offline ou com pendências de sync.
 */

import { View } from 'react-native';
import { Stack } from 'expo-router';
import { NetworkBanner } from '@/components/ui/NetworkBanner';

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <NetworkBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
