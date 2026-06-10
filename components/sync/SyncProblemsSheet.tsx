/**
 * Slide-up sheet listing failed outbox items with a plain-language explanation of what
 * went wrong, the raw server/network error, and per-item Retry / Discard. Opened by tapping
 * the "failed" sync badge (SyncStatusIndicator). Uses SheetContainer for the shared modal chrome.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { SheetContainer } from '../shared/SheetContainer';
import { useOutbox } from '../../hooks/useOutbox';
import { useRetryOutboxItem, useDiscardOutboxItem } from '../../hooks/useOutboxActions';
import { jobsListQuery } from '../../database/queries/jobs';
import { describeOutboxAction, explainOutboxError } from '../../utils/outboxMessages';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

interface SyncProblemsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncProblemsSheet({ visible, onClose }: SyncProblemsSheetProps) {
  const { failed } = useOutbox();
  const retry = useRetryOutboxItem();
  const discard = useDiscardOutboxItem();
  const { data: jobs } = useLiveQuery(jobsListQuery());
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const refById = new Map(jobs.map((j) => [j.id, j.jobRef]));
  const busy = retry.isPending || discard.isPending;

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Sync problems" maxHeightPct={0.85}>
      <Text style={styles.subtitle}>
        {'These changes couldn\'t be saved to the server. Retry once you\'re back online, or discard to drop the change.'}
      </Text>

      {failed.length === 0 ? (
        <Text style={styles.empty} testID="sync-problems-empty">
          {'No remaining problems — you\'re all caught up.'}
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
                    accessibilityLabel={`Retry update for ${ref ?? `#${item.payload.id}`}`}
                  >
                    <Text style={styles.retry}>Retry</Text>
                  </Pressable>
                  <Pressable
                    testID={`sync-problem-discard-${item.id}`}
                    onPress={() => discard.mutate(item.id)}
                    disabled={busy}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Discard update for ${ref ?? `#${item.payload.id}`}`}
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
    </SheetContainer>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    subtitle: { ...TYPOGRAPHY.caption, color: t.colours.textMuted, marginBottom: SPACING.md },
    empty: { ...TYPOGRAPHY.body, color: t.colours.textMuted, paddingVertical: SPACING.lg },
    item: {
      backgroundColor: t.colours.dangerSurface,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      gap: SPACING.xs,
      marginBottom: SPACING.sm,
    },
    itemTitle: { ...TYPOGRAPHY.subheading, color: t.colours.text },
    itemJob: { ...TYPOGRAPHY.label, color: t.colours.textMuted },
    itemError: { ...TYPOGRAPHY.caption, color: t.colours.danger },
    itemRaw: { ...TYPOGRAPHY.label, color: t.colours.textMuted },
    itemActions: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.xs },
    retry: { ...TYPOGRAPHY.body, color: t.colours.primary, fontWeight: '600' },
    discard: { ...TYPOGRAPHY.body, color: t.colours.danger },
    closeBtn: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.xs },
    closeText: { ...TYPOGRAPHY.body, color: t.colours.primary, fontWeight: '600' },
  });
