import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, Alert, TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  IconFileText, IconBuilding, IconCalendar, IconCheck,
  IconFileExport, IconEdit, IconPencil, IconSignature,
} from '@tabler/icons-react-native';
import { Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SectionLabel } from '@/components/ui/CategoryIcon';
import { shareQuotePdf } from '@/lib/pdf';
import { useUpdateQuote } from '@/hooks/useUpdateQuote';
import { uploadSignature, updateQuoteSignature, getSignatureUrl } from '@/lib/signature';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { Quote, QuoteStatus } from '@/types/database';
import { colors, typography, radius } from '@/theme';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const STATUS_META: Record<string, { label: string; variant: any }> = {
  DRAFT:    { label: 'Rascunho',  variant: 'neutral' },
  SENT:     { label: 'Enviado',   variant: 'info' },
  APPROVED: { label: 'Aprovado',  variant: 'success' },
  REJECTED: { label: 'Rejeitado', variant: 'danger' },
  EXPIRED:  { label: 'Expirado',  variant: 'warning' },
};

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'DRAFT',    label: 'Rascunho' },
  { value: 'SENT',     label: 'Enviado' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'REJECTED', label: 'Rejeitado' },
  { value: 'EXPIRED',  label: 'Expirado' },
];

export default function QuoteDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<QuoteStatus>('DRAFT');
  const [editNotes, setEditNotes] = useState('');
  const [sendingPdf, setSendingPdf] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [sigLoading, setSigLoading] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const updateQuote = useUpdateQuote();

  const { data, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          companies (*),
          plan_quote_details (*),
          training_quote_details (
            *,
            training_quote_items (
              *,
              trainings (*)
            )
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Quote & { companies?: any; plan_quote_details?: any[]; training_quote_details?: any[] };
    },
    enabled: !!id,
  });

  const openEdit = () => {
    if (!data) return;
    setEditStatus(data.status);
    setEditNotes(data.notes ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!data) return;
    try {
      await updateQuote.mutateAsync({
        id: data.id,
        status: editStatus,
        notes: editNotes.trim() || null,
      });
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar.');
    }
  };

  // Load signature preview when data has signature_url
  useEffect(() => {
    if (!data?.signature_url) return;
    getSignatureUrl(data.signature_url).then(url => {
      if (url) setSignaturePreview(url);
    });
  }, [data?.signature_url]);

  const handleSignature = async (base64: string) => {
    if (!data) return;
    setSigLoading(true);
    try {
      const path = await uploadSignature(data.id, base64);
      await updateQuoteSignature(data.id, path);
      const url = await getSignatureUrl(path);
      if (url) setSignaturePreview(url);
      setShowSignature(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar assinatura.');
    } finally {
      setSigLoading(false);
    }
  };

  const handleSendPdf = async () => {
    if (!data) return;
    setSendingPdf(true);
    try {
      await shareQuotePdf(data);
    } catch (e: any) {
      Alert.alert('Erro ao gerar PDF', e?.message ?? 'Tente novamente.');
    } finally {
      setSendingPdf(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.gray50 }}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }

  const meta = STATUS_META[data.status] ?? STATUS_META.DRAFT;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title={data.quote_number}
        subtitle={data.companies?.company_name ?? 'Orçamento'}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="dark" padding="lg">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.sm,
              color: 'rgba(255,255,255,0.6)',
            }}>Total anual</Text>
            <Badge label={meta.label} variant={meta.variant} size="sm" />
          </View>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes['4xl'],
            color: colors.neutral.white,
            letterSpacing: -1,
            marginTop: 8,
          }}>{formatBRL(data.total_value)}</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.md,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 2,
          }}>ou {formatBRL(data.monthly_value)} / mês</Text>
        </Card>

        <SectionLabel style={{ marginTop: 20 }}>Detalhes</SectionLabel>
        <Card padding="none">
          <Row
            icon={<IconBuilding size={16} color={colors.primary[600]} strokeWidth={1.8} />}
            label="Empresa"
            value={data.companies?.company_name ?? '-'}
          />
          <Divider />
          <Row
            icon={<IconFileText size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Tipo"
            value={data.type === 'PLAN' ? 'Plano' : data.type === 'TRAINING' ? 'Treinamento' : 'Plano + Treinamento'}
          />
          <Divider />
          <Row
            icon={<IconCalendar size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Válido até"
            value={formatDate(data.valid_until)}
          />
          <Divider />
          <Row
            icon={<IconCheck size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
            label="Criado em"
            value={formatDate(data.created_at)}
          />
        </Card>

        {data.notes && (
          <>
            <SectionLabel style={{ marginTop: 20 }}>Observações</SectionLabel>
            <Card variant="flat">
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray700,
                lineHeight: 20,
              }}>{data.notes}</Text>
            </Card>
          </>
        )}

        {/* Signature section */}
        <SectionLabel style={{ marginTop: 20 }}>Assinatura</SectionLabel>
        {signaturePreview ? (
          <Card padding="md">
            <Image
              source={{ uri: signaturePreview }}
              style={{ width: '100%', height: 100, resizeMode: 'contain' }}
            />
            <TouchableOpacity
              onPress={() => setShowSignature(true)}
              style={{ marginTop: 8, alignItems: 'center' }}
            >
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.sm,
                color: colors.primary[600],
              }}>Assinar novamente</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <TouchableOpacity
            onPress={() => setShowSignature(true)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: colors.neutral.white,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.primary[200],
              borderStyle: 'dashed',
              paddingHorizontal: 14,
              paddingVertical: 16,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: colors.primary[50],
              alignItems: 'center', justifyContent: 'center',
            }}>
              <IconSignature size={18} color={colors.primary[600]} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray900,
              }}>Assinar orcamento</Text>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.sm,
                color: colors.neutral.gray500,
                marginTop: 1,
              }}>Capturar assinatura digital do cliente</Text>
            </View>
          </TouchableOpacity>
        )}

      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5, borderTopColor: colors.neutral.gray200,
        flexDirection: 'row', gap: 10,
      }}>
        <View style={{ flex: 1 }}>
          <Button label="Editar" variant="secondary" onPress={openEdit}
            icon={<IconEdit size={16} color={colors.neutral.gray800} strokeWidth={1.8} />} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button label={sendingPdf ? 'Gerando...' : 'Enviar PDF'}
            onPress={handleSendPdf}
            loading={sendingPdf}
            disabled={sendingPdf}
            icon={<IconFileExport size={16} color={colors.neutral.white} strokeWidth={1.8} />} />
        </View>
      </View>

      <SignaturePad
        visible={showSignature}
        onClose={() => setShowSignature(false)}
        onConfirm={handleSignature}
        loading={sigLoading}
      />

      <BottomSheet visible={editing} onClose={() => setEditing(false)} title="Editar orçamento">
        <SectionLabel>Status</SectionLabel>
        <View style={{ gap: 8 }}>
          {STATUS_OPTIONS.map(opt => {
            const active = editStatus === opt.value;
            return (
              <TouchableOpacity key={opt.value} onPress={() => setEditStatus(opt.value)} activeOpacity={0.8}>
                <Card variant={active ? 'selected' : 'default'}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: active ? colors.primary[600] : colors.neutral.gray300,
                      marginRight: 12,
                    }} />
                    <Text style={{
                      flex: 1,
                      fontFamily: 'Inter_500Medium',
                      fontSize: typography.sizes.md,
                      color: colors.neutral.gray900,
                    }}>{opt.label}</Text>
                    {active && <IconCheck size={16} color={colors.primary[600]} strokeWidth={2} />}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionLabel style={{ marginTop: 16 }}>Observações</SectionLabel>
        <TextInput
          value={editNotes}
          onChangeText={setEditNotes}
          placeholder="Notas internas (opcional)"
          placeholderTextColor={colors.neutral.gray400}
          multiline
          numberOfLines={4}
          style={{
            backgroundColor: colors.neutral.white,
            borderWidth: 0.5,
            borderColor: colors.neutral.gray200,
            borderRadius: radius.lg,
            padding: 12,
            minHeight: 90,
            textAlignVertical: 'top',
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.md,
            color: colors.neutral.gray900,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Button label="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Salvar"
              onPress={saveEdit}
              loading={updateQuote.isPending}
              disabled={updateQuote.isPending} />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 14, gap: 12,
    }}>
      {icon}
      <Text style={{
        fontFamily: 'Inter_400Regular',
        fontSize: typography.sizes.md,
        color: colors.neutral.gray500,
      }}>{label}</Text>
      <Text style={{
        flex: 1, textAlign: 'right',
        fontFamily: 'Inter_500Medium',
        fontSize: typography.sizes.md,
        color: colors.neutral.gray900,
      }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 0.5, backgroundColor: colors.neutral.gray200, marginHorizontal: 14 }} />;
}
