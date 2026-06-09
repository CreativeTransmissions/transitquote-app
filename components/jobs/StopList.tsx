/**
 * Ordered list of a job's stops (spec §6.5 B). Presentational only — each stop row is tappable to
 * open that location in the native maps app via the `onOpenStop` callback the screen provides, and
 * a stop's contact phone is tappable to dial via `onCallStop` (the screen owns the `tel:` link).
 *
 * Per-stop contact (US-016) IS in the wire shape — `contact_name`/`contact_phone` were added
 * server-side (re-verified live 2026-06-02; see docs/API_NOTES.md §11). They may be `""` for a
 * given stop, in which case the contact line / call affordance is hidden.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../shared/Icon';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';
import { useDateFormat } from '../../hooks/useDateFormat';
import type { Stop } from '../../types/api';

interface StopListProps {
  stops: Stop[];
  onOpenStop?: (stop: Stop) => void;
  onCallStop?: (stop: Stop) => void;
}

export function StopList({ stops, onOpenStop, onCallStop }: StopListProps) {
  const { formatDateTimeSmart } = useDateFormat();
  return (
    <View>
      {stops.map((stop, index) => {
        const scheduled = formatDateTimeSmart(stop.collection_date);
        const contactName = stop.contact_name?.trim();
        const contactPhone = stop.contact_phone?.trim();
        const note = stop.note?.trim();
        const canCall = !!contactPhone && !!onCallStop;
        return (
          <Pressable
            key={stop.id ?? index}
            testID={`stop-${index}`}
            accessibilityRole="button"
            accessibilityLabel={
              onOpenStop
                ? `Open stop ${index + 1}, ${stop.address || 'unknown address'}, in Maps`
                : undefined
            }
            onPress={() => onOpenStop?.(stop)}
            style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
          >
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.type}>{stop.visit_type || `Stop ${index + 1}`}</Text>
              <Text style={styles.address}>{stop.address || '—'}</Text>
              {contactName || contactPhone ? (
                canCall ? (
                  <Pressable
                    testID={`stop-${index}-call`}
                    accessibilityRole="link"
                    accessibilityLabel={`Call ${[contactName, contactPhone].filter(Boolean).join(' ')}`}
                    onPress={() => onCallStop?.(stop)}
                    hitSlop={6}
                    style={styles.contactRow}
                  >
                    <Icon name="phone-outline" size="sm" colour={COLOURS.primary} />
                    <Text style={styles.contactLink}>
                      {[contactName, contactPhone].filter(Boolean).join(' · ')}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.contactRow}>
                    <Icon name="phone-outline" size="sm" colour={COLOURS.textMuted} />
                    <Text style={styles.contact}>{[contactName, contactPhone].filter(Boolean).join(' · ')}</Text>
                  </View>
                )
              ) : null}
              {note ? <Text style={styles.note}>{note}</Text> : null}
              {scheduled ? <Text style={styles.meta}>{scheduled}</Text> : null}
            </View>
            {onOpenStop ? <Icon name="chevron-right" size="md" colour={COLOURS.textMuted} /> : null}
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
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contact: { ...TYPOGRAPHY.caption, color: COLOURS.text },
  contactLink: { ...TYPOGRAPHY.caption, color: COLOURS.primary },
  note: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted, fontStyle: 'italic' },
  meta: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
});
