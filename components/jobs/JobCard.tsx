/** Job list row: reference, customer (surname first), pickup time + address, driver, sync state. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JobStatusBadge } from './JobStatusBadge';
import { CARD, CARD_PRESSED, COLOURS, SPACING, TYPOGRAPHY } from '../../constants';
import { nameSurnameFirst } from '../../utils/formatters';
import { useDateFormat } from '../../hooks/useDateFormat';
import type { JobRow } from '../../database/schema';
import type { JobOutboxState } from '../../hooks/useOutbox';

interface JobCardProps {
  job: JobRow;
  showDriver?: boolean;
  outboxState?: JobOutboxState;
  onPress: (id: number) => void;
}

export function JobCard({ job, showDriver = false, outboxState, onPress }: JobCardProps) {
  const { formatDateTimeSmart } = useDateFormat();
  const customerName = nameSurnameFirst(job.customerFirstName, job.customerLastName);
  // Pickup time resolved server-side: "ASAP" bookings have no datetime (see docs/API_NOTES.md §7).
  // Date-only bookings (no time captured) render as just the date, not a spurious "12:00 am".
  const pickup = job.pickupIsAsap ? 'ASAP' : formatDateTimeSmart(job.pickupDatetime);

  return (
    <Pressable
      testID={`job-card-${job.id}`}
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

      {customerName ? (
        <Text testID={`job-customer-${job.id}`} style={styles.customer}>
          {customerName}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {pickup ? (
          <Text testID={`job-pickup-time-${job.id}`} style={styles.meta}>
            {pickup}
          </Text>
        ) : null}
        {showDriver ? (
          <Text style={styles.meta} numberOfLines={1}>
            {job.driverName ?? 'Unassigned'}
          </Text>
        ) : null}
      </View>

      {job.pickupAddress ? (
        <Text testID={`job-pickup-address-${job.id}`} style={styles.address} numberOfLines={1}>
          {job.pickupAddress}
        </Text>
      ) : null}

      {outboxState ? (
        <Text style={[styles.sync, outboxState === 'failed' ? styles.syncFailed : styles.syncPending]}>
          {outboxState === 'failed' ? '⚠ Update failed' : '↻ Pending sync'}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...CARD },
  pressed: { ...CARD_PRESSED, transform: [{ scale: 0.99 }] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  ref: { ...TYPOGRAPHY.subheading, color: COLOURS.text, flexShrink: 1 },
  customer: { ...TYPOGRAPHY.body, color: COLOURS.text },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  meta: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted, flexShrink: 1 },
  address: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
  sync: { ...TYPOGRAPHY.label },
  syncPending: { color: COLOURS.warning },
  syncFailed: { color: COLOURS.danger },
});
