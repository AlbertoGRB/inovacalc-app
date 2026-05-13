/**
 * @component NetworkBanner
 * Banner fixo no topo que indica modo offline ou dados desatualizados.
 *
 * Aparece quando:
 * - onlineManager do TanStack Query reporta offline (app em background / sem rede)
 * - OU há operações pendentes na outbox para sincronizar
 *
 * Usado no layout raiz de telas autenticadas (app/(app)/_layout.tsx).
 */

import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { IconWifiOff, IconCloudUpload } from '@tabler/icons-react-native';
import { useOutbox } from '@/stores/outboxStore';
import { flushOutbox } from '@/lib/sync';
import { colors, typography } from '@/theme';

export function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(onlineManager.isOnline());
  const [syncing, setSyncing] = useState(false);
  const pendingOps = useOutbox((s) => s.ops.filter((o) => o.status === 'pending' || o.status === 'error').length);

  useEffect(() => {
    // Escuta mudanças do onlineManager
    const unsub = onlineManager.subscribe(() => {
      setIsOnline(onlineManager.isOnline());
    });
    return unsub;
  }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await flushOutbox();
    } finally {
      setSyncing(false);
    }
  };

  const showOffline = !isOnline;
  const showPending = isOnline && pendingOps > 0;

  if (!showOffline && !showPending) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        backgroundColor: showOffline ? '#FEF3C7' : colors.info[50],
        borderBottomWidth: 0.5,
        borderBottomColor: showOffline ? '#F59E0B' : colors.info[200],
      }}
    >
      {showOffline ? (
        <>
          <IconWifiOff size={14} color={colors.warning[700]} strokeWidth={2} />
          <Text
            style={{
              flex: 1,
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.xs,
              color: colors.warning[800],
            }}
          >
            Modo offline — exibindo dados salvos
          </Text>
        </>
      ) : (
        <>
          <IconCloudUpload size={14} color={colors.info[700]} strokeWidth={2} />
          <Text
            style={{
              flex: 1,
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.xs,
              color: colors.info[800],
            }}
          >
            {pendingOps === 1 ? '1 alteração' : `${pendingOps} alterações`} aguardando envio
          </Text>
          <TouchableOpacity onPress={handleSync} activeOpacity={0.7}>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.xs,
                color: colors.info[700],
              }}
            >
              {syncing ? 'Enviando...' : 'Enviar agora'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
