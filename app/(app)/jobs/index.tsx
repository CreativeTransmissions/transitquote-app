import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { JobList } from '../../../components/jobs/JobList';
import { JobFilterSheet } from '../../../components/jobs/JobFilterSheet';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { SyncStatusIndicator } from '../../../components/sync/SyncStatusIndicator';
import { FirstSyncProgress } from '../../../components/sync/FirstSyncProgress';
import { SkeletonJobCard } from '../../../components/sync/SkeletonJobCard';
import { OutboxToast } from '../../../components/sync/OutboxToast';
import { RefreshingFooter } from '../../../components/sync/RefreshingFooter';
import { EmptyState } from '../../../components/shared/EmptyState';
import { HintCard } from '../../../components/shared/HintCard';
import { Icon } from '../../../components/shared/Icon';
import { useJobs, type JobScope } from '../../../hooks/useJobs';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { useJobFilters } from '../../../hooks/useJobFilters';
import { useRole } from '../../../hooks/useRole';
import { useOutbox } from '../../../hooks/useOutbox';
import { useFirstRunHint } from '../../../hooks/useFirstRunHint';
import { useConnectivityStore } from '../../../stores/connectivityStore';
import { useStatusTypes } from '../../../hooks/useStatusTypes';
import { useDrivers } from '../../../hooks/useDrivers';
import { applyJobFilters, countActiveFilters } from '../../../utils/jobFilter';
import { useTheme, type Theme } from '../../../hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../../constants';

type DriverTab = 'available' | 'mine';

export default function JobsScreen() {
  const { role, isDispatcher, isDriver, isDecentralized, driverId } = useRole();
  const { stateByJob } = useOutbox();
  const statuses = useStatusTypes();
  const drivers = useDrivers();
  const { filters, setFilters, clear } = useJobFilters();
  const { showHint, dismissHint } = useFirstRunHint();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Decentralized drivers get Available / My Jobs tabs (spec §6.4). Everyone else sees one list:
  // dispatchers see all jobs; centralized drivers see the server-filtered list.
  const showTabs = isDriver && isDecentralized;
  const [tab, setTab] = useState<DriverTab>('available');
  const scope: JobScope = showTabs ? tab : 'all';

  const { jobs, dbError, isSyncing, syncError, refresh, cancelSync } = useJobs(scope, driverId);
  // #12: the RefreshControl spinner only acknowledges the gesture — sync progress is shown by
  // the non-blocking RefreshingFooter below the list, so the user can keep working.
  const { refreshing, onRefresh } = usePullToRefresh(refresh);
  const detailHydration = useConnectivityStore((s) => s.detailHydration);
  const [filterVisible, setFilterVisible] = useState(false);

  // P-1: filtering is O(n) over the whole job set — memoize so it only reruns when jobs/filters change.
  const visibleJobs = useMemo(() => applyJobFilters(jobs, filters), [jobs, filters]);
  const activeFilters = countActiveFilters(filters);
  const showSpinner = jobs.length === 0 && isSyncing && !syncError;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={t.gradients.screen} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <OfflineBanner />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Jobs</Text>
          <SyncStatusIndicator />
        </View>
      </View>

      {showHint && role !== null ? (
        <HintCard message={hintMessage(role, isDecentralized)} onDismiss={dismissHint} testID="jobs-hint" />
      ) : null}

      {showTabs ? (
        <View style={styles.tabs}>
          <Tab label="Available" active={tab === 'available'} onPress={() => setTab('available')} testID="tab-available" styles={styles} />
          <Tab label="My Jobs" active={tab === 'mine'} onPress={() => setTab('mine')} testID="tab-mine" styles={styles} />
        </View>
      ) : null}

      {syncError && !isSyncing ? (
        <View style={styles.syncError}>
          <Text style={styles.syncErrorText} numberOfLines={2}>
            Couldn’t reach the server. Pull to retry.
          </Text>
        </View>
      ) : null}

      <View style={styles.listArea}>
        {dbError ? (
          <EmptyState title="Couldn’t load jobs" subtitle={dbError.message} />
        ) : showSpinner ? (
          <View style={styles.skeletonContainer}>
            <FirstSyncProgress onCancel={cancelSync} progress={detailHydration} compact />
            <SkeletonJobCard />
            <SkeletonJobCard />
            <SkeletonJobCard />
            <SkeletonJobCard />
          </View>
        ) : (
          <JobList
            jobs={visibleJobs}
            onSelect={(id) => router.push(`/jobs/${id}`)}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showDriver={isDispatcher}
            outboxStateByJob={stateByJob}
            emptyTitle={activeFilters > 0 ? 'No jobs match your filters' : emptyTitle(scope)}
            emptySubtitle={
              activeFilters > 0
                ? 'Adjust or clear the filters.'
                : scope === 'available'
                  ? 'No unclaimed jobs right now. New jobs appear here automatically — pull down to check.'
                  : 'Pull down to refresh.'
            }
            emptyIcon={
              activeFilters > 0
                ? 'filter-remove-outline'
                : scope === 'available'
                  ? 'briefcase-search-outline'
                  : 'briefcase-outline'
            }
            emptyAction={
              activeFilters > 0
                ? { label: 'Clear filters', onPress: clear }
                : undefined
            }
          />
        )}
      </View>

      {!showSpinner ? <RefreshingFooter /> : null}

      <View style={styles.toolbar}>
        <Pressable
          testID="jobs-filter"
          style={styles.toolbarButton}
          onPress={() => setFilterVisible(true)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Icon name="filter-variant" size="sm" colour={t.colours.primary} />
          <Text style={styles.toolbarText} maxFontSizeMultiplier={1.5}>Filter</Text>
          {activeFilters > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilters}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable testID="jobs-refresh" style={styles.toolbarButton} onPress={refresh} accessibilityRole="button" hitSlop={8}>
          <Icon name="refresh" size="sm" colour={t.colours.primary} />
          <Text style={styles.toolbarText} maxFontSizeMultiplier={1.5}>Refresh</Text>
        </Pressable>
      </View>

      <OutboxToast />

      <JobFilterSheet
        visible={filterVisible}
        filters={filters}
        statuses={statuses}
        drivers={drivers}
        showDriverFilter={isDispatcher}
        onApply={(next) => {
          setFilters(next);
          setFilterVisible(false);
        }}
        onClear={() => {
          clear();
          setFilterVisible(false);
        }}
        onClose={() => setFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

function emptyTitle(scope: JobScope): string {
  if (scope === 'available') return 'No available jobs';
  if (scope === 'mine') return 'No jobs assigned to you';
  return 'No jobs yet';
}

function hintMessage(role: string, isDecentralized: boolean): string {
  if (role === 'driver' && isDecentralized) {
    return 'Available shows unclaimed jobs anyone can take. My Jobs is your work. Tap a job, then Claim job to take it.';
  }
  if (role === 'driver') {
    return 'Jobs your dispatcher assigns to you appear here automatically. Pull down to refresh.';
  }
  return 'Tap any job to assign a driver or update its status. Use Filter to narrow by status, driver, or date.';
}

function Tab({
  label,
  active,
  onPress,
  testID,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
  styles: ReturnType<typeof makeStyles>;
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    title: { ...TYPOGRAPHY.title, color: t.colours.text },
    tabs: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.xs },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: t.colours.primary },
    tabLabel: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    tabLabelActive: { color: t.colours.primary, fontWeight: '600' },
    listArea: { flex: 1 },
    skeletonContainer: { flex: 1 },
    syncError: { backgroundColor: t.colours.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
    syncErrorText: { ...TYPOGRAPHY.caption, color: t.colours.danger },
    toolbar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: t.colours.border,
      backgroundColor: t.colours.background,
    },
    toolbarButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      paddingVertical: SPACING.md,
    },
    toolbarText: { ...TYPOGRAPHY.body, color: t.colours.primary, fontWeight: '600' },
    badge: {
      minWidth: 20,
      paddingHorizontal: 6,
      height: 20,
      borderRadius: 10,
      backgroundColor: t.colours.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { ...TYPOGRAPHY.label, color: t.colours.onColour },
  });
