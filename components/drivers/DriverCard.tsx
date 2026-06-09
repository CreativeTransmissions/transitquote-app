/** Driver list row: name, contact, availability badge, and assigned-job count (spec §6.6). */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { makeCard, makeCardPressed, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';
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
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <Pressable
      testID={`driver-card-${driver.id}`}
      accessibilityRole="button"
      onPress={() => onPress(driver.id)}
      android_ripple={{ color: t.colours.surfaceAlt }}
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: { ...makeCard(t) },
    pressed: { ...makeCardPressed(t) },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    name: { ...TYPOGRAPHY.subheading, color: t.colours.text, flexShrink: 1 },
    badge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
    available: { backgroundColor: t.colours.successSurface },
    unavailable: { backgroundColor: t.colours.dangerSurface },
    badgeText: { ...TYPOGRAPHY.label, color: t.colours.text },
    contact: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
    meta: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
  });
