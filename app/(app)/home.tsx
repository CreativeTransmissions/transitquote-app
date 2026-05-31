import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useRole } from '../../hooks/useRole';
import { useDrivers } from '../../hooks/useDrivers';
import { useLogout } from '../../hooks/useLogout';
import { useSites } from '../../hooks/useSites';
import { fullName } from '../../utils/formatters';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import type { SiteConfig } from '../../types/app';

/** Profile / Settings (spec §6.10): current user, driver details, active site + switcher, logout. */
export default function ProfileScreen() {
  const user = useCurrentUser();
  const { role, assignmentMode, driverId } = useRole();
  const drivers = useDrivers();
  const logout = useLogout();
  const { sites, activeSiteId, switchTo } = useSites();

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
        <Pressable testID="profile-back" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Profile</Text>

        {activeSite ? (
          <View style={styles.activeSite}>
            <Text style={styles.activeSiteLabel}>Active site</Text>
            <Text style={styles.activeSiteUrl} numberOfLines={1}>
              {activeSite.siteUrl}
            </Text>
          </View>
        ) : null}

        <Section title="User">
          <Row label="Name" value={name} />
          <Row label="Role" value={role ?? '—'} />
          <Row label="Assignment mode" value={assignmentMode} />
        </Section>

        {driver ? (
          <Section title="Driver">
            <Row label="Phone" value={driver.phone || '—'} />
            <Row label="Email" value={driver.email || '—'} />
            <Row label="Availability" value={driver.available ? 'Available' : 'Unavailable'} />
          </Section>
        ) : null}

        {sites.length > 1 ? (
          <Section title="Switch site">
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
                  {active ? <Text style={styles.tick}>✓</Text> : <Text style={styles.switchHint}>Switch</Text>}
                </Pressable>
              );
            })}
          </Section>
        ) : null}

        <View style={styles.logout}>
          <Button label="Log out" variant="secondary" onPress={handleLogout} loading={logout.isPending} testID="profile-logout" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  content: { padding: SPACING.lg },
  back: { ...TYPOGRAPHY.body, color: COLOURS.primary, marginBottom: SPACING.sm },
  title: { ...TYPOGRAPHY.title, color: COLOURS.text, marginBottom: SPACING.md },
  activeSite: {
    backgroundColor: COLOURS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  activeSiteLabel: { ...TYPOGRAPHY.label, color: COLOURS.background, opacity: 0.8 },
  activeSiteUrl: { ...TYPOGRAPHY.subheading, color: COLOURS.background },
  section: { marginBottom: SPACING.lg, gap: SPACING.xs },
  sectionTitle: { ...TYPOGRAPHY.label, color: COLOURS.textMuted, textTransform: 'uppercase' },
  card: {
    backgroundColor: COLOURS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLOURS.border,
    paddingHorizontal: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  rowLabel: { ...TYPOGRAPHY.body, color: COLOURS.textMuted },
  rowValue: { ...TYPOGRAPHY.body, color: COLOURS.text, flexShrink: 1, textAlign: 'right' },
  siteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.border,
  },
  siteUrl: { ...TYPOGRAPHY.body, color: COLOURS.text, flexShrink: 1 },
  siteActive: { color: COLOURS.primary, fontWeight: '600' },
  tick: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  switchHint: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  logout: { marginTop: SPACING.sm },
});
