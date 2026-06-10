/** Tinted status chip: coloured dot + status name. Background = status colour at 12% opacity. */
import { StyleSheet, Text, View } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { resolveStatusColour } from '../../utils/statusColours';
import { useTheme } from '../../hooks/useTheme';

interface JobStatusBadgeProps {
  statusName: string | null;
  statusTypeId?: number | null;
}

export function JobStatusBadge({ statusName, statusTypeId }: JobStatusBadgeProps) {
  const t = useTheme();
  const colour = resolveStatusColour(
    statusName,
    statusTypeId != null ? String(statusTypeId) : undefined,
    t.colours,
  );
  // 12% opacity = 0x1F in hex (≈ 31/255 ≈ 0.122). Full-strength text on the tint reads in both schemes.
  const bgColour = `${colour}1F`;
  return (
    <View style={[styles.badge, { backgroundColor: bgColour }]}>
      <View style={[styles.dot, { backgroundColor: colour }]} />
      <Text style={[styles.label, { color: colour }]} maxFontSizeMultiplier={1.5}>
        {statusName ?? 'Unknown'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { ...TYPOGRAPHY.label },
});
