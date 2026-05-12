import { View, Text, Image } from 'react-native';
import { colors, typography } from '@/theme';

interface AvatarProps {
  name?: string;
  uri?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: { dim: 28, font: typography.sizes.xs },
  md: { dim: 36, font: typography.sizes.sm },
  lg: { dim: 48, font: typography.sizes.base },
  xl: { dim: 64, font: typography.sizes.xl },
};

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, uri, size = 'md' }: AvatarProps) {
  const s = sizes[size];
  const style = {
    width: s.dim, height: s.dim,
    borderRadius: s.dim / 2,
    backgroundColor: colors.primary[100],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };

  if (uri) {
    return <View style={style}><Image source={{ uri }} style={{ width: s.dim, height: s.dim }} /></View>;
  }

  return (
    <View style={style}>
      <Text style={{
        fontFamily: 'Inter_500Medium',
        fontSize: s.font,
        color: colors.primary[800],
      }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
