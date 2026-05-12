import { View } from 'react-native';
import { colors } from '@/theme';

interface ProgressBarProps {
  steps: number;
  current: number;
}

export function ProgressBar({ steps, current }: ProgressBarProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: steps }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i < current ? colors.primary[900] : colors.neutral.gray200,
          }}
        />
      ))}
    </View>
  );
}
