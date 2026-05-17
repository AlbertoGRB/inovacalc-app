import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  IconSearch, IconChevronRight, IconCalendar, IconX,
  IconChevronLeft,
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

const formatShortDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

type Tab = 'todos' | 'rascunho' | 'enviado' | 'aprovado';
type DateFilter = 'todos' | 'hoje' | '7dias' | '30dias' | '90dias' | 'custom';

const TAB_TO_STATUS: Record<Tab, string | undefined> = {
  todos: undefined,
  rascunho: 'DRAFT',
  enviado: 'SENT',
  aprovado: 'APPROVED',
};

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'todos',  label: 'Todas' },
  { value: 'hoje',   label: 'Hoje' },
  { value: '7dias',  label: '7 dias' },
  { value: '30dias', label: '30 dias' },
  { value: '90dias', label: '90 dias' },
  { value: 'custom', label: 'Personalizado' },
];

function getDateThreshold(filter: DateFilter): Date | null {
  if (filter === 'todos' || filter === 'custom') return null;
  const now = new Date();
  const days = filter === 'hoje' ? 0 : filter === '7dias' ? 7 : filter === '30dias' ? 30 : 90;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
}

const STATUS_META: Record<string, { label: string; variant: any; color: string }> = {
  DRAFT:    { label: 'Rascunho', variant: 'neutral',  color: colors.neutral.gray500 },
  SENT:     { label: 'Enviado',  variant: 'info',     color: colors.info[600] },
  APPROVED: { label: 'Aprovado', variant: 'success',  color: colors.success[600] },
  REJECTED: { label: 'Rejeitado',variant: 'danger',   color: colors.danger[600] },
  EXPIRED:  { label: 'Expirado', variant: 'warning',  color: colors.warning[600] },
};

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(d: Date, start: Date, end: Date) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t >= s && t <= e;
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
  return days;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuotesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('todos');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('todos');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const { data, isLoading, refetch, isRefetching } = useQuotes(TAB_TO_STATUS[tab]);

  const isDateActive = dateFilter !== 'todos';
  const hasCustomRange = dateFilter === 'custom' && customStart && customEnd;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const threshold = getDateThreshold(dateFilter);
    return (data ?? []).filter(quote => {
      if (q && !(
        quote.companies?.company_name.toLowerCase().includes(q) ||
        quote.quote_number.toLowerCase().includes(q)
      )) return false;
      if (threshold) {
        const created = new Date(quote.created_at);
        if (created < threshold) return false;
      }
      if (dateFilter === 'custom' && customStart && customEnd) {
        const created = new Date(quote.created_at);
        const endOfDay = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59);
        if (created < customStart || created > endOfDay) return false;
      }
      return true;
    });
  }, [data, search, dateFilter, customStart, customEnd]);

  const getDateLabel = () => {
    if (dateFilter === 'custom' && customStart && customEnd) {
      return `${formatShortDate(customStart)} — ${formatShortDate(customEnd)}`;
    }
    if (dateFilter === 'custom') return 'Selecione o período';
    if (dateFilter === 'todos') return 'Filtrar por data';
    return `Últimos ${DATE_OPTIONS.find(o => o.value === dateFilter)?.label}`;
  };

  const clearDateFilter = () => {
    setDateFilter('todos');
    setCustomStart(null);
    setCustomEnd(null);
    setShowDateFilter(false);
    setShowCalendar(false);
  };

  const handleDateOption = (value: DateFilter) => {
    if (value === 'custom') {
      setDateFilter('custom');
      setCustomStart(null);
      setCustomEnd(null);
      setShowCalendar(true);
      setShowDateFilter(false);
    } else {
      setDateFilter(value);
      setCustomStart(null);
      setCustomEnd(null);
      setShowCalendar(false);
      setShowDateFilter(false);
    }
  };

  const handleDayPress = useCallback((day: Date) => {
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(day);
      setCustomEnd(null);
    } else {
      if (day < customStart) {
        setCustomEnd(customStart);
        setCustomStart(day);
      } else {
        setCustomEnd(day);
      }
    }
  }, [customStart, customEnd]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const calendarDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

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

        {/* Date filter button */}
        <TouchableOpacity
          onPress={() => setShowDateFilter(!showDateFilter)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: isDateActive ? colors.primary[50] : colors.neutral.white,
            borderRadius: radius.lg,
            borderWidth: 0.5,
            borderColor: isDateActive ? colors.primary[200] : colors.neutral.gray200,
            paddingHorizontal: 12, paddingVertical: 9,
          }}
        >
          <IconCalendar size={15} color={isDateActive ? colors.primary[600] : colors.neutral.gray500} strokeWidth={1.8} />
          <Text style={{
            flex: 1,
            fontFamily: 'Inter_400Regular',
            fontSize: typography.sizes.sm,
            color: isDateActive ? colors.primary[800] : colors.neutral.gray600,
          }}>
            {getDateLabel()}
          </Text>
          {isDateActive && (
            <TouchableOpacity onPress={clearDateFilter} hitSlop={8}>
              <IconX size={14} color={colors.primary[600]} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Quick date options */}
        {showDateFilter && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DATE_OPTIONS.map(opt => {
              const active = dateFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleDateOption(opt.value)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: active ? colors.primary[600] : colors.neutral.white,
                    borderRadius: radius.md,
                    borderWidth: 0.5,
                    borderColor: active ? colors.primary[600] : colors.neutral.gray200,
                    paddingHorizontal: 14, paddingVertical: 7,
                  }}
                >
                  <Text style={{
                    fontFamily: active ? 'Inter_500Medium' : 'Inter_400Regular',
                    fontSize: typography.sizes.sm,
                    color: active ? colors.neutral.white : colors.neutral.gray700,
                  }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Calendar for custom range */}
        {showCalendar && dateFilter === 'custom' && (
          <View style={{
            backgroundColor: colors.neutral.white,
            borderRadius: radius.lg,
            borderWidth: 0.5,
            borderColor: colors.neutral.gray200,
            padding: 14,
          }}>
            {/* Range display */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <View style={{
                flex: 1, backgroundColor: colors.neutral.gray50,
                borderRadius: radius.md, padding: 10,
                borderWidth: 0.5, borderColor: customStart && !customEnd ? colors.primary[400] : colors.neutral.gray200,
              }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.neutral.gray500, marginBottom: 2 }}>De</Text>
                <Text style={{
                  fontFamily: 'Inter_500Medium', fontSize: typography.sizes.md,
                  color: customStart ? colors.neutral.gray900 : colors.neutral.gray400,
                }}>{customStart ? formatShortDate(customStart) : 'dd/mm'}</Text>
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: typography.sizes.sm, color: colors.neutral.gray400 }}>até</Text>
              </View>
              <View style={{
                flex: 1, backgroundColor: colors.neutral.gray50,
                borderRadius: radius.md, padding: 10,
                borderWidth: 0.5, borderColor: customStart && !customEnd ? colors.neutral.gray200 : colors.neutral.gray200,
              }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.neutral.gray500, marginBottom: 2 }}>Até</Text>
                <Text style={{
                  fontFamily: 'Inter_500Medium', fontSize: typography.sizes.md,
                  color: customEnd ? colors.neutral.gray900 : colors.neutral.gray400,
                }}>{customEnd ? formatShortDate(customEnd) : 'dd/mm'}</Text>
              </View>
            </View>

            {/* Month navigation */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <TouchableOpacity onPress={prevMonth} hitSlop={8} style={{ padding: 4 }}>
                <IconChevronLeft size={18} color={colors.neutral.gray600} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={{
                fontFamily: 'Inter_500Medium',
                fontSize: typography.sizes.md,
                color: colors.neutral.gray900,
              }}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={nextMonth} hitSlop={8} style={{ padding: 4 }}>
                <IconChevronRight size={18} color={colors.neutral.gray600} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {WEEKDAYS.map(w => (
                <View key={w} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 10,
                    color: colors.neutral.gray400,
                    textTransform: 'uppercase',
                  }}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {calendarDays.map((day, i) => {
                if (!day) {
                  return <View key={`e-${i}`} style={{ width: '14.28%', height: 36 }} />;
                }

                const isStart = customStart && sameDay(day, customStart);
                const isEnd = customEnd && sameDay(day, customEnd);
                const isInRange = customStart && customEnd && isBetween(day, customStart, customEnd);
                const isToday = sameDay(day, new Date());
                const isSelected = isStart || isEnd;

                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.6}
                    style={{
                      width: '14.28%', height: 36,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isSelected
                        ? colors.primary[600]
                        : isInRange
                          ? colors.primary[50]
                          : 'transparent',
                      borderRadius: isStart && !isEnd ? 18
                        : isEnd && !isStart ? 18
                        : isSelected ? 18 : 0,
                      borderTopLeftRadius: isStart ? 18 : (isInRange && !isEnd ? 0 : undefined),
                      borderBottomLeftRadius: isStart ? 18 : (isInRange && !isEnd ? 0 : undefined),
                      borderTopRightRadius: isEnd ? 18 : (isInRange && !isStart ? 0 : undefined),
                      borderBottomRightRadius: isEnd ? 18 : (isInRange && !isStart ? 0 : undefined),
                    }}
                  >
                    <Text style={{
                      fontFamily: isSelected ? 'Inter_500Medium' : 'Inter_400Regular',
                      fontSize: typography.sizes.sm,
                      color: isSelected
                        ? colors.neutral.white
                        : isToday
                          ? colors.primary[600]
                          : colors.neutral.gray800,
                    }}>{day.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm / clear buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={clearDateFilter}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 9,
                  borderRadius: radius.md,
                  borderWidth: 0.5, borderColor: colors.neutral.gray200,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.sm, color: colors.neutral.gray600 }}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (customStart && customEnd) setShowCalendar(false); }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 9,
                  borderRadius: radius.md,
                  backgroundColor: hasCustomRange ? colors.primary[600] : colors.neutral.gray200,
                }}
              >
                <Text style={{
                  fontFamily: 'Inter_500Medium', fontSize: typography.sizes.sm,
                  color: hasCustomRange ? colors.neutral.white : colors.neutral.gray400,
                }}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
