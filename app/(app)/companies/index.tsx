import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSearch, IconChevronRight, IconPlus } from '@tabler/icons-react-native';
import { useCompanies } from '@/hooks/useCompanies';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { colors, typography, radius } from '@/theme';
import { Company } from '@/types/database';

const RISK_VARIANT: Record<number, any> = {
  1: 'success',
  2: 'info',
  3: 'warning',
  4: 'danger',
};

export default function CompaniesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch, isRefetching } = useCompanies();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(c =>
      !q ||
      c.company_name.toLowerCase().includes(q) ||
      c.cnpj?.replace(/\D/g, '').includes(q.replace(/\D/g, '')),
    );
  }, [data, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Empresas"
        subtitle={`${filtered.length} cadastradas`}
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
            placeholder="Buscar nome ou CNPJ"
            placeholderTextColor={colors.neutral.gray400}
            style={{
              flex: 1, padding: 0,
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray900,
            }}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <Card variant="flat" padding="lg">
              <Text style={{
                textAlign: 'center',
                fontFamily: 'Inter_400Regular',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray500,
              }}>Nenhuma empresa encontrada.</Text>
            </Card>
          }
          renderItem={({ item }: { item: Company }) => (
            <Card onPress={() => router.push(`/companies/${item.id}` as any)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={item.company_name} size="md" />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.lg,
                    color: colors.neutral.gray900,
                  }} numberOfLines={1}>{item.company_name}</Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.sm,
                    color: colors.neutral.gray500,
                    marginTop: 1,
                  }} numberOfLines={1}>
                    {[
                      item.cnpj || null,
                      item.employee_count ? `${item.employee_count} func.` : null,
                    ].filter(Boolean).join(' · ') || 'Sem dados adicionais'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {item.risk_grade != null && (
                    <Badge
                      label={`G${item.risk_grade}`}
                      variant={RISK_VARIANT[item.risk_grade] ?? 'neutral'}
                      size="sm"
                    />
                  )}
                  <IconChevronRight size={14} color={colors.neutral.gray400} strokeWidth={2} />
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/companies/new' as any)}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          right: 20,
          bottom: insets.bottom + 76,
          width: 52, height: 52,
          borderRadius: 26,
          backgroundColor: colors.primary[900],
          alignItems: 'center', justifyContent: 'center',
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <IconPlus size={22} color={colors.neutral.white} strokeWidth={2} />
      </TouchableOpacity>

      <BottomNav />
    </View>
  );
}
