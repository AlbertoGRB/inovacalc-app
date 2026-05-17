import { useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { IconX, IconCheck, IconEraser } from '@tabler/icons-react-native';
import { colors, typography, radius } from '@/theme';

interface SignaturePadProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (base64: string) => void;
  loading?: boolean;
}

export function SignaturePad({ visible, onClose, onConfirm, loading }: SignaturePadProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    ref.current?.clearSignature();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    ref.current?.readSignature();
  };

  const handleOK = (signature: string) => {
    if (signature) {
      onConfirm(signature);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
    margin: 0;
    width: 100%;
    height: 100%;
  }
  .m-signature-pad--body {
    border: none;
    width: 100%;
    height: 100%;
  }
  .m-signature-pad--footer { display: none; }
  body, html { margin: 0; padding: 0; width: 100%; height: 100%; }`;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: colors.neutral.white,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 16,
          height: '60%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginBottom: 12,
          }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconX size={20} color={colors.neutral.gray700} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.xl,
              color: colors.neutral.gray900,
            }}>Assinatura</Text>
            <View style={{ width: 20 }} />
          </View>

          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.sm,
            color: colors.neutral.gray500,
            textAlign: 'center',
            marginBottom: 8,
          }}>Desenhe sua assinatura abaixo</Text>

          {/* Canvas */}
          <View style={{
            flex: 1,
            marginHorizontal: 20,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.neutral.gray200,
            borderStyle: 'dashed',
            overflow: 'hidden',
          }}>
            <SignatureCanvas
              ref={ref}
              onOK={handleOK}
              onBegin={handleBegin}
              webStyle={webStyle}
              backgroundColor="rgb(255,255,255)"
              penColor={colors.primary[900]}
              dotSize={1.5}
              minWidth={1.5}
              maxWidth={3}
            />
          </View>

          {/* Actions */}
          <View style={{
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}>
            <TouchableOpacity
              onPress={handleClear}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 14,
                borderRadius: radius.xl,
                borderWidth: 0.5,
                borderColor: colors.neutral.gray200,
                backgroundColor: colors.neutral.white,
              }}
            >
              <IconEraser size={16} color={colors.neutral.gray700} strokeWidth={1.8} />
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray700,
              }}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isEmpty || loading}
              style={{
                flex: 1.5,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 14,
                borderRadius: radius.xl,
                backgroundColor: isEmpty ? colors.neutral.gray300 : colors.primary[600],
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.neutral.white} size="small" />
              ) : (
                <>
                  <IconCheck size={16} color={colors.neutral.white} strokeWidth={2} />
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.md,
                    color: colors.neutral.white,
                  }}>Confirmar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
