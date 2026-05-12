import { View, Text, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconHome,
  IconFileText,
  IconBuilding,
  IconUser,
} from '@tabler/icons-react-native';
import { colors, typography } from '@/theme';

const tabs = [
  { label: 'Início',     icon: IconHome,      href: '/'           },
  { label: 'Orçamentos', icon: IconFileText,   href: '/quotes'     },
  { label: 'Empresas',   icon: IconBuilding,   href: '/companies'  },
  { label: 'Perfil',     icon: IconUser,       href: '/profile'    },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.neutral.white,
      borderTopWidth: 1,
      borderTopColor: colors.neutral.gray100,
      paddingBottom: insets.bottom,
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.href}
            onPress={() => router.push(tab.href as any)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 }}
            activeOpacity={0.7}
          >
            <Icon
              size={22}
              color={active ? colors.primary[900] : colors.neutral.gray400}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <Text style={{
              fontFamily: active ? 'Inter_500Medium' : 'Inter_400Regular',
              fontSize: typography.sizes.xs,
              color: active ? colors.primary[900] : colors.neutral.gray400,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
