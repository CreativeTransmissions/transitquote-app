import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useRole } from '../../hooks/useRole';
import { useOutbox } from '../../hooks/useOutbox';
import { useTheme } from '../../hooks/useTheme';
import { hapticLight } from '../../utils/haptics';
import { TYPOGRAPHY } from '../../constants';

// Route-level error boundary for the authenticated area (CLAUDE.md).
export { RouteErrorBoundary as ErrorBoundary } from '../../components/shared/RouteErrorBoundary';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Tab icon renderer — the tab itself provides the accessible name, so the glyph is decorative. */
function tabIcon(base: IconName, focusedName: IconName) {
  const TabIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <MaterialCommunityIcons name={focused ? focusedName : base} size={24} color={color} />
  );
  TabIcon.displayName = `TabIcon(${base})`;
  return TabIcon;
}

/**
 * Protected layout — tracks connectivity, bounces to login if not authenticated, and presents the
 * primary bottom-tab navigation. Role-gates the dispatcher-only tabs via `href: null` (Expo Router
 * requires a static screen list, so tabs are hidden, never unmounted — CLAUDE.md Open/Closed).
 */
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  useConnectivity(); // keep online/offline state fresh across the authenticated area
  const { isDispatcher } = useRole();
  const { failed } = useOutbox();
  const failedCount = failed.length;
  const insets = useSafeAreaInsets();
  const t = useTheme();

  if (status !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  // Dispatcher/admin see all four tabs; drivers (and the role-loading window) see only Jobs + Profile.
  const dispatcherHref = isDispatcher ? undefined : null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colours.primary,
        tabBarInactiveTintColor: t.colours.textMuted,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: t.colours.background,
          borderTopWidth: 1,
          borderTopColor: t.colours.border,
        },
        // Tab labels carry semantic meaning (icons alone are not sufficient in sun/gloves), but
        // allowing full OS font scaling on a constrained 64dp tab bar causes label overflow and
        // overlapping icons. Cap at 1× (tabBarAllowFontScaling: false) — the icons carry the
        // meaning and the fixed-height bar makes variable scaling impractical.
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: { fontSize: TYPOGRAPHY.label.fontSize, fontWeight: TYPOGRAPHY.label.fontWeight },
      }}
      screenListeners={{
        // Haptic confirmation on every tab switch (A11y-7 / §3.6): light impact gives gloved
        // drivers tactile feedback that the navigation registered. Fire-and-forget — never throws.
        tabPress: () => { void hapticLight(); },
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarButtonTestID: 'tab-jobs',
          tabBarIcon: tabIcon('briefcase-outline', 'briefcase'),
          tabBarBadge: failedCount > 0 ? failedCount : undefined,
          tabBarBadgeStyle: { backgroundColor: t.colours.danger },
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Drivers',
          href: dispatcherHref,
          tabBarButtonTestID: 'tab-drivers',
          tabBarIcon: tabIcon('account-multiple-outline', 'account-multiple'),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          href: dispatcherHref,
          tabBarButtonTestID: 'tab-customers',
          tabBarIcon: tabIcon('account-box-outline', 'account-box'),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Profile',
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: tabIcon('account-circle-outline', 'account-circle'),
        }}
      />
    </Tabs>
  );
}
