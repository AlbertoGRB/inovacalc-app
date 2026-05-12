import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useTrainings, useTrainingDiscounts } from '@/hooks/useSettings';
import { calculateTrainings } from '@/lib/calculations';
import { DEFAULT_TRAINING_DISCOUNTS, CLIENT_TYPE_OPTIONS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { Training, ClientType } from '@/types/database';
import { colors, typography, radius } from '@/theme';

export default function TrainingsCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: trainings, isLoading } = useTrainings(true);
  const { data: discounts } = useTrainingDiscounts();

  const [clientType, setClientType] = useState<ClientType>('NONE');
  const [additionalDiscount, setAdditionalDiscount] = useState('0');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!trainings) return [];
    if (!search.trim()) return trainings;
    const q = search.toLowerCase();
    return trainings.filter(
      t => t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [trainings, search]);

  const selectedItems = useMemo(() => {
    if (!trainings) return [];
    return trainings
      .filter(t => (quantities[t.id] ?? 0) > 0)
      .map(t => ({
        trainingId: t.id,
        quantity: quantities[t.id]!,
        totalValue: quantities[t.id]! * t.value,
      }));
  }, [trainings, quantities]);

  const result = useMemo(() => {
    if (selectedItems.length === 0) return null;
    const activeDiscounts = discounts ?? DEFAULT_TRAINING_DISCOUNTS;
    return calculateTrainings(
      {
        clientType,
        additionalDiscount: parseFloat(additionalDiscount) || 0,
        items: selectedItems,
      },
      activeDiscounts,
    );
  }, [selectedItems, clientType, additionalDiscount, discounts]);

  function setQty(id: string, delta: number) {
    setQuantities(prev => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  }

  const totalSelected = Object.values(quantities).reduce((s, v) => s + v, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary[900],
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconChevronLeft size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)' }}>Voltar</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.xl, color: colors.neutral.white, flex: 1 }}>
          Calc. Treinamentos
        </Text>
        {totalSelected > 0 && (
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderRadius: radius.full,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.xs, color: colors.neutral.white }}>
              {totalSelected} itens
            </Text>
          </View>
        )}
      </View>

      {/* Tipo de cliente */}
      <View className="bg-white border-b border-slate-100 px-5 py-3">
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tipo de Cliente (Desconto de Plano)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CLIENT_TYPE_OPTIONS.map(opt => {
            const isActive = clientType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setClientType(opt.value as ClientType)}
                className={`rounded-xl px-4 py-2 ${
                  isActive ? 'bg-brand-600' : 'bg-slate-100'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-600'}`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Desconto adicional + busca */}
      <View className="bg-white border-b border-slate-100 px-5 py-3" style={{ gap: 10 }}>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text className="mb-1 text-xs font-medium text-slate-600">Desconto adicional (%)</Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={additionalDiscount}
              onChangeText={setAdditionalDiscount}
            />
          </View>
          <TouchableOpacity
            onPress={() => setQuantities({})}
            className="mt-4 rounded-xl border border-slate-200 px-4 py-2"
          >
            <Text className="text-sm text-slate-500">Limpar</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
          placeholder="Buscar treinamento..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {/* Lista de treinamentos */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0891b2" />
          <Text className="mt-3 text-sm text-slate-500">Carregando treinamentos...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: result ? 200 : 32 }}
          renderItem={({ item }) => (
            <TrainingRow
              training={item}
              quantity={quantities[item.id] ?? 0}
              onIncrease={() => setQty(item.id, 1)}
              onDecrease={() => setQty(item.id, -1)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-sm text-slate-500">Nenhum treinamento encontrado.</Text>
            </View>
          }
        />
      )}

      {/* Painel de resultado (fixo na base) */}
      {result && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 pt-4 pb-6 shadow-lg">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-slate-500">Subtotal</Text>
            <Text className="text-sm text-slate-700">{formatCurrency(result.subtotal)}</Text>
          </View>
          {result.planDiscount > 0 && (
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-slate-500">Desc. Plano ({result.planDiscount}%)</Text>
              <Text className="text-sm text-green-600">-{formatCurrency(result.planDiscountValue)}</Text>
            </View>
          )}
          {result.additionalDiscountValue > 0 && (
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-slate-500">Desc. Adicional</Text>
              <Text className="text-sm text-green-600">-{formatCurrency(result.additionalDiscountValue)}</Text>
            </View>
          )}
          <View className="my-2 h-px bg-slate-100" />
          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-xs text-slate-400">Total anual</Text>
              <Text className="text-xl font-bold text-slate-900">{formatCurrency(result.finalValue)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-slate-400">Mensalidade</Text>
              <Text className="text-base font-semibold text-brand-600">{formatCurrency(result.monthlyValue)}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function TrainingRow({
  training,
  quantity,
  onIncrease,
  onDecrease,
}: {
  training: Training;
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const isSelected = quantity > 0;
  return (
    <View
      className={`flex-row items-center px-5 py-3 border-b border-slate-100 ${
        isSelected ? 'bg-brand-50' : 'bg-white'
      }`}
    >
      <View className="flex-1 pr-3">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text className="text-xs font-bold text-brand-600">{training.code}</Text>
          {training.is_combo && (
            <View className="rounded bg-amber-100 px-1.5 py-0.5">
              <Text className="text-xs font-medium text-amber-700">Combo</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-slate-800 mt-0.5" numberOfLines={2}>
          {training.description}
        </Text>
        <Text className="text-xs text-brand-600 mt-0.5 font-medium">
          {formatCurrency(training.value)}
          {quantity > 0 && (
            <Text className="text-slate-500"> × {quantity} = {formatCurrency(training.value * quantity)}</Text>
          )}
        </Text>
      </View>

      <View className="flex-row items-center" style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={onDecrease}
          disabled={quantity === 0}
          className={`h-8 w-8 rounded-full items-center justify-center ${
            quantity === 0 ? 'bg-slate-100' : 'bg-slate-200'
          }`}
        >
          <Text className={`text-lg font-bold leading-none ${quantity === 0 ? 'text-slate-300' : 'text-slate-700'}`}>
            −
          </Text>
        </TouchableOpacity>

        <Text className="w-5 text-center text-sm font-semibold text-slate-900">
          {quantity}
        </Text>

        <TouchableOpacity
          onPress={onIncrease}
          className="h-8 w-8 rounded-full bg-brand-600 items-center justify-center"
        >
          <Text className="text-lg font-bold leading-none text-white">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
