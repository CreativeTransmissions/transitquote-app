/**
 * Compact sync-status indicator for screen headers (spec §11.9):
 *  - syncing            → a subtle spinner
 *  - outbox pending     → a badge with the pending-action count
 *  - outbox failed      → a tappable warning badge (opens SyncProblemsSheet to explain why)
 * Online + synced + empty outbox → renders nothing (the default, quiet state).
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useConnectivityStore } from '../../stores/connectivityStore';
import { useOutbox } from '../../hooks/useOutbox';
import { SyncProblemsSheet } from './SyncProblemsSheet';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

export function SyncStatusIndicator() {
  const isSyncing = useConnectivityStore((s) => s.isSyncing);
  const detailHydration = useConnectivityStore((s) => s.detailHydration);
  const { pendingCount, failed } = useOutbox();
  const failedCount = failed.length;
  const [problemsVisible, setProblemsVisible] = useState(false);

  if (!isSyncing && pendingCount === 0 && failedCount === 0) return null;

  // While the background detail phase runs, surface its determinate progress next to the spinner.
  const showDetailProgress = isSyncing && detailHydration != null && detailHydration.total > 0;

  return (
    <View style={styles.row} testID="sync-status">
      {isSyncing ? <ActivityIndicator size="small" color={COLOURS.primary} /> : null}
      {showDetailProgress ? (
        <Text style={styles.detailProgress} testID="sync-detail-progress">
          {detailHydration!.done}/{detailHydration!.total}
        </Text>
      ) : null}
      {pendingCount > 0 ? (
        <View style={[styles.badge, styles.pending]} testID="sync-pending-badge">
          <Text style={styles.badgeText}>{pendingCount} pending</Text>
        </View>
      ) : null}
      {failedCount > 0 ? (
        <Pressable
          style={[styles.badge, styles.failed]}
          testID="sync-failed-badge"
          onPress={() => setProblemsVisible(true)}
          accessibilityRole="button"
          accessibilityHint="Show what went wrong"
        >
          <Text style={styles.badgeText}>{failedCount} failed</Text>
        </Pressable>
      ) : null}
      <SyncProblemsSheet visible={problemsVisible} onClose={() => setProblemsVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  detailProgress: { ...TYPOGRAPHY.label, color: COLOURS.textMuted },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  pending: { backgroundColor: COLOURS.warning },
  failed: { backgroundColor: COLOURS.danger },
  badgeText: { ...TYPOGRAPHY.label, color: COLOURS.background },
});
