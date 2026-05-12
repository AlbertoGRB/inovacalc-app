import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '@/theme';

interface CounterProps {
  value: number;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  onChange: (v: number) => void;
}

const sizes = {
  sm: { btn: 24, font: 13, gap: 6, inputW: 36 },
  md: { btn: 30, font: 15, gap: 8, inputW: 44 },
  lg: { btn: 36, font: 17, gap: 10, inputW: 52 },
};

export function Counter({ value, min = 0, max = 999, size = 'md', onChange }: CounterProps) {
  const s = sizes[size];
  const atMin = value <= min;
  const atMax = value >= max;

  // Texto local enquanto o usuário digita (permite ficar vazio temporariamente)
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      onChange(min);
      setText(String(min));
      return;
    }
    const n = Math.max(min, Math.min(max, parseInt(digits, 10)));
    onChange(n);
    setText(String(n));
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.gap }}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        activeOpacity={0.7}
        style={{
          width: s.btn, height: s.btn, borderRadius: s.btn / 2,
          backgroundColor: atMin ? colors.neutral.gray100 : colors.neutral.gray100,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{
          fontSize: s.font + 4, lineHeight: s.font + 6,
          color: atMin ? colors.neutral.gray400 : colors.neutral.gray700,
        }}>−</Text>
      </TouchableOpacity>

      <TextInput
        value={text}
        onChangeText={(t) => setText(t.replace(/\D/g, ''))}
        onBlur={() => commit(text)}
        onSubmitEditing={() => commit(text)}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        style={{
          fontFamily: 'Inter_500Medium',
          fontSize: s.font,
          color: colors.neutral.gray900,
          width: s.inputW,
          height: s.btn,
          paddingVertical: 0,
          paddingHorizontal: 4,
          textAlign: 'center',
          backgroundColor: colors.neutral.white,
          borderWidth: 1,
          borderColor: colors.neutral.gray200,
          borderRadius: 8,
        }}
      />

      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={atMax}
        activeOpacity={0.85}
        style={{
          width: s.btn, height: s.btn, borderRadius: s.btn / 2,
          backgroundColor: atMax ? colors.neutral.gray200 : colors.primary[900],
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{
          fontSize: s.font + 4, lineHeight: s.font + 6,
          color: atMax ? colors.neutral.gray400 : colors.neutral.white,
        }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
