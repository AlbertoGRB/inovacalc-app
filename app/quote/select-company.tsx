import { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSearch, IconCheck, IconArrowRight, IconBuilding, IconHeart, IconHeartFilled } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { useCompanies } from '@/hooks/useCompanies';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { useQuoteDraft } from '@/stores/quoteDraftStore';
import { colors, typography, radius } from '@/theme';
import { Company } from '@/types/database';

type Filter = 'todas' | 'favoritas' | 'recentes';

export default function SelectCompanyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: companies = [], isLoading } = useCompanies();
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { company, setCompany } = useQuoteDraft();
  const [filter, setFilter] = useState<Filter>('todas');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = companies;

    // Apply tab filter
    if (filter === 'favoritas') {
      list = list.filter(c => favorites.includes(c.id));
    } else if (filter === 'recentes') {
      list = [...list].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ).slice(0, 10);
    }

    // Apply search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.company_name.toLowerCase().includes(q) || c.cnpj?.includes(q) || c.cpf?.includes(q),
      );
    }
    return list;
  }, [companies, search, filter, favorites]);

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

      {/* Botão cadastrar nova empresa */}
      <TouchableOpacity
        onPress={() => router.push('/companies/new?redirectTo=quote' as any)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          marginHorizontal: 20, marginBottom: 12,
          backgroundColor: colors.primary[50],
          borderRadius: radius.lg,
          borderWidth: 0.5,
          borderColor: colors.primary[200],
          paddingHorizontal: 14, paddingVertical: 12,
        }}
      >
        <View style={{
          width: 32, height: 32, borderRadius: 8,
          backgroundColor: colors.primary[600],
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: colors.neutral.white, fontSize: 18, fontFamily: 'Inter_500Medium' }}>+</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: 'Inter_500Medium',
            fontSize: typography.sizes.md,
            color: colors.primary[900],
          }}>Cadastrar nova empresa</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.sm,
            color: colors.primary[600],
            marginTop: 1,
          }}>Criar e continuar com o orçamento</Text>
        </View>
      </TouchableOpacity>

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
            const isFav = favorites.includes(item.id);
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
                      {item.cnpj || item.cpf || 'Sem documento'} · G{item.risk_grade ?? '-'} · {item.employee_count ?? 0} func.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleFavorite.mutate(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginRight: 4 }}
                  >
                    {isFav ? (
                      <IconHeartFilled size={16} color={colors.danger[600]} />
                    ) : (
                      <IconHeart size={16} color={colors.neutral.gray400} strokeWidth={1.8} />
                    )}
                  </TouchableOpacity>
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
