/**
 * Slide-up sheet listing failed outbox items with a plain-language explanation of what
 * went wrong, the raw server/network error, and per-item Retry / Discard. Opened by tapping
 * the "failed" sync badge (SyncStatusIndicator). Reuses the JobFilterSheet modal pattern.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useOutbox } from '../../hooks/useOutbox';
import { useRetryOutboxItem, useDiscardOutboxItem } from '../../hooks/useOutboxActions';
import { jobsListQuery } from '../../database/queries/jobs';
import { describeOutboxAction, explainOutboxError } from '../../utils/outboxMessages';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

interface SyncProblemsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncProblemsSheet({ visible, onClose }: SyncProblemsSheetProps) {
  const { failed } = useOutbox();
  const retry = useRetryOutboxItem();
  const discard = useDiscardOutboxItem();
  const { data: jobs } = useLiveQuery(jobsListQuery());
  const insets = useSafeAreaInsets();

  const refById = new Map(jobs.map((j) => [j.id, j.jobRef]));
  const busy = retry.isPending || discard.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: SPACING.lg + insets.bottom }]}>
          <Text style={styles.title}>Sync problems</Text>
          <Text style={styles.subtitle}>
            These changes couldn’t be saved to the server. Retry once you’re back online, or discard to drop the change.
          </Text>

          {failed.length === 0 ? (
            <Text style={styles.empty} testID="sync-problems-empty">
              No remaining problems — you’re all caught up.
            </Text>
          ) : (
            <ScrollView>
              {failed.map((item) => {
                const ref = refById.get(item.payload.id);
                const explanation = explainOutboxError(item.lastError);
                const showRaw = item.lastError != null && item.lastError !== explanation;
                return (
                  <View key={item.id} style={styles.item} testID={`sync-problem-${item.id}`}>
                    <Text style={styles.itemTitle}>{describeOutboxAction(item.actionType)}</Text>
                    <Text style={styles.itemJob}>Job {ref ?? `#${item.payload.id}`}</Text>
                    <Text style={styles.itemError}>{explanation}</Text>
                    {showRaw ? <Text style={styles.itemRaw}>Details: {item.lastError}</Text> : null}
                    <View style={styles.itemActions}>
                      <Pressable
                        testID={`sync-problem-retry-${item.id}`}
                        onPress={() => retry.mutate(item.id)}
                        disabled={busy}
                        hitSlop={6}
                        accessibilityRole="button"
                      >
                        <Text style={styles.retry}>Retry</Text>
                      </Pressable>
                      <Pressable
                        testID={`sync-problem-discard-${item.id}`}
                        onPress={() => discard.mutate(item.id)}
                        disabled={busy}
                        hitSlop={6}
                        accessibilityRole="button"
                      >
                        <Text style={styles.discard}>Discard</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable testID="sync-problems-close" onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLOURS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  title: { ...TYPOGRAPHY.heading, color: COLOURS.text },
  subtitle: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted, marginTop: SPACING.xs, marginBottom: SPACING.md },
  empty: { ...TYPOGRAPHY.body, color: COLOURS.textMuted, paddingVertical: SPACING.lg },
  item: {
    backgroundColor: '#FDECEA',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  itemTitle: { ...TYPOGRAPHY.subheading, color: COLOURS.text },
  itemJob: { ...TYPOGRAPHY.label, color: COLOURS.textMuted },
  itemError: { ...TYPOGRAPHY.caption, color: COLOURS.danger },
  itemRaw: { ...TYPOGRAPHY.label, color: COLOURS.textMuted },
  itemActions: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.xs },
  retry: { ...TYPOGRAPHY.body, color: COLOURS.primary, fontWeight: '600' },
  discard: { ...TYPOGRAPHY.body, color: COLOURS.danger },
  closeBtn: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.xs },
  closeText: { ...TYPOGRAPHY.body, color: COLOURS.primary, fontWeight: '600' },
});
