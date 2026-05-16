import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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

  if (scroll) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: bg }}
          contentContainerStyle={{ paddingHorizontal: padH, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: bg,
      paddingHorizontal: padH,
      paddingBottom: insets.bottom + 16,
    }}>
      {children}
    </View>
  );
}
