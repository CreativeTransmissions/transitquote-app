/**
 * Ordered list of a job's stops (spec §6.5 B). Presentational only — each stop is tappable to
 * open that location in the native maps app via the `onOpenStop` callback the screen provides.
 *
 * NOTE: the live API's stop payload carries address + visit type + scheduled date, but NOT a
 * per-stop contact name/phone (US-016) — that field isn't in the wire shape. See BACKLOG.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';
import { formatDateTime } from '../../utils/formatters';
import type { Stop } from '../../types/api';

interface StopListProps {
  stops: Stop[];
  onOpenStop?: (stop: Stop) => void;
}

export function StopList({ stops, onOpenStop }: StopListProps) {
  return (
    <View>
      {stops.map((stop, index) => {
        const scheduled = formatDateTime(stop.collection_date);
        return (
          <Pressable
            key={stop.id ?? index}
            testID={`stop-${index}`}
            accessibilityRole="button"
            onPress={() => onOpenStop?.(stop)}
            style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
          >
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.type}>{stop.visit_type || `Stop ${index + 1}`}</Text>
              <Text style={styles.address}>{stop.address || '—'}</Text>
              {scheduled ? <Text style={styles.meta}>{scheduled}</Text> : null}
            </View>
            {onOpenStop ? <Text style={styles.chevron}>›</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stop: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm, gap: SPACING.sm },
  pressed: { opacity: 0.6 },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLOURS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { ...TYPOGRAPHY.label, color: COLOURS.background },
  body: { flex: 1, gap: 2 },
  type: { ...TYPOGRAPHY.label, color: COLOURS.primary, textTransform: 'capitalize' },
  address: { ...TYPOGRAPHY.body, color: COLOURS.text },
  meta: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
  chevron: { ...TYPOGRAPHY.subheading, color: COLOURS.textMuted },
});
