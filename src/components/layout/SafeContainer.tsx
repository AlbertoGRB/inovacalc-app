import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface SafeContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  bg?: string;
  padH?: number;
}

export function SafeContainer({ children, scroll = false, bg = colors.neutral.gray50, padH = 20 }: SafeContainerProps) {
  const insets = useSafeAreaInsets();

  const style = {
    flex: 1,
    backgroundColor: bg,
    paddingBottom: insets.bottom + 16,
  };

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={{ paddingHorizontal: padH, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[style, { paddingHorizontal: padH }]}>
      {children}
    </View>
  );
}
