import { TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme';

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  size?: 'sm' | 'md';
}

export function Toggle({ value, onChange, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 36 : 44;
  const h = size === 'sm' ? 20 : 24;
  const thumb = h - 4;
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      style={{
        width: w, height: h, borderRadius: h / 2,
        backgroundColor: value ? colors.primary[900] : colors.neutral.gray200,
        padding: 2, justifyContent: 'center',
      }}
    >
      <View style={{
        width: thumb, height: thumb, borderRadius: thumb / 2,
        backgroundColor: colors.neutral.white,
        alignSelf: value ? 'flex-end' : 'flex-start',
      }} />
    </TouchableOpacity>
  );
}
