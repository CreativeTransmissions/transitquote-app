import { useMemo } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobCard } from '../../../components/jobs/JobCard';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Icon } from '../../../components/shared/Icon';
import { useDrivers } from '../../../hooks/useDrivers';
import { useJobs } from '../../../hooks/useJobs';
import { useOutbox } from '../../../hooks/useOutbox';
import { useRole } from '../../../hooks/useRole';
import { useTheme, type Theme } from '../../../hooks/useTheme';
import { fullName } from '../../../utils/formatters';
import { mailtoUrl, telUrl } from '../../../utils/links';
import { openLink } from '../../../utils/openLink';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';

async function openUrl(url: string | null): Promise<void> {
  if (!url) return;
  const opened = await openLink(url);
  if (!opened) Alert.alert('Unable to open', 'No app available to handle this link.');
}

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const driverId = Number(id);
  const { role, isDispatcher } = useRole();
  const drivers = useDrivers();
  const { jobs } = useJobs('mine', driverId);
  const { stateByJob } = useOutbox();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Don't redirect while the role query is still hydrating (role === null) — see drivers/index.tsx.
  if (role !== null && !isDispatcher) return <Redirect href="/jobs" />;

  const driver = drivers.find((d) => d.id === driverId) ?? null;
  const assignTarget = driver?.canAssignTo != null ? drivers.find((d) => d.id === driver.canAssignTo) : null;
  const phone = telUrl(driver?.phone);
  const email = mailtoUrl(driver?.email);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <Pressable
          testID="driver-back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size="lg" colour={t.colours.primary} />
        </Pressable>
      </View>

      {!driver ? (
        <EmptyState title="Driver not found" />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <JobCard job={item} outboxState={stateByJob.get(item.id)} onPress={(jobId) => router.push(`/jobs/${jobId}`)} />
          )}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Text style={styles.name}>{fullName(driver.firstName, driver.lastName) || `Driver ${driver.id}`}</Text>
              <View style={[styles.badge, driver.available ? styles.available : styles.unavailable]}>
                <Text style={styles.badgeText}>{driver.available ? 'Available' : 'Unavailable'}</Text>
              </View>

              <View style={styles.card}>
                <LinkRow label="Phone" value={driver.phone ?? ''} url={phone} testID="driver-call" styles={styles} />
                <LinkRow label="Email" value={driver.email ?? ''} url={email} testID="driver-email" styles={styles} />
                {assignTarget ? (
                  <Row label="Can assign to" value={fullName(assignTarget.firstName, assignTarget.lastName)} styles={styles} />
                ) : null}
              </View>

              <Text style={styles.section}>Assigned jobs ({jobs.length})</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState title="No jobs assigned" />}
        />
      )}
    </SafeAreaView>
  );
}

type DriverDetailStyles = ReturnType<typeof makeStyles>;

function Row({ label, value, styles }: { label: string; value: string; styles: DriverDetailStyles }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

function LinkRow({
  label,
  value,
  url,
  testID,
  styles,
}: {
  label: string;
  value: string;
  url: string | null;
  testID?: string;
  styles: DriverDetailStyles;
}) {
  if (!url) return <Row label={label} value={value} styles={styles} />;
  return (
    <Pressable testID={testID} style={styles.row} accessibilityRole="link" onPress={() => openUrl(url)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, styles.rowValueLink]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.background },
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
    content: { padding: SPACING.md, gap: SPACING.sm },
    headerBlock: { gap: SPACING.sm, marginBottom: SPACING.sm },
    name: { ...TYPOGRAPHY.title, color: t.colours.text },
    badge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
    available: { backgroundColor: t.colours.successSurface },
    unavailable: { backgroundColor: t.colours.dangerSurface },
    badgeText: { ...TYPOGRAPHY.label, color: t.colours.text },
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
      paddingVertical: SPACING.sm,
      gap: SPACING.md,
    },
    rowLabel: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    rowValue: { ...TYPOGRAPHY.body, color: t.colours.text, flexShrink: 1, textAlign: 'right' },
    rowValueLink: { color: t.colours.primary },
    section: { ...TYPOGRAPHY.label, color: t.colours.textMuted, textTransform: 'uppercase', marginTop: SPACING.sm },
  });
