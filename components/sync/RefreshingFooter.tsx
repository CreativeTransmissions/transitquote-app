/**
 * Slim, non-blocking "Refreshing" strip rendered below a list while a sync runs (issues #12/#21).
 * Unlike the RefreshControl spinner it never overlays the list, so the user can keep working.
 * Renders nothing when no sync is in flight. By default it follows the global jobs-sync state
 * (connectivityStore); screens with their own scoped pull (e.g. customers) pass `syncing` instead.
 */
import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useConnectivityStore } from '../../stores/connectivityStore';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

interface RefreshingFooterProps {
  /** Override for screens whose sync does not run through connectivityStore. */
  syncing?: boolean;
}

export function RefreshingFooter({ syncing }: RefreshingFooterProps) {
  const storeSyncing = useConnectivityStore((s) => s.isSyncing);
  const isSyncing = syncing ?? storeSyncing;
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  // accessibilityLiveRegion is Android-only; announce explicitly for iOS VoiceOver parity.
  useEffect(() => {
    if (isSyncing) AccessibilityInfo.announceForAccessibility('Refreshing');
  }, [isSyncing]);

  if (!isSyncing) return null;

  return (
    <View style={styles.bar} testID="refreshing-footer" accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={t.colours.primary} />
      <Text style={styles.text}>Refreshing…</Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      paddingVertical: SPACING.xs,
      // No top border: the toolbar below already draws a hairline, and a second one here
      // doubled the line while the strip was visible. The surface tint separates the list.
      backgroundColor: t.colours.surface,
    },
    text: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
  });
