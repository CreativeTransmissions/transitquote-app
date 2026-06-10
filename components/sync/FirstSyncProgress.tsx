/**
 * First-run sync progress with an escape hatch (spec §15 AC: Performance — "first-sync progress
 * + cancel"). Shown only while the local DB is still empty and the initial sync is in flight.
 *
 * The list pull (`GET /jobs`) has no meaningful percentage, so it shows an indeterminate spinner
 * plus a Cancel that aborts the request and drops the user to the (empty) list. Once the detail
 * phase begins (`progress` non-null), it reports determinate progress — "Downloading job details…
 * 42/120" — so a big-tenant first sync isn't a bare spinner. Cancel aborts either phase.
 *
 * `compact` mode renders a slim header row (spinner + copy + cancel) intended to sit above
 * SkeletonJobCards (skeleton list view). When false/absent the legacy centred full-screen layout
 * is rendered (kept for back-compat with tests that don't render skeletons).
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../shared/Button';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import type { DetailHydrationProgress } from '../../stores/connectivityStore';

interface FirstSyncProgressProps {
  onCancel: () => void;
  /** Determinate progress for the detail phase; null while the (indeterminate) list pull runs. */
  progress?: DetailHydrationProgress | null;
  /**
   * Compact mode: renders a slim single-line header row (spinner + subtitle text + Cancel button)
   * intended to sit above SkeletonJobCards. When false/absent the full centred layout is rendered.
   */
  compact?: boolean;
}

export function FirstSyncProgress({ onCancel, progress, compact }: FirstSyncProgressProps) {
  const showDetail = progress != null && progress.total > 0;
  const t = useTheme();

  const subtitle = showDetail
    ? `Downloading job details… ${progress!.done}/${progress!.total}`
    : 'Syncing your jobs for the first time…';

  if (compact) {
    return (
      <View style={styles.compactRow} testID="first-sync-progress">
        <ActivityIndicator size="small" color={t.colours.primary} accessibilityLabel="Setting up" />
        <Text style={[styles.compactText, { color: t.colours.textMuted }]} numberOfLines={1}>
          {showDetail ? `Setting up — downloading job details… ${progress!.done}/${progress!.total}` : 'Setting up…'}
        </Text>
        <Button label="Cancel" variant="secondary" onPress={onCancel} testID="first-sync-cancel" />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="first-sync-progress">
      <ActivityIndicator size="large" color={t.colours.primary} accessibilityLabel="Setting up" />
      <Text style={[styles.title, { color: t.colours.text }]}>Setting up</Text>
      <Text style={[styles.subtitle, { color: t.colours.textMuted }]}>
        {subtitle}
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
  title: { ...TYPOGRAPHY.subheading, marginTop: SPACING.sm },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: SPACING.lg },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  compactText: { ...TYPOGRAPHY.caption, flex: 1 },
});
