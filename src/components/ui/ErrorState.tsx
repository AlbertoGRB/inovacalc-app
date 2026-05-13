/**
 * @component ErrorState
 * Exibe uma mensagem de erro amigável com botão de retry.
 * Diferencia erro de rede (sem conexão) de erro do servidor.
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { IconWifiOff, IconAlertTriangle, IconRefresh } from '@tabler/icons-react-native';
import { colors, typography, radius } from '@/theme';

interface ErrorStateProps {
  /** Objeto de erro — pode ser Error, string ou qualquer valor. */
  error?: unknown;
  /** Callback chamado ao pressionar "Tentar novamente". */
  onRetry?: () => void;
  /** Mensagem alternativa ao erro padrão. */
  message?: string;
}

function isNetworkErr(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('aborted') ||
    msg.includes('timeout')
  );
}

export function ErrorState({ error, onRetry, message }: ErrorStateProps) {
  const isNet = isNetworkErr(error);
  const title = isNet ? 'Sem conexão' : 'Não foi possível carregar';
  const subtitle =
    message ??
    (isNet
      ? 'Verifique sua internet. Dados salvos podem estar disponíveis offline.'
      : 'Ocorreu um erro ao buscar os dados. Tente novamente.');

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: isNet ? colors.warning[50] : '#FEE2E2',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isNet ? (
          <IconWifiOff size={24} color={colors.warning[600]} strokeWidth={1.8} />
        ) : (
          <IconAlertTriangle size={24} color="#EF4444" strokeWidth={1.8} />
        )}
      </View>

      <Text
        style={{
          fontFamily: 'Inter_500Medium',
          fontSize: typography.sizes.lg,
          color: colors.neutral.gray800,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: typography.sizes.sm,
          color: colors.neutral.gray500,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        {subtitle}
      </Text>

      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.8}
          style={{
            marginTop: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: radius.lg,
            backgroundColor: colors.primary[900],
          }}
        >
          <IconRefresh size={14} color={colors.neutral.white} strokeWidth={2} />
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.sm,
              color: colors.neutral.white,
            }}
          >
            Tentar novamente
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
