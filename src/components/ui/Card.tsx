import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'flat' | 'selected' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const paddingMap = { none: 0, sm: 10, md: 14, lg: 20 };

export function Card({ children, onPress, variant = 'default', padding = 'md', style }: CardProps) {
  const bg =
    variant === 'flat'     ? colors.neutral.gray50 :
    variant === 'selected' ? colors.primary[50] :
    variant === 'dark'     ? colors.primary[900] :
                             colors.neutral.white;
  const borderColor =
    variant === 'selected' ? colors.primary[200] :
    variant === 'dark'     ? colors.primary[900] :
                             colors.neutral.gray200;
  const containerStyle: ViewStyle = {
    backgroundColor: bg,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor,
    padding: paddingMap[padding],
    ...(style ?? {}),
  };
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={containerStyle}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={containerStyle}>{children}</View>;
}
