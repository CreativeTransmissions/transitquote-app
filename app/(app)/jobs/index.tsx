import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobList } from '../../../components/jobs/JobList';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useJobs } from '../../../hooks/useJobs';
import { useRole } from '../../../hooks/useRole';
import { useOutbox } from '../../../hooks/useOutbox';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../../constants';

export default function JobsScreen() {
  const { jobs, dbError, isSyncing, syncError, refresh } = useJobs();
  const { isDispatcher } = useRole();
  const { stateByJob } = useOutbox();

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
          emptyTitle="No jobs yet"
          emptySubtitle="Pull down to refresh."
        />
      )}
    </SafeAreaView>
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
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  syncError: {
    backgroundColor: COLOURS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  syncErrorText: { ...TYPOGRAPHY.caption, color: COLOURS.danger },
});
