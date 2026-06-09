/**
 * Job list row — redesigned per UI modernization spec §3.3.
 *
 * Layout:
 *   Row 1: job ref (subheading) + JobStatusBadge right-aligned
 *   Row 2: customer name (body)
 *   Row 3: map-marker-outline icon + pickup address (caption, 2 lines)
 *   Row 4: clock-outline icon + pickup time/ASAP; when showDriver: account-outline + driver name
 *   Hairline divider
 *   Meta row: service · vehicle (caption/muted) + right-aligned payment badge
 *   Sync state row (when pending/failed): icon + text
 *
 * Status left border: overrides the CARD preset's borderLeftColor with the resolved status colour.
 * Lookup maps (serviceNames, vehicleNames, paymentStatusNames) injected from JobList — no hooks
 * or DB access inside this component.
 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JobStatusBadge } from './JobStatusBadge';
import { Icon } from '../shared/Icon';
import { CARD, CARD_PRESSED, COLOURS, SPACING, TYPOGRAPHY } from '../../constants';
import { nameSurnameFirst } from '../../utils/formatters';
import { resolveStatusColour } from '../../utils/statusColours';
import { useDateFormat } from '../../hooks/useDateFormat';
import type { JobRow } from '../../database/schema';
import type { JobOutboxState } from '../../hooks/useOutbox';

interface JobCardProps {
  job: JobRow;
  showDriver?: boolean;
  outboxState?: JobOutboxState;
  onPress: (id: number) => void;
  serviceNames?: Record<number, string>;
  vehicleNames?: Record<number, string>;
  paymentStatusNames?: Record<number, string>;
}

/**
 * Resolve whether a payment status name counts as "paid":
 * name contains 'paid' but NOT 'un' or 'not' anywhere before it — e.g. "Paid" → paid,
 * "Unpaid" → not paid, "Not paid" → not paid, "Partially paid" → paid (intentional).
 */
function isPaymentPaid(name: string): boolean {
  const lower = name.toLowerCase();
  const paidIdx = lower.indexOf('paid');
  if (paidIdx === -1) return false;
  const prefix = lower.slice(0, paidIdx);
  return !prefix.includes('un') && !prefix.includes('not');
}

function PaymentBadge({ name }: { name: string }) {
  const paid = isPaymentPaid(name);
  const bgColour = paid ? COLOURS.successSurface : `${COLOURS.warning}1F`;
  const textColour = paid ? COLOURS.statusDone : COLOURS.warning;
  return (
    <View style={[styles.chip, { backgroundColor: bgColour }]}>
      <Text style={[styles.chipText, { color: textColour }]} maxFontSizeMultiplier={1.5}>
        {name}
      </Text>
    </View>
  );
}

function JobCardInner({
  job,
  showDriver = false,
  outboxState,
  onPress,
  serviceNames = {},
  vehicleNames = {},
  paymentStatusNames = {},
}: JobCardProps) {
  const { formatDateTimeSmart } = useDateFormat();

  const customerName = nameSurnameFirst(job.customerFirstName, job.customerLastName);
  const pickup = job.pickupIsAsap ? 'ASAP' : formatDateTimeSmart(job.pickupDatetime);

  const serviceName = job.serviceId != null ? serviceNames[job.serviceId] : undefined;
  const vehicleName = job.vehicleId != null ? vehicleNames[job.vehicleId] : undefined;
  const paymentStatusName =
    job.paymentStatusId != null ? paymentStatusNames[job.paymentStatusId] : undefined;

  const statusColour = resolveStatusColour(job.statusName, job.statusTypeId != null ? String(job.statusTypeId) : undefined);
  const metaParts = [serviceName, vehicleName].filter(Boolean).join(' · ');

  return (
    <Pressable
      testID={`job-card-${job.id}`}
      accessibilityRole="button"
      onPress={() => onPress(job.id)}
      android_ripple={{ color: COLOURS.surfaceAlt }}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: statusColour },
        pressed && styles.pressed,
      ]}
    >
      {/* Row 1: job ref + status badge */}
      <View style={styles.headerRow}>
        <Text style={styles.ref} numberOfLines={1}>
          {job.jobRef}
        </Text>
        <JobStatusBadge statusName={job.statusName} statusTypeId={job.statusTypeId} />
      </View>

      {/* Row 2: customer name */}
      {customerName ? (
        <Text testID={`job-customer-${job.id}`} style={styles.customer}>
          {customerName}
        </Text>
      ) : null}

      {/* Row 3: pickup address */}
      {job.pickupAddress ? (
        <View style={styles.iconRow}>
          <Icon name="map-marker-outline" size="sm" colour={COLOURS.textMuted} />
          <Text
            testID={`job-pickup-address-${job.id}`}
            style={styles.iconRowText}
            numberOfLines={2}
          >
            {job.pickupAddress}
          </Text>
        </View>
      ) : null}

      {/* Row 4: pickup time + optional driver */}
      {(pickup || showDriver) ? (
        <View style={styles.timeDriverRow}>
          {pickup ? (
            <View style={styles.iconRow}>
              <Icon name="clock-outline" size="sm" colour={COLOURS.textMuted} />
              <Text testID={`job-pickup-time-${job.id}`} style={styles.iconRowText} maxFontSizeMultiplier={1.5}>
                {pickup}
              </Text>
            </View>
          ) : null}
          {showDriver ? (
            <View style={styles.iconRow}>
              <Icon name="account-outline" size="sm" colour={COLOURS.textMuted} />
              <Text
                style={[styles.iconRowText, !job.driverName && styles.unassigned]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.5}
              >
                {job.driverName ?? 'Unassigned'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Hairline divider */}
      <View style={styles.divider} />

      {/* Meta row: service · vehicle + payment badge */}
      <View style={styles.metaRow}>
        {metaParts ? (
          <Text style={styles.metaText} numberOfLines={1} maxFontSizeMultiplier={1.5}>
            {metaParts}
          </Text>
        ) : (
          <View />
        )}
        {paymentStatusName ? <PaymentBadge name={paymentStatusName} /> : null}
      </View>

      {/* Sync state */}
      {outboxState ? (
        <View style={styles.syncRow}>
          {outboxState === 'failed' ? (
            <>
              <Icon name="alert-circle" size="sm" colour={COLOURS.danger} />
              <Text style={[styles.syncText, styles.syncFailed]}>Update failed</Text>
            </>
          ) : (
            <>
              <Icon name="clock-outline" size="sm" colour={COLOURS.warning} />
              <Text style={[styles.syncText, styles.syncPending]}>Pending sync</Text>
            </>
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

export const JobCard = memo(JobCardInner);

const styles = StyleSheet.create({
  card: { ...CARD },
  pressed: { ...CARD_PRESSED, transform: [{ scale: 0.99 }] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  ref: { ...TYPOGRAPHY.subheading, color: COLOURS.text },
  customer: { ...TYPOGRAPHY.body, color: COLOURS.text },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs, flexShrink: 1 },
  iconRowText: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted, flexShrink: 1 },
  timeDriverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  unassigned: { color: COLOURS.warning },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLOURS.border },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  metaText: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted, flexShrink: 1 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  chipText: { ...TYPOGRAPHY.label },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  syncText: { ...TYPOGRAPHY.label },
  syncPending: { color: COLOURS.warning },
  syncFailed: { color: COLOURS.danger },
});
