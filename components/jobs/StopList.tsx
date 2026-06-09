/**
 * Ordered list of a job's stops (spec §6.5 B). Presentational only — each stop row is tappable to
 * open that location in the native maps app via the `onOpenStop` callback the screen provides, and
 * a stop's contact phone is tappable to dial via `onCallStop` (the screen owns the `tel:` link).
 *
 * Per-stop contact (US-016) IS in the wire shape — `contact_name`/`contact_phone` were added
 * server-side (re-verified live 2026-06-02; see docs/API_NOTES.md §11). They may be `""` for a
 * given stop, in which case the contact line / call affordance is hidden.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../shared/Icon';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useTheme, type Theme } from '../../hooks/useTheme';
import type { Stop } from '../../types/api';

interface StopListProps {
  stops: Stop[];
  onOpenStop?: (stop: Stop) => void;
  onCallStop?: (stop: Stop) => void;
}

export function StopList({ stops, onOpenStop, onCallStop }: StopListProps) {
  const { formatDateTimeSmart } = useDateFormat();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View>
      {stops.map((stop, index) => {
        const scheduled = formatDateTimeSmart(stop.collection_date);
        const contactName = stop.contact_name?.trim();
        const contactPhone = stop.contact_phone?.trim();
        const note = stop.note?.trim();
        const canCall = !!contactPhone && !!onCallStop;
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;
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
            {/* Vertical timeline rail: a dot per stop joined by a connecting line. */}
            <View style={styles.timeline}>
              <View testID={`stop-${index}-dot`} style={[styles.dot, isFirst ? styles.dotFirst : styles.dotRest]} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.body}>
              <View style={styles.headerRow}>
                <Text style={styles.type}>{stop.visit_type || `Stop ${index + 1}`}</Text>
                {scheduled ? <Text style={styles.scheduled}>{scheduled}</Text> : null}
              </View>
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
                    <Icon name="phone-outline" size="sm" colour={t.colours.primary} />
                    <Text style={styles.contactLink}>
                      {[contactName, contactPhone].filter(Boolean).join(' · ')}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.contactRow}>
                    <Icon name="phone-outline" size="sm" colour={t.colours.textMuted} />
                    <Text style={styles.contact}>{[contactName, contactPhone].filter(Boolean).join(' · ')}</Text>
                  </View>
                )
              ) : null}
              {note ? <Text style={styles.note}>{note}</Text> : null}
            </View>
            {onOpenStop ? <Icon name="chevron-right" size="md" colour={t.colours.textMuted} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    stop: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm, gap: SPACING.sm },
    pressed: { opacity: 0.6 },
    // Timeline rail: dot sits at the top of the row; the line fills the rest of the row height
    // (absolute) so it visually connects to the next stop's dot.
    timeline: { width: 12, alignItems: 'center', alignSelf: 'stretch', paddingTop: 4 },
    dot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
    dotFirst: { backgroundColor: t.colours.statusActive },
    dotRest: { backgroundColor: t.colours.textMuted },
    line: { position: 'absolute', top: 12, bottom: -SPACING.sm, width: 2, backgroundColor: t.colours.border },
    body: { flex: 1, gap: 2 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    type: { ...TYPOGRAPHY.label, color: t.colours.primary, textTransform: 'capitalize', flexShrink: 1 },
    scheduled: { ...TYPOGRAPHY.caption, color: t.colours.textMuted, textAlign: 'right' },
    address: { ...TYPOGRAPHY.body, color: t.colours.text },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    contact: { ...TYPOGRAPHY.caption, color: t.colours.text },
    contactLink: { ...TYPOGRAPHY.caption, color: t.colours.primary },
    note: { ...TYPOGRAPHY.caption, color: t.colours.textMuted, fontStyle: 'italic' },
  });
