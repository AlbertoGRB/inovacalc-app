import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { colors, typography } from '@/theme';
import { ProgressBar } from '../ui/ProgressBar';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  steps?: number;
  currentStep?: number;
  showStepLabel?: boolean;
  safe?: boolean;
}

export function Header({
  title, subtitle, showBack = true, onBack, rightElement,
  steps, currentStep, showStepLabel = true, safe = true,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={{
      backgroundColor: colors.neutral.white,
      paddingTop: safe ? insets.top + 8 : 12,
      paddingBottom: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.neutral.gray200,
      gap: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
          >
            <IconChevronLeft size={18} color={colors.neutral.gray700} strokeWidth={2} />
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray700,
            }}>Voltar</Text>
          </TouchableOpacity>
        ) : <View />}

        {showStepLabel && steps && currentStep !== undefined ? (
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes.xs,
            color: colors.neutral.gray500,
            letterSpacing: 0.8,
          }}>
            ETAPA {currentStep} DE {steps}
          </Text>
        ) : null}

        {rightElement}
      </View>

      {title && (
        <View>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes['2xl'],
            color: colors.neutral.gray900,
            letterSpacing: -0.3,
          }} numberOfLines={1}>{title}</Text>
          {subtitle && (
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray500,
              marginTop: 2,
            }}>{subtitle}</Text>
          )}
        </View>
      )}

      {steps && currentStep !== undefined && (
        <ProgressBar steps={steps} current={currentStep} />
      )}
    </View>
  );
}
