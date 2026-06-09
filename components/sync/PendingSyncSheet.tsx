/**
 * Bottom sheet that explains what the pending-sync badge means (H-2). Opened by tapping the
 * "N pending" badge in SyncStatusIndicator. Lists each queued outbox item so the user can see
 * what's waiting, with plain-language reassurance that it will sync automatically.
 *
 * Mirrors SyncProblemsSheet's Modal chrome (plain RN Modal, no extra dependencies) — a follow-up
 * can unify both sheets via SheetContainer once agent B's shared component lands.
 */
import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useOutbox } from '../../hooks/useOutbox';
import { jobsListQuery } from '../../database/queries/jobs';
import { describeOutboxAction } from '../../utils/outboxMessages';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

interface PendingSyncSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function PendingSyncSheet({ visible, onClose }: PendingSyncSheetProps) {
  const { items } = useOutbox();
  const { data: jobs } = useLiveQuery(jobsListQuery());
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'in_progress');
  const refById = new Map(jobs.map((j) => [j.id, j.jobRef]));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: SPACING.lg + insets.bottom }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Waiting to sync</Text>
          <Text style={styles.body}>
            {'These changes are saved on your phone and will send automatically when you\'re back online. You don\'t need to do anything.'}
          </Text>

          {pending.length > 0 ? (
            <ScrollView style={styles.list} testID="pending-sync-list">
              {pending.map((item) => {
                const ref = refById.get(item.payload.id);
                return (
                  <View key={item.id} style={styles.item} testID={`pending-item-${item.id}`}>
                    <Text style={styles.itemAction}>{describeOutboxAction(item.actionType)}</Text>
                    <Text style={styles.itemJob}>Job {ref ?? `#${item.payload.id}`}</Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.empty} testID="pending-sync-empty">
              {"Nothing pending — you're all synced up."}
            </Text>
          )}

          <Pressable
            testID="pending-sync-close"
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.colours.background,
      borderTopLeftRadius: RADIUS.lg,
      borderTopRightRadius: RADIUS.lg,
      padding: SPACING.lg,
      maxHeight: '85%',
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colours.border,
      alignSelf: 'center',
      marginBottom: SPACING.md,
    },
    title: { ...TYPOGRAPHY.heading, color: t.colours.text },
    body: {
      ...TYPOGRAPHY.body,
      color: t.colours.textMuted,
      marginTop: SPACING.xs,
      marginBottom: SPACING.md,
    },
    list: { maxHeight: 260 },
    item: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colours.border,
    },
    itemAction: { ...TYPOGRAPHY.body, color: t.colours.text },
    itemJob: { ...TYPOGRAPHY.label, color: t.colours.textMuted },
    empty: { ...TYPOGRAPHY.body, color: t.colours.textMuted, paddingVertical: SPACING.lg },
    closeBtn: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.xs },
    closeText: { ...TYPOGRAPHY.body, color: t.colours.primary, fontWeight: '600' },
  });
