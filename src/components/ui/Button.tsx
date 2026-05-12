import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { colors, typography, radius } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: colors.primary[900], text: colors.neutral.white },
  secondary: { bg: 'transparent', text: colors.neutral.gray800, border: colors.neutral.gray200 },
  ghost:     { bg: 'transparent', text: colors.primary[600] },
  danger:    { bg: colors.danger[50], text: colors.danger[600] },
};

const sizeStyles: Record<Size, { py: number; px: number; fontSize: number }> = {
  sm: { py: 8,  px: 12, fontSize: typography.sizes.sm },
  md: { py: 12, px: 16, fontSize: typography.sizes.lg },
  lg: { py: 14, px: 20, fontSize: typography.sizes.xl },
};

interface ButtonProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress?: () => void;
}

export function Button({
  label, variant = 'primary', size = 'md',
  loading, disabled, fullWidth = true,
  icon, iconRight, onPress,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: v.bg, borderRadius: radius.md,
        paddingVertical: s.py, paddingHorizontal: s.px,
        borderWidth: v.border ? 0.5 : 0, borderColor: v.border ?? 'transparent',
        opacity: disabled || loading ? 0.5 : 1,
        ...(fullWidth ? { alignSelf: 'stretch' as const } : {}),
        gap: 8,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text style={{
            fontFamily: 'Inter_500Medium', fontSize: s.fontSize,
            color: v.text, letterSpacing: 0.2,
          }}>
            {label}
          </Text>
          {iconRight}
        </>
      )}
    </TouchableOpacity>
  );
}
