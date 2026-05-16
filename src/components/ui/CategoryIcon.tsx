import { View, Text, type TextStyle } from 'react-native';
import { colors, typography, radius } from '@/theme';

const CAT_COLORS = {
  company:  colors.categories.company,
  plan:     colors.categories.plan,
  training: colors.categories.training,
  service:  colors.categories.service,
  quote:    colors.categories.quote,
};

interface CategoryIconProps {
  category: keyof typeof CAT_COLORS;
  icon: React.ReactNode;
  size?: number;
}

export function CategoryIcon({ category, icon, size = 40 }: CategoryIconProps) {
  const cat = CAT_COLORS[category] ?? CAT_COLORS.company;
  return (
    <View style={{
      width: size, height: size, borderRadius: radius.md,
      backgroundColor: cat.bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return (
    <Text style={[{
      fontFamily: 'Inter_500Medium',
      fontSize: typography.sizes.xs,
      color: colors.neutral.gray500,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 10,
    }, style]}>{children}</Text>
  );
}
