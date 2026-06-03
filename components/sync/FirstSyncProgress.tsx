/**
 * First-run sync progress with an escape hatch (spec §15 AC: Performance — "first-sync progress
 * + cancel"). Shown only while the local DB is still empty and the initial sync is in flight.
 *
 * The list pull (`GET /jobs`) has no meaningful percentage, so it shows an indeterminate spinner
 * plus a Cancel that aborts the request and drops the user to the (empty) list. Once the detail
 * phase begins (`progress` non-null), it reports determinate progress — "Downloading job details…
 * 42/120" — so a big-tenant first sync isn't a bare spinner. Cancel aborts either phase.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../shared/Button';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';
import type { DetailHydrationProgress } from '../../stores/connectivityStore';

interface FirstSyncProgressProps {
  onCancel: () => void;
  /** Determinate progress for the detail phase; null while the (indeterminate) list pull runs. */
  progress?: DetailHydrationProgress | null;
}

export function FirstSyncProgress({ onCancel, progress }: FirstSyncProgressProps) {
  const showDetail = progress != null && progress.total > 0;
  return (
    <View style={styles.container} testID="first-sync-progress">
      <ActivityIndicator size="large" color={COLOURS.primary} />
      <Text style={styles.title}>Setting up</Text>
      <Text style={styles.subtitle}>
        {showDetail
          ? `Downloading job details… ${progress!.done}/${progress!.total}`
          : 'Syncing your jobs for the first time…'}
      </Text>
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
