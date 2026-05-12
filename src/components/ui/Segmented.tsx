import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, radius } from '@/theme';

interface Option<T> { value: T; label: string; }
interface SegmentedProps<T> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
}

export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
            style={{
              paddingHorizontal: 14, paddingVertical: 7,
              borderRadius: radius.full,
              backgroundColor: active ? colors.primary[900] : colors.neutral.white,
              borderWidth: 0.5,
              borderColor: active ? colors.primary[900] : colors.neutral.gray200,
            }}
          >
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.sm,
              color: active ? colors.neutral.white : colors.neutral.gray600,
            }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
