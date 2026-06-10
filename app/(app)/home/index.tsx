import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/shared/Button';
import { Icon } from '../../../components/shared/Icon';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useRole } from '../../../hooks/useRole';
import { useDrivers } from '../../../hooks/useDrivers';
import { useLogout } from '../../../hooks/useLogout';
import { useSites } from '../../../hooks/useSites';
import { useTheme, type Theme } from '../../../hooks/useTheme';
import { useSettingsStore, type ThemePreference } from '../../../stores/settingsStore';
import { fullName } from '../../../utils/formatters';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { SiteConfig } from '../../../types/app';

const THEME_OPTIONS: { value: ThemePreference; label: string; testID: string }[] = [
  { value: 'system', label: 'System', testID: 'theme-system' },
  { value: 'light', label: 'Light', testID: 'theme-light' },
  { value: 'dark', label: 'Dark', testID: 'theme-dark' },
];

/** Profile / Settings (spec §6.10): current user, driver details, active site + switcher, appearance, logout. */
export default function ProfileScreen() {
  const user = useCurrentUser();
  const { role, assignmentMode, driverId } = useRole();
  const drivers = useDrivers();
  const logout = useLogout();
  const { sites, activeSiteId, switchTo } = useSites();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const name = fullName(user?.firstName, user?.lastName) || user?.firstName || '—';
  const driver = driverId != null ? drivers.find((d) => d.id === driverId) ?? null : null;
  const activeSite = sites.find((s) => s.id === activeSiteId) ?? null;

  const handleLogout = () => {
    Alert.alert('Log out', 'Log out of this site?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => logout.mutate(undefined, { onSuccess: () => router.replace('/login') }),
      },
    ]);
  };

  const handleSwitch = (site: SiteConfig) => {
    if (site.id === activeSiteId) return;
    Alert.alert('Switch site', `Switch to ${site.siteUrl}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          await switchTo(site.id);
          router.replace('/'); // index redirect → jobs (if token) or login
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {activeSite ? (
          <View style={styles.activeSite}>
            <Text style={styles.activeSiteLabel}>Active site</Text>
            <Text style={styles.activeSiteUrl} numberOfLines={1}>
              {activeSite.siteUrl}
            </Text>
          </View>
        ) : null}

        <Section title="User" styles={styles}>
          <Row label="Name" value={name} styles={styles} />
          <Row label="Role" value={role ?? '—'} styles={styles} />
          <Row label="Assignment mode" value={assignmentMode} styles={styles} />
        </Section>

        {driver ? (
          <Section title="Driver" styles={styles}>
            <Row label="Phone" value={driver.phone || '—'} styles={styles} />
            <Row label="Email" value={driver.email || '—'} styles={styles} />
            <Row label="Availability" value={driver.available ? 'Available' : 'Unavailable'} styles={styles} />
          </Section>
        ) : null}

        {sites.length > 1 ? (
          <Section title="Switch site" styles={styles}>
            {sites.map((site) => {
              const active = site.id === activeSiteId;
              return (
                <Pressable
                  key={site.id}
                  testID={`site-${site.id}`}
                  style={styles.siteRow}
                  onPress={() => handleSwitch(site)}
                  disabled={active}
                  accessibilityRole="button"
                >
                  <Text style={[styles.siteUrl, active && styles.siteActive]} numberOfLines={1}>
                    {site.siteUrl}
                  </Text>
                  {active ? (
                    <Icon name="check" size="md" colour={t.colours.primary} accessibilityLabel="Active site" />
                  ) : (
                    <Text style={styles.switchHint}>Switch</Text>
                  )}
                </Pressable>
              );
            })}
          </Section>
        ) : null}

        <Section title="Help" styles={styles}>
          <Pressable
            testID="help-link"
            style={styles.navRow}
            onPress={() => router.push('/home/help')}
            accessibilityRole="button"
            accessibilityLabel="How this app works"
          >
            <Icon name="help-circle-outline" size="md" colour={t.colours.textMuted} />
            <Text style={styles.navLabel}>How this app works</Text>
            <Icon name="chevron-right" size="md" colour={t.colours.textMuted} />
          </Pressable>
        </Section>

        <Section title="Appearance" styles={styles}>
          {THEME_OPTIONS.map((option) => {
            const checked = themePreference === option.value;
            return (
              <Pressable
                key={option.value}
                testID={option.testID}
                style={styles.themeRow}
                onPress={() => setThemePreference(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
              >
                <Text style={[styles.themeLabel, checked && styles.themeLabelActive]}>{option.label}</Text>
                {checked ? (
                  <Icon name="check" size="md" colour={t.colours.primary} accessibilityLabel="Selected" />
                ) : null}
              </Pressable>
            );
          })}
        </Section>

        <View style={styles.logout}>
          <Button label="Log out" variant="secondary" onPress={handleLogout} loading={logout.isPending} testID="profile-logout" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ProfileStyles = ReturnType<typeof makeStyles>;

function Section({ title, children, styles }: { title: string; children: ReactNode; styles: ProfileStyles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value, styles }: { label: string; value: string; styles: ProfileStyles }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.background },
    content: { padding: SPACING.lg },
    title: { ...TYPOGRAPHY.title, color: t.colours.text, marginBottom: SPACING.md },
    activeSite: {
      backgroundColor: t.colours.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    activeSiteLabel: { ...TYPOGRAPHY.label, color: t.colours.textInverse, opacity: 0.8 },
    activeSiteUrl: { ...TYPOGRAPHY.subheading, color: t.colours.textInverse },
    section: { marginBottom: SPACING.lg, gap: SPACING.xs },
    sectionTitle: { ...TYPOGRAPHY.label, color: t.colours.textMuted, textTransform: 'uppercase' },
    card: {
      backgroundColor: t.colours.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: t.colours.border,
      paddingHorizontal: SPACING.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
    rowLabel: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    rowValue: { ...TYPOGRAPHY.body, color: t.colours.text, flexShrink: 1, textAlign: 'right' },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    navLabel: { ...TYPOGRAPHY.body, color: t.colours.text, flex: 1 },
    siteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      gap: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: t.colours.border,
    },
    siteUrl: { ...TYPOGRAPHY.body, color: t.colours.text, flexShrink: 1 },
    siteActive: { color: t.colours.primary, fontWeight: '600' },
    switchHint: { ...TYPOGRAPHY.body, color: t.colours.primary },
    themeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 48,
      paddingVertical: SPACING.sm,
      gap: SPACING.md,
    },
    themeLabel: { ...TYPOGRAPHY.body, color: t.colours.text },
    themeLabelActive: { color: t.colours.primary, fontWeight: '600' },
    logout: { marginTop: SPACING.sm },
  });
