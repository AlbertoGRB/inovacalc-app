import { View, Text } from 'react-native';
import { colors, typography, radius } from '@/theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const variantMap: Record<Variant, { bg: string; text: string }> = {
  success: { bg: colors.success[50],       text: colors.success[800] },
  warning: { bg: colors.warning[50],       text: colors.warning[800] },
  danger:  { bg: colors.danger[50],        text: colors.danger[800] },
  info:    { bg: colors.info[50],          text: colors.info[800] },
  neutral: { bg: colors.neutral.gray100,   text: colors.neutral.gray700 },
  primary: { bg: colors.primary[900],      text: colors.neutral.white },
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  const v = variantMap[variant];
  return (
    <View style={{
      backgroundColor: v.bg, borderRadius: radius.sm,
      paddingVertical: size === 'sm' ? 2 : 3,
      paddingHorizontal: size === 'sm' ? 6 : 8,
      alignSelf: 'flex-start',
    }}>
      <Text style={{
        fontFamily: 'Inter_500Medium', color: v.text,
        fontSize: size === 'sm' ? typography.sizes.xs : typography.sizes.sm,
        letterSpacing: 0.3,
      }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
