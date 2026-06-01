/**
 * First-run sync progress with an escape hatch (spec §15 AC: Performance — "first-sync progress
 * + cancel"). Shown only while the local DB is still empty and the initial sync is in flight.
 *
 * The first sync is a single `GET /jobs`, so there's no meaningful percentage to report — this is
 * an informative indeterminate state plus a Cancel that aborts the request and drops the user to
 * the (empty) list, from which they can pull-to-refresh. Without it, a hung network traps the user
 * on a bare spinner with no way out.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../shared/Button';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';

interface FirstSyncProgressProps {
  onCancel: () => void;
}

export function FirstSyncProgress({ onCancel }: FirstSyncProgressProps) {
  return (
    <View style={styles.container} testID="first-sync-progress">
      <ActivityIndicator size="large" color={COLOURS.primary} />
      <Text style={styles.title}>Setting up</Text>
      <Text style={styles.subtitle}>Syncing your jobs for the first time…</Text>
      <View style={styles.action}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} testID="first-sync-cancel" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  title: { ...TYPOGRAPHY.subheading, color: COLOURS.text, marginTop: SPACING.sm },
  subtitle: { ...TYPOGRAPHY.body, color: COLOURS.textMuted, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: SPACING.lg },
});
