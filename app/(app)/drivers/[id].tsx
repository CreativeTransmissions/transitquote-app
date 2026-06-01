import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobCard } from '../../../components/jobs/JobCard';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useDrivers } from '../../../hooks/useDrivers';
import { useJobs } from '../../../hooks/useJobs';
import { useOutbox } from '../../../hooks/useOutbox';
import { useRole } from '../../../hooks/useRole';
import { fullName } from '../../../utils/formatters';
import { mailtoUrl, telUrl } from '../../../utils/links';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';

async function openUrl(url: string | null): Promise<void> {
  if (!url) return;
  const supported = await Linking.canOpenURL(url);
  if (supported) await Linking.openURL(url);
  else Alert.alert('Unable to open', 'No app available to handle this link.');
}

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const driverId = Number(id);
  const { role, isDispatcher } = useRole();
  const drivers = useDrivers();
  const { jobs } = useJobs('mine', driverId);
  const { stateByJob } = useOutbox();

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
        <Pressable testID="driver-back" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
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
                <LinkRow label="Phone" value={driver.phone ?? ''} url={phone} testID="driver-call" />
                <LinkRow label="Email" value={driver.email ?? ''} url={email} testID="driver-email" />
                {assignTarget ? (
                  <Row label="Can assign to" value={fullName(assignTarget.firstName, assignTarget.lastName)} />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

function LinkRow({ label, value, url, testID }: { label: string; value: string; url: string | null; testID?: string }) {
  if (!url) return <Row label={label} value={value} />;
  return (
    <Pressable testID={testID} style={styles.row} accessibilityRole="link" onPress={() => openUrl(url)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, styles.rowValueLink]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  content: { padding: SPACING.md, gap: SPACING.sm },
  headerBlock: { gap: SPACING.sm, marginBottom: SPACING.sm },
  name: { ...TYPOGRAPHY.title, color: COLOURS.text },
  badge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  available: { backgroundColor: '#E6F4EA' },
  unavailable: { backgroundColor: '#FDECEA' },
  badgeText: { ...TYPOGRAPHY.label, color: COLOURS.text },
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
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  rowLabel: { ...TYPOGRAPHY.body, color: COLOURS.textMuted },
  rowValue: { ...TYPOGRAPHY.body, color: COLOURS.text, flexShrink: 1, textAlign: 'right' },
  rowValueLink: { color: COLOURS.primary },
  section: { ...TYPOGRAPHY.label, color: COLOURS.textMuted, textTransform: 'uppercase', marginTop: SPACING.sm },
});
