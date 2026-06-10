/** Persistent banner shown while offline: "Offline — showing data last updated X ago". */
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useConnectivityStore } from '../../stores/connectivityStore';
import { relativeFromNow } from '../../utils/formatters';
import { Icon } from '../shared/Icon';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme } from '../../hooks/useTheme';

export function OfflineBanner() {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const lastSyncedAt = useConnectivityStore((s) => s.lastSyncedAt);
  const t = useTheme();

  // A11y-4: announce to screen reader when the banner appears.
  useEffect(() => {
    if (!isOnline) {
      AccessibilityInfo.announceForAccessibility("You're offline — showing saved data");
    }
  }, [isOnline]);

  if (isOnline) return null;

  const updated = lastSyncedAt ? relativeFromNow(lastSyncedAt) : null;
  const message = updated ? `Offline — showing data from ${updated}` : 'Offline — showing saved data';

  return (
    <View
      // The banner is an intentionally-coloured grey surface in both schemes, so its foreground
      // stays white (onColour token) regardless of theme — verified to pass on both banner greys.
      style={[styles.banner, { backgroundColor: t.colours.offline }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon name="cloud-off-outline" size="sm" colour={t.colours.onColour} />
      <Text style={[styles.text, { color: t.colours.onColour }]} numberOfLines={1}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  text: { ...TYPOGRAPHY.caption },
});
