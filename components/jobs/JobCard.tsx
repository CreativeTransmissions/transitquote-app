/** Job list row: reference, customer, status, scheduled time, and (optionally) the driver. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JobStatusBadge } from './JobStatusBadge';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { formatDateTime } from '../../utils/formatters';
import type { JobRow } from '../../database/schema';

interface JobCardProps {
  job: JobRow;
  showDriver?: boolean;
  onPress: (id: number) => void;
}

export function JobCard({ job, showDriver = false, onPress }: JobCardProps) {
  const scheduled = formatDateTime(job.deliveryTime);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(job.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.ref} numberOfLines={1}>
          {job.jobRef}
        </Text>
        <JobStatusBadge statusName={job.statusName} />
      </View>

      {job.customerLastName ? <Text style={styles.customer}>{job.customerLastName}</Text> : null}

      <View style={styles.metaRow}>
        {scheduled ? <Text style={styles.meta}>{scheduled}</Text> : null}
        {showDriver ? (
          <Text style={styles.meta} numberOfLines={1}>
            {job.driverName ?? 'Unassigned'}
          </Text>
        ) : null}
      </View>
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
  ref: { ...TYPOGRAPHY.subheading, color: COLOURS.text, flexShrink: 1 },
  customer: { ...TYPOGRAPHY.body, color: COLOURS.text },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  meta: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted, flexShrink: 1 },
});
