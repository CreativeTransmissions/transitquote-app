/**
 * Compact sync-status indicator for screen headers (spec §11.9):
 *  - syncing            → a subtle spinner
 *  - outbox pending     → a badge with the pending-action count
 *  - outbox failed      → a tappable warning badge (opens SyncProblemsSheet to explain why)
 * Online + synced + empty outbox → renders nothing (the default, quiet state).
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useConnectivityStore } from '../../stores/connectivityStore';
import { useOutbox } from '../../hooks/useOutbox';
import { SyncProblemsSheet } from './SyncProblemsSheet';
import { PendingSyncSheet } from './PendingSyncSheet';
import { Icon } from '../shared/Icon';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

export function SyncStatusIndicator() {
  const isSyncing = useConnectivityStore((s) => s.isSyncing);
  const detailHydration = useConnectivityStore((s) => s.detailHydration);
  const { pendingCount, failed } = useOutbox();
  const failedCount = failed.length;
  const [problemsVisible, setProblemsVisible] = useState(false);
  const [pendingVisible, setPendingVisible] = useState(false);
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  if (!isSyncing && pendingCount === 0 && failedCount === 0) return null;

  // While the background detail phase runs, surface its determinate progress next to the spinner.
  const showDetailProgress = isSyncing && detailHydration != null && detailHydration.total > 0;

  const spinnerLabel = showDetailProgress
    ? `Downloading job details, ${detailHydration!.done} of ${detailHydration!.total}`
    : 'Syncing';

  return (
    <View style={styles.row} testID="sync-status">
      {isSyncing ? (
        <ActivityIndicator
          size="small"
          color={t.colours.primary}
          accessibilityLabel={spinnerLabel}
        />
      ) : null}
      {showDetailProgress ? (
        <Text style={styles.detailProgress} testID="sync-detail-progress">
          {detailHydration!.done}/{detailHydration!.total}
        </Text>
      ) : null}
      {pendingCount > 0 ? (
        <Pressable
          style={[styles.badge, styles.pending]}
          testID="sync-pending-badge"
          onPress={() => setPendingVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`${pendingCount} updates waiting to sync, double-tap to learn more`}
        >
          <Icon name="clock-outline" size="sm" colour={t.colours.onColour} />
          <Text style={styles.badgeText}>{pendingCount} pending</Text>
        </Pressable>
      ) : null}
      {failedCount > 0 ? (
        <Pressable
          style={[styles.badge, styles.failed]}
          testID="sync-failed-badge"
          onPress={() => setProblemsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`${failedCount} updates failed`}
          accessibilityHint="Show what went wrong"
        >
          <Icon name="alert-circle" size="sm" colour={t.colours.onColour} />
          <Text style={styles.badgeText}>{failedCount} failed</Text>
        </Pressable>
      ) : null}
      <SyncProblemsSheet visible={problemsVisible} onClose={() => setProblemsVisible(false)} />
      <PendingSyncSheet visible={pendingVisible} onClose={() => setPendingVisible(false)} />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    detailProgress: { ...TYPOGRAPHY.label, color: t.colours.textMuted },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: RADIUS.sm,
    },
    pending: { backgroundColor: t.colours.warning },
    failed: { backgroundColor: t.colours.danger },
    badgeText: { ...TYPOGRAPHY.label, color: t.colours.onColour },
  });
