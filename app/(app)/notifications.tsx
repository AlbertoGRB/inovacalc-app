import {
  View, Text, TouchableOpacity, FlatList, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  IconChevronLeft, IconTrash, IconFileText, IconBuilding,
  IconBell, IconCheck,
} from '@tabler/icons-react-native';
import { colors, typography, radius } from '@/theme';
import { useNotificationsStore, type AppNotification } from '@/stores/notificationsStore';

const TYPE_CONFIG = {
  quote:   { icon: IconFileText, bg: colors.primary[50],  color: colors.primary[600]  },
  company: { icon: IconBuilding, bg: colors.success[50],  color: colors.success[600]  },
  system:  { icon: IconBell,     bg: colors.warning[50],  color: colors.warning[600]  },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, markRead, markAllRead, clearAll } = useNotificationsStore();

  const unreadCount = items.filter(n => !n.read).length;

  function handleClearAll() {
    Alert.alert(
      'Limpar notificações',
      'Deseja remover todas as notificações?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar tudo', style: 'destructive', onPress: clearAll },
      ],
    );
  }

  function renderItem({ item }: { item: AppNotification }) {
    const cfg = TYPE_CONFIG[item.type];
    const Icon = cfg.icon;
    return (
      <TouchableOpacity
        onPress={() => markRead(item.id)}
        activeOpacity={0.75}
        style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 12,
          backgroundColor: item.read ? colors.neutral.white : colors.primary[50],
          borderRadius: radius.lg, padding: 14, marginBottom: 8,
          borderWidth: 0.5,
          borderColor: item.read ? colors.neutral.gray200 : colors.primary[200],
        }}
      >
        <View style={{
          width: 38, height: 38, borderRadius: 10,
          backgroundColor: cfg.bg,
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} color={cfg.color} strokeWidth={1.8} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{
              fontFamily: 'Inter_500Medium', fontSize: typography.sizes.md,
              color: colors.neutral.gray900, flex: 1,
            }} numberOfLines={1}>{item.title}</Text>
            {!item.read && (
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: colors.primary[600], marginLeft: 8, flexShrink: 0,
              }} />
            )}
          </View>
          <Text style={{
            fontFamily: 'Inter_400Regular', fontSize: typography.sizes.sm,
            color: colors.neutral.gray500, marginTop: 2,
          }} numberOfLines={2}>{item.body}</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular', fontSize: typography.sizes.xs,
            color: colors.neutral.gray400, marginTop: 6,
          }}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      <View style={{
        backgroundColor: colors.neutral.white,
        paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14,
        borderBottomWidth: 0.5, borderBottomColor: colors.neutral.gray200,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconChevronLeft size={16} color={colors.neutral.gray700} strokeWidth={2} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.sm, color: colors.neutral.gray700 }}>
            Voltar
          </Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.xl, color: colors.neutral.gray900 }}>
          Notificações
        </Text>

        <TouchableOpacity
          onPress={handleClearAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={items.length === 0}
          style={{ opacity: items.length === 0 ? 0.3 : 1 }}
        >
          <IconTrash size={18} color={colors.danger[600]} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity
          onPress={markAllRead}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, backgroundColor: colors.primary[50], paddingVertical: 10,
            borderBottomWidth: 0.5, borderBottomColor: colors.primary[100],
          }}
        >
          <IconCheck size={14} color={colors.primary[600]} strokeWidth={2.5} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.sm, color: colors.primary[600] }}>
            Marcar {unreadCount} como lida{unreadCount > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: colors.neutral.gray100,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <IconBell size={28} color={colors.neutral.gray400} strokeWidth={1.5} />
            </View>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.lg, color: colors.neutral.gray700, marginBottom: 4 }}>
              Tudo em dia!
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: typography.sizes.md, color: colors.neutral.gray400 }}>
              Nenhuma notificação no momento.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
