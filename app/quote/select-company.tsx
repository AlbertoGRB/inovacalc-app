import { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSearch, IconCheck, IconArrowRight, IconBuilding } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { useCompanies } from '@/hooks/useCompanies';
import { useQuoteDraft } from '@/stores/quoteDraftStore';
import { colors, typography, radius } from '@/theme';
import { Company } from '@/types/database';

type Filter = 'todas' | 'favoritas' | 'recentes';

export default function SelectCompanyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: companies = [], isLoading } = useCompanies();
  const { company, setCompany } = useQuoteDraft();
  const [filter, setFilter] = useState<Filter>('todas');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter(c =>
      !q || c.company_name.toLowerCase().includes(q) || c.cnpj?.includes(q),
    );
  }, [companies, search, filter]);

  const handleContinue = () => {
    if (!company) return;
    router.push('/quote/what-include' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <Header
        title="Selecionar empresa"
        subtitle="Escolha a empresa para este orçamento"
        steps={6} currentStep={1}
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
            placeholder="Buscar por nome ou CNPJ"
            placeholderTextColor={colors.neutral.gray400}
            style={{
              flex: 1, padding: 0,
              fontFamily: 'Inter_400Regular',
              fontSize: typography.sizes.md,
              color: colors.neutral.gray900,
            }}
          />
        </View>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todas', label: 'Todas' },
            { value: 'favoritas', label: 'Favoritas' },
            { value: 'recentes', label: 'Recentes' },
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
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100, gap: 10 }}
          showsVerticalScrollIndicator={false}
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
          renderItem={({ item }: { item: Company }) => {
            const selected = company?.id === item.id;
            return (
              <Card
                variant={selected ? 'selected' : 'default'}
                onPress={() => setCompany(item)}
              >
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
                      {item.cnpj ?? 'Sem CNPJ'} · G{item.risk_grade ?? '-'} · {item.employee_count ?? 0} func.
                    </Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: selected ? 0 : 1,
                    borderColor: colors.neutral.gray300,
                    backgroundColor: selected ? colors.primary[600] : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <IconCheck size={14} color={colors.neutral.white} strokeWidth={3} />}
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 0.5,
        borderTopColor: colors.neutral.gray200,
      }}>
        <Button
          label="Continuar"
          disabled={!company}
          onPress={handleContinue}
          iconRight={<IconArrowRight size={16} color={colors.neutral.white} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}
