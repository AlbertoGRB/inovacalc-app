import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconX } from '@tabler/icons-react-native';
import { colors, typography, radius } from '@/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, subtitle, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{
            backgroundColor: colors.neutral.white,
            borderTopLeftRadius: radius['3xl'],
            borderTopRightRadius: radius['3xl'],
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}>
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: colors.neutral.gray200,
              alignSelf: 'center', marginBottom: 20,
            }} />
            {(title || subtitle) && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  {title && <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.xl, color: colors.neutral.gray900 }}>{title}</Text>}
                  {subtitle && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: typography.sizes.md, color: colors.neutral.gray500, marginTop: 2 }}>{subtitle}</Text>}
                </View>
                <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutral.gray100, alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color={colors.neutral.gray600} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
