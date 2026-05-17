import { useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Linking, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconMail, IconPhone, IconMapPin, IconUserCircle, IconFileText, IconCheck,
  IconPencil, IconChevronRight, IconHeart, IconHeartFilled, IconTrash,
} from '@tabler/icons-react-native';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { deleteClickUpCompany } from '@/lib/clickup';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { CategoryIcon, SectionLabel } from '@/components/ui/CategoryIcon';
import { useQuotes } from '@/hooks/useQuotes';
import { QUOTE_STATUS_CONFIG } from '@/lib/constants';
import { Company, QuoteStatus } from '@/types/database';
import { colors, typography, radius } from '@/theme';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

function maskCNPJDisplay(v: string) {
  const d = v.replace(/\D/g, '');
  if (d.length !== 14) return v;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function maskCPFDisplay(v: string) {
  const d = v.replace(/\D/g, '');
  if (d.length !== 11) return v;
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

type Tab = 'info' | 'quotes';

export default function CompanyDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('info');

  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'ADMIN';
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const [deleting, setDeleting] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });

  const { data: allQuotes = [] } = useQuotes();
  const companyQuotes = useMemo(
    () => allQuotes.filter(q => q.company_id === id),
    [allQuotes, id],
  );

  const stats = useMemo(() => {
    const approved = companyQuotes.filter(q => q.status === 'APPROVED');
    const volume = approved.reduce((acc, q) => acc + (q.total_value ?? 0), 0);
    return { total: companyQuotes.length, approved: approved.length, volume };
  }, [companyQuotes]);

  const handleDeleteCompany = () => {
    Alert.alert(
      'Excluir empresa',
      `Tem certeza que deseja excluir "${company?.company_name}"?\n\nTodos os orçamentos vinculados também serão excluídos. Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!company) return;
            setDeleting(true);
            try {
              // Delete ClickUp task (fire-and-forget)
              if (company.clickup_task_id) {
                deleteClickUpCompany(company.clickup_task_id).catch(() => {});
              }
              // Delete related quotes first
              await supabase.from('quotes').delete().eq('company_id', company.id);
              // Delete favorites
              await supabase.from('company_favorites').delete().eq('company_id', company.id);
              // Delete the company
              const { error } = await supabase.from('companies').delete().eq('id', company.id);
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ['companies'] });
              queryClient.invalidateQueries({ queryKey: ['quotes'] });
              router.replace('/companies' as any);
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir a empresa. Tente novamente.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading || !company) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.gray50 }}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title={company.company_name}
        subtitle={company.cnpj ? maskCNPJDisplay(company.cnpj) : company.cpf ? `CPF: ${maskCPFDisplay(company.cpf)}` : 'Sem documento informado'}
        onBack={() => router.back()}
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => toggleFavorite.mutate(company.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 32, height: 32, borderRadius: radius.md,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {favorites.includes(company.id) ? (
                <IconHeartFilled size={16} color="#F87171" />
              ) : (
                <IconHeart size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/companies/new?editId=${company.id}` as any)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: radius.md,
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <IconPencil size={14} color="#fff" strokeWidth={2} />
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.sm,
                color: '#fff',
              }}>Editar</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + info */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Avatar name={company.company_name} size="lg" />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {company.risk_grade != null && (
              <Badge label={`G${company.risk_grade}`} variant="info" size="sm" />
            )}
            {company.employee_count != null && company.employee_count > 0 && (
              <Badge label={`${company.employee_count} func.`} variant="neutral" size="sm" />
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <Stat label="Orçamentos" value={String(stats.total)} />
          <Stat label="Aprovados" value={String(stats.approved)} color={colors.success[600]} />
          <Stat label="Volume" value={formatBRL(stats.volume)} small />
        </View>

        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'info',   label: 'Informações' },
            { value: 'quotes', label: `Orçamentos (${stats.total})` },
          ]}
        />

        <View style={{ marginTop: 16 }}>
          {tab === 'info' && (
            <>
            <Card padding="none">
              {company.cnpj && (
                <>
                  <Row
                    icon={<IconFileText size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
                    label="CNPJ"
                    value={maskCNPJDisplay(company.cnpj)}
                  />
                  <Divider />
                </>
              )}
              {!company.cnpj && company.cpf && (
                <>
                  <Row
                    icon={<IconFileText size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
                    label="CPF"
                    value={maskCPFDisplay(company.cpf)}
                  />
                  <Divider />
                </>
              )}
              {company.contact_name && (
                <>
                  <Row
                    icon={<IconUserCircle size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
                    label="Contato"
                    value={`${company.contact_name}${company.contact_role ? ` · ${company.contact_role}` : ''}`}
                  />
                  <Divider />
                </>
              )}
              {company.email && (
                <>
                  <Row
                    icon={<IconMail size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
                    label="Email"
                    value={company.email}
                    onPress={() => Linking.openURL(`mailto:${company.email}`)}
                  />
                  <Divider />
                </>
              )}
              {company.phone && (
                <>
                  <Row
                    icon={<IconPhone size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
                    label="Telefone"
                    value={company.phone}
                    onPress={() => Linking.openURL(`tel:${company.phone}`)}
                  />
                  <Divider />
                </>
              )}
              {(company.address || company.city) && (
                <Row
                  icon={<IconMapPin size={16} color={colors.neutral.gray600} strokeWidth={1.8} />}
                  label="Endereço"
                  value={`${company.address ?? ''}${company.city ? ` · ${company.city}/${company.state ?? ''}` : ''}`.trim()}
                />
              )}
              {!company.cnpj && !company.cpf && !company.contact_name && !company.email && !company.phone && !company.address && !company.city && (
                <View style={{ padding: 16 }}>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.md,
                    color: colors.neutral.gray500,
                    textAlign: 'center',
                  }}>
                    Sem dados adicionais cadastrados.
                  </Text>
                </View>
              )}
            </Card>

            <TouchableOpacity
              onPress={() => router.push(`/companies/new?editId=${company.id}` as any)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.neutral.white,
                borderRadius: radius.lg,
                borderWidth: 0.5,
                borderColor: colors.neutral.gray200,
                paddingHorizontal: 14, paddingVertical: 13,
                marginTop: 12,
              }}
            >
              <View style={{
                width: 32, height: 32, borderRadius: 8,
                backgroundColor: colors.primary[50],
                alignItems: 'center', justifyContent: 'center',
              }}>
                <IconPencil size={16} color={colors.primary[600]} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: typography.sizes.md,
                  color: colors.neutral.gray900,
                }}>Editar dados da empresa</Text>
                <Text style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: typography.sizes.sm,
                  color: colors.neutral.gray500,
                  marginTop: 1,
                }}>Alterar informações, contato e endereço</Text>
              </View>
              <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                onPress={handleDeleteCompany}
                disabled={deleting}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: colors.danger[50],
                  borderRadius: radius.lg,
                  borderWidth: 0.5,
                  borderColor: colors.danger[600] + '33',
                  paddingHorizontal: 14, paddingVertical: 13,
                  marginTop: 12,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: colors.danger[600],
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {deleting ? (
                    <ActivityIndicator size="small" color={colors.neutral.white} />
                  ) : (
                    <IconTrash size={16} color={colors.neutral.white} strokeWidth={1.8} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.md,
                    color: colors.danger[800],
                  }}>Excluir empresa</Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.sm,
                    color: colors.danger[600],
                    marginTop: 1,
                  }}>Remove a empresa e todos os orçamentos</Text>
                </View>
              </TouchableOpacity>
            )}
            </>
          )}

          {tab === 'quotes' && (
            <View style={{ gap: 10 }}>
              {companyQuotes.length === 0 ? (
                <Card variant="flat" padding="lg">
                  <Text style={{
                    textAlign: 'center',
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.md,
                    color: colors.neutral.gray500,
                  }}>Sem orçamentos ainda.</Text>
                </Card>
              ) : (
                companyQuotes.map(q => {
                  const sc = QUOTE_STATUS_CONFIG[q.status as QuoteStatus] ?? QUOTE_STATUS_CONFIG.DRAFT;
                  return (
                    <Card key={q.id} onPress={() => router.push(`/quotes/${q.id}` as any)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{
                              fontFamily: 'Inter_500Medium',
                              fontSize: typography.sizes.md,
                              color: colors.neutral.gray900,
                            }}>{q.quote_number}</Text>
                            <View style={{
                              backgroundColor: sc.bg,
                              borderRadius: radius.sm,
                              paddingVertical: 2,
                              paddingHorizontal: 6,
                            }}>
                              <Text style={{
                                fontFamily: 'Inter_500Medium',
                                fontSize: typography.sizes.xs,
                                color: sc.text,
                                letterSpacing: 0.3,
                              }}>{sc.label.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: typography.sizes.sm,
                            color: colors.neutral.gray500,
                            marginTop: 1,
                          }}>{formatDate(q.created_at)}</Text>
                        </View>
                        <Text style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: typography.sizes.md,
                          color: colors.neutral.gray900,
                        }}>{formatBRL(q.total_value ?? 0)}</Text>
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color = colors.neutral.gray900, small = false }: {
  label: string; value: string; color?: string; small?: boolean;
}) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.neutral.white,
      borderRadius: radius.lg,
      borderWidth: 0.5,
      borderColor: colors.neutral.gray200,
      paddingVertical: 12, paddingHorizontal: 12,
    }}>
      <Text style={{
        fontFamily: 'Inter_400Regular',
        fontSize: typography.sizes.xs,
        color: colors.neutral.gray500,
        letterSpacing: 0.4,
      }}>{label.toUpperCase()}</Text>
      <Text style={{
        marginTop: 4,
        fontFamily: 'Inter_500Medium',
        fontSize: small ? typography.sizes.lg : typography.sizes['2xl'],
        color,
        letterSpacing: -0.3,
      }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Row({ icon, label, value, onPress }: {
  icon: React.ReactNode; label: string; value: string; onPress?: () => void;
}) {
  const content = (
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
        color: onPress ? colors.primary[600] : colors.neutral.gray900,
      }} numberOfLines={1}>{value}</Text>
    </View>
  );
  if (onPress) {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

function Divider() {
  return <View style={{ height: 0.5, backgroundColor: colors.neutral.gray200, marginHorizontal: 14 }} />;
}
