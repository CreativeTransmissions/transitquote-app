/** Persistent banner shown while offline: "Offline — showing data last updated X ago". */
import { StyleSheet, Text, View } from 'react-native';
import { useConnectivityStore } from '../../stores/connectivityStore';
import { relativeFromNow } from '../../utils/formatters';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';

export function OfflineBanner() {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const lastSyncedAt = useConnectivityStore((s) => s.lastSyncedAt);

  if (isOnline) return null;

  const updated = lastSyncedAt ? relativeFromNow(lastSyncedAt) : null;
  const message = updated ? `Offline — showing data from ${updated}` : 'Offline — showing saved data';

  return (
    <View style={styles.banner}>
      <Text style={styles.text} numberOfLines={1}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLOURS.offline,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  text: { ...TYPOGRAPHY.caption, color: COLOURS.background },
});
