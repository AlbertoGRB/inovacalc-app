import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  IconSearch, IconChevronRight, IconShare, IconCopy, IconEdit, IconEye,
} from '@tabler/icons-react-native';
import { useQuotes } from '@/hooks/useQuotes';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/layout/Header';
import { Segmented } from '@/components/ui/Segmented';
import { colors, typography, radius } from '@/theme';
import { Quote } from '@/types/database';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

type Tab = 'todos' | 'rascunho' | 'enviado' | 'aprovado';

const TAB_TO_STATUS: Record<Tab, string | undefined> = {
  todos: undefined,
  rascunho: 'DRAFT',
  enviado: 'SENT',
  aprovado: 'APPROVED',
};

const STATUS_META: Record<string, { label: string; variant: any; color: string }> = {
  DRAFT:    { label: 'Rascunho', variant: 'neutral',  color: colors.neutral.gray500 },
  SENT:     { label: 'Enviado',  variant: 'info',     color: colors.info[600] },
  APPROVED: { label: 'Aprovado', variant: 'success',  color: colors.success[600] },
  REJECTED: { label: 'Rejeitado',variant: 'danger',   color: colors.danger[600] },
  EXPIRED:  { label: 'Expirado', variant: 'warning',  color: colors.warning[600] },
};

export default function QuotesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('todos');
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch, isRefetching } = useQuotes(TAB_TO_STATUS[tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(quote =>
      !q ||
      quote.companies?.company_name.toLowerCase().includes(q) ||
      quote.quote_number.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Orçamentos"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'item' : 'itens'}`}
        onBack={() => router.back()}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: colors.neutral.white,
          borderRadius: radius.lg,
          borderWidth: 0.5, borderColor: colors.neutral.gray200,
          paddingHorizontal: 12, paddingVertical: 10,
        }}>
          <IconSearch size={16} color={colors.neutral.gray500} strokeWidth={1.8} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar empresa ou número"
            placeholderTextColor={colors.neutral.gray400}
            style={{
              flex: 1, padding: 0,
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray900,
            }}
          />
        </View>

        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'todos',     label: 'Todos' },
            { value: 'rascunho',  label: 'Rascunho' },
            { value: 'enviado',   label: 'Enviado' },
            { value: 'aprovado',  label: 'Aprovado' },
          ]}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(q) => q.id}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <Card variant="flat" padding="lg">
              <Text style={{
                textAlign: 'center',
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray500,
              }}>Nenhum orçamento por aqui ainda.</Text>
            </Card>
          }
          renderItem={({ item }: { item: Quote }) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.DRAFT;
            return (
              <Card
                onPress={() => router.push(`/quotes/${item.id}` as any)}
                padding="none"
                style={{ overflow: 'hidden' }}
              >
                <View style={{
                  flexDirection: 'row',
                  borderLeftWidth: 3,
                  borderLeftColor: meta.color,
                }}>
                  <View style={{ flex: 1, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: typography.sizes.lg,
                        color: colors.neutral.gray900,
                        flex: 1,
                      }} numberOfLines={1}>
                        {item.companies?.company_name ?? 'Sem empresa'}
                      </Text>
                      <Badge label={meta.label} variant={meta.variant} size="sm" />
                    </View>
                    <Text style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: typography.sizes.sm,
                      color: colors.neutral.gray500,
                      marginTop: 2,
                    }}>
                      {item.quote_number} · {formatDate(item.created_at)}
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 8,
                    }}>
                      <Text style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: typography.sizes.xl,
                        color: colors.neutral.gray900,
                        letterSpacing: -0.3,
                      }}>{formatBRL(item.total_value ?? 0)}</Text>
                      <IconChevronRight size={16} color={colors.neutral.gray400} strokeWidth={2} />
                    </View>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      <BottomNav />
    </View>
  );
}
