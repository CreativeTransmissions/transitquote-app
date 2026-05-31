import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobList } from '../../../components/jobs/JobList';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useJobs, type JobScope } from '../../../hooks/useJobs';
import { useRole } from '../../../hooks/useRole';
import { useOutbox } from '../../../hooks/useOutbox';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../../constants';

type DriverTab = 'available' | 'mine';

export default function JobsScreen() {
  const { isDispatcher, isDriver, isDecentralized, driverId } = useRole();
  const { stateByJob } = useOutbox();

  // Decentralized drivers get Available / My Jobs tabs (spec §6.4). Everyone else sees one list:
  // dispatchers see all jobs; centralized drivers see the server-filtered list.
  const showTabs = isDriver && isDecentralized;
  const [tab, setTab] = useState<DriverTab>('available');
  const scope: JobScope = showTabs ? tab : 'all';

  const { jobs, dbError, isSyncing, syncError, refresh } = useJobs(scope, driverId);
  const showSpinner = jobs.length === 0 && isSyncing && !syncError;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />

      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <Pressable onPress={() => router.push('/home')} hitSlop={8}>
          <Text style={styles.link}>Profile</Text>
        </Pressable>
      </View>

      {showTabs ? (
        <View style={styles.tabs}>
          <Tab label="Available" active={tab === 'available'} onPress={() => setTab('available')} testID="tab-available" />
          <Tab label="My Jobs" active={tab === 'mine'} onPress={() => setTab('mine')} testID="tab-mine" />
        </View>
      ) : null}

      {syncError && !isSyncing ? (
        <View style={styles.syncError}>
          <Text style={styles.syncErrorText} numberOfLines={2}>
            Couldn’t reach the server. Pull to retry.
          </Text>
        </View>
      ) : null}

      {dbError ? (
        <EmptyState title="Couldn’t load jobs" subtitle={dbError.message} />
      ) : showSpinner ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={COLOURS.primary} />
        </View>
      ) : (
        <JobList
          jobs={jobs}
          onSelect={(id) => router.push(`/jobs/${id}`)}
          refreshing={isSyncing}
          onRefresh={refresh}
          showDriver={isDispatcher}
          outboxStateByJob={stateByJob}
          emptyTitle={emptyTitle(scope)}
          emptySubtitle="Pull down to refresh."
        />
      )}
    </SafeAreaView>
  );
}

function emptyTitle(scope: JobScope): string {
  if (scope === 'available') return 'No available jobs';
  if (scope === 'mine') return 'No jobs assigned to you';
  return 'No jobs yet';
}

function Tab({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  title: { ...TYPOGRAPHY.title, color: COLOURS.text },
  link: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.xs },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLOURS.primary },
  tabLabel: { ...TYPOGRAPHY.body, color: COLOURS.textMuted },
  tabLabelActive: { color: COLOURS.primary, fontWeight: '600' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  syncError: { backgroundColor: COLOURS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  syncErrorText: { ...TYPOGRAPHY.caption, color: COLOURS.danger },
});
