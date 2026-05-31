/** Driver list row: name, contact, availability badge, and assigned-job count (spec §6.6). */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { fullName } from '../../utils/formatters';
import type { DriverRow } from '../../database/schema';

interface DriverCardProps {
  driver: DriverRow;
  jobCount: number;
  onPress: (id: number) => void;
}

export function DriverCard({ driver, jobCount, onPress }: DriverCardProps) {
  const name = fullName(driver.firstName, driver.lastName) || `Driver ${driver.id}`;
  const contact = [driver.email, driver.phone].filter(Boolean).join(' · ');

  return (
    <Pressable
      testID={`driver-card-${driver.id}`}
      accessibilityRole="button"
      onPress={() => onPress(driver.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.badge, driver.available ? styles.available : styles.unavailable]}>
          <Text style={styles.badgeText}>{driver.available ? 'Available' : 'Unavailable'}</Text>
        </View>
      </View>
      {contact ? (
        <Text style={styles.contact} numberOfLines={1}>
          {contact}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {jobCount} assigned {jobCount === 1 ? 'job' : 'jobs'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLOURS.background,
    borderWidth: 1,
    borderColor: COLOURS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  pressed: { backgroundColor: COLOURS.surface },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  name: { ...TYPOGRAPHY.subheading, color: COLOURS.text, flexShrink: 1 },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  available: { backgroundColor: '#E6F4EA' },
  unavailable: { backgroundColor: '#FDECEA' },
  badgeText: { ...TYPOGRAPHY.label, color: COLOURS.text },
  contact: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
  meta: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
});
