/** Small status chip: coloured dot + status name. Colour resolved heuristically by name. */
import { StyleSheet, Text, View } from 'react-native';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { resolveStatusColour } from '../../utils/status';

interface JobStatusBadgeProps {
  statusName: string | null;
}

export function JobStatusBadge({ statusName }: JobStatusBadgeProps) {
  const colour = resolveStatusColour(statusName);
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: colour }]} />
      <Text style={styles.label}>{statusName ?? 'Unknown'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLOURS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { ...TYPOGRAPHY.label, color: COLOURS.text },
});
