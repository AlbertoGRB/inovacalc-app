import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  IconBell, IconFileText, IconBuilding, IconCalculator,
  IconSchool, IconChevronRight, IconPlus, IconTrendingUp,
  IconBriefcase, IconWand,
} from '@tabler/icons-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useQuotes } from '@/hooks/useQuotes';
import { useCompanies } from '@/hooks/useCompanies';
import { BottomNav } from '@/components/layout/BottomNav';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { CategoryIcon, SectionLabel } from '@/components/ui/CategoryIcon';
import { colors, typography, radius } from '@/theme';
import { useQuoteDraft } from '@/stores/quoteDraftStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useOutbox } from '@/stores/outboxStore';
import { flushOutbox } from '@/lib/sync';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [showSheet, setShowSheet] = useState(false);
  const { data: quotes = [] } = useQuotes();
  const { data: companies = [] } = useCompanies();
  const resetDraft = useQuoteDraft(s => s.reset);
  const unreadCount = useNotificationsStore(s => s.items.filter(n => !n.read).length);
  const pendingOps = useOutbox(s => s.ops.length);
  const [syncing, setSyncing] = useState(false);

  async function handleSyncNow() {
    if (syncing) return;
    setSyncing(true);
    try {
      await flushOutbox();
    } finally {
      setSyncing(false);
    }
  }

  const totalMonth = quotes
    .filter(q => new Date(q.created_at).getMonth() === new Date().getMonth())
    .reduce((acc, q) => acc + (q.total_value ?? 0), 0);

  const handleNew = (path: string) => {
    setShowSheet(false);
    resetDraft();
    router.push(path as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      {/* Header branco */}
      <View style={{
        backgroundColor: colors.neutral.white,
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.neutral.gray200,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push('/profile')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Avatar name={profile?.name ?? 'U'} uri={profile?.avatar_url ?? undefined} size="md" />
          <View>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.sm,
              color: colors.neutral.gray500,
            }}>Bem-vindo</Text>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.lg,
              color: colors.neutral.gray900,
            }}>{profile?.name?.split(' ').slice(0, 2).join(' ') ?? 'Usuário'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/notifications' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 40, height: 40,
            borderRadius: radius.md,
            borderWidth: 0.5, borderColor: colors.neutral.gray200,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconBell size={18} color={colors.neutral.gray700} strokeWidth={1.8} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute', top: 8, right: 9,
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: '#E24B4A',
              borderWidth: 1.5, borderColor: colors.neutral.white,
            }} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <Card variant="default" padding="md" style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <IconFileText size={14} color={colors.primary[600]} strokeWidth={1.8} />
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.sm,
                color: colors.neutral.gray600,
              }}>Orçamentos</Text>
            </View>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes['3xl'],
              color: colors.neutral.gray900,
            }}>{quotes.length}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <IconTrendingUp size={12} color={colors.success[600]} strokeWidth={2} />
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.xs,
                color: colors.success[600],
              }}>Este mês</Text>
            </View>
          </Card>

          <Card variant="default" padding="md" style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <IconBriefcase size={14} color="#3B6D11" strokeWidth={1.8} />
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.sm,
                color: colors.neutral.gray600,
              }}>Faturamento</Text>
            </View>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes['3xl'],
              color: colors.neutral.gray900,
            }}>{formatBRL(totalMonth)}</Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.xs,
              color: colors.neutral.gray500,
              marginTop: 4,
            }}>Este mês</Text>
          </Card>
        </View>

        {/* CTA principal */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowSheet(true)}
          style={{
            backgroundColor: colors.primary[900],
            borderRadius: radius.lg,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: typography.sizes.xl,
              color: colors.neutral.white,
            }}>Novo orçamento</Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 2,
            }}>Crie em menos de 2 minutos</Text>
          </View>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <IconPlus size={18} color={colors.neutral.white} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {pendingOps > 0 && (
          <TouchableOpacity
            onPress={handleSyncNow}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FEF3C7',
              borderColor: '#F59E0B',
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 16,
              gap: 10,
            }}
          >
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: '#F59E0B',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{pendingOps}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E' }}>
                {pendingOps === 1 ? '1 alteração pendente' : `${pendingOps} alterações pendentes`}
              </Text>
              <Text style={{ fontSize: 11, color: '#92400E', opacity: 0.8 }}>
                {syncing ? 'Sincronizando...' : 'Toque para sincronizar agora'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <SectionLabel>Acesso rápido</SectionLabel>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Empresas',     hint: `${companies.length} reg.`, cat: 'company',  icon: IconBuilding,   onPress: () => router.push('/companies') },
            { label: 'Orçamentos',hint: `${quotes.length} reg.`,cat: 'quote',    icon: IconFileText,   onPress: () => router.push('/quotes') },
            { label: 'Calc. Planos', hint: 'Mensalidades',         cat: 'plan',     icon: IconCalculator, onPress: () => router.push('/calculator/plans') },
            { label: 'Treinamentos', hint: 'NRs / cursos',         cat: 'training', icon: IconSchool,     onPress: () => router.push('/calculator/trainings') },
          ].map(q => (
            <Card
              key={q.label}
              onPress={q.onPress}
              padding="md"
              style={{ width: '47.5%' as any }}
            >
              <CategoryIcon
                category={q.cat as any}
                icon={<q.icon size={18} color={colors.categories[q.cat as keyof typeof colors.categories].icon} strokeWidth={1.8} />}
              />
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray900,
                marginTop: 10,
              }}>{q.label}</Text>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.sm,
                color: colors.neutral.gray500,
                marginTop: 2,
              }}>{q.hint}</Text>
            </Card>
          ))}
        </View>

        <SectionLabel>Atividade recente</SectionLabel>
        {quotes.length === 0 ? (
          <Card variant="flat" padding="lg">
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray500,
              textAlign: 'center',
            }}>Nenhum orçamento ainda. Crie o primeiro!</Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {quotes.slice(0, 3).map(q => (
              <Card key={q.id} onPress={() => router.push(`/quotes/${q.id}` as any)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: q.status === 'APPROVED'
                      ? colors.success[600]
                      : q.status === 'SENT'
                      ? colors.info[600]
                      : colors.warning[600],
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: typography.sizes.md,
                      color: colors.neutral.gray900,
                    }} numberOfLines={1}>
                      {q.companies?.company_name ?? 'Sem empresa'}
                    </Text>
                    <Text style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: typography.sizes.sm,
                      color: colors.neutral.gray500,
                      marginTop: 1,
                    }}>{q.quote_number} · {formatBRL(q.total_value ?? 0)}</Text>
                  </View>
                  <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav />

      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title="Novo orçamento"
        subtitle="Como deseja prosseguir?"
      >
        <View style={{ gap: 10 }}>
          <Card variant="selected" onPress={() => handleNew('/quote/select-company')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <CategoryIcon
                category="company"
                icon={<IconBuilding size={20} color={colors.primary[600]} strokeWidth={1.8} />}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: typography.sizes.lg,
                  color: colors.neutral.gray900,
                }}>Empresa cadastrada</Text>
                <Text style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: typography.sizes.sm,
                  color: colors.neutral.gray500,
                }}>Selecione uma empresa existente</Text>
              </View>
              <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
            </View>
          </Card>

          <Card onPress={() => handleNew('/companies/new')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <CategoryIcon
                category="plan"
                icon={<IconPlus size={20} color="#3B6D11" strokeWidth={1.8} />}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: typography.sizes.lg,
                  color: colors.neutral.gray900,
                }}>Cadastrar nova</Text>
                <Text style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: typography.sizes.sm,
                  color: colors.neutral.gray500,
                }}>Cadastre e já gere o orçamento</Text>
              </View>
              <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
            </View>
          </Card>

          <Card onPress={() => handleNew('/quote/what-include')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <CategoryIcon
                category="service"
                icon={<IconWand size={20} color={colors.warning[600]} strokeWidth={1.8} />}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: typography.sizes.lg,
                  color: colors.neutral.gray900,
                }}>Orçamento rápido</Text>
                <Text style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: typography.sizes.sm,
                  color: colors.neutral.gray500,
                }}>Sem empresa associada</Text>
              </View>
              <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
            </View>
          </Card>
        </View>
      </BottomSheet>
    </View>
  );
}
