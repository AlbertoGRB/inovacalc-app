import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { colors, typography, radius } from '@/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  onIconRightPress?: () => void;
}

export function Input({
  label, hint, error, icon, iconRight, onIconRightPress, ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger[600]
    : focused
    ? colors.primary[900]
    : colors.neutral.gray200;

  return (
    <View style={{ gap: 4 }}>
      {label && (
        <Text style={{
          fontFamily: 'Inter_500Medium',
          fontSize: typography.sizes.sm,
          color: colors.neutral.gray700,
          letterSpacing: 0.1,
        }}>
          {label}
        </Text>
      )}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor,
        borderRadius: radius.md,
        backgroundColor: colors.neutral.white,
        paddingHorizontal: 12,
        gap: 8,
      }}>
        {icon && <View style={{ opacity: 0.5 }}>{icon}</View>}
        <TextInput
          {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e); }}
          onBlur={e => { setFocused(false); props.onBlur?.(e); }}
          style={{
            flex: 1,
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.base,
            color: colors.neutral.gray900,
            paddingVertical: 12,
          }}
          placeholderTextColor={colors.neutral.gray400}
        />
        {iconRight && (
          <TouchableOpacity onPress={onIconRightPress} disabled={!onIconRightPress}>
            <View style={{ opacity: 0.5 }}>{iconRight}</View>
          </TouchableOpacity>
        )}
      </View>
      {(hint || error) && (
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: typography.sizes.xs,
          color: error ? colors.danger[600] : colors.neutral.gray500,
        }}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
