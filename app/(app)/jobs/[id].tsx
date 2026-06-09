import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AccessibilityInfo, ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobStatusBadge } from '../../../components/jobs/JobStatusBadge';
import { StatusPicker } from '../../../components/jobs/StatusPicker';
import { DriverPicker } from '../../../components/jobs/DriverPicker';
import { StopList } from '../../../components/jobs/StopList';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Button } from '../../../components/shared/Button';
import { Icon, type IconName } from '../../../components/shared/Icon';
import { useJobDetail } from '../../../hooks/useJobDetail';
import { useTeamSettings } from '../../../hooks/useTeamSettings';
import { useStatusTypes, type StatusType } from '../../../hooks/useStatusTypes';
import { useUpdateJobStatus } from '../../../hooks/useUpdateJobStatus';
import { useAssignDriver } from '../../../hooks/useAssignDriver';
import { useAssignableDrivers } from '../../../hooks/useDrivers';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useRole } from '../../../hooks/useRole';
import { useOutbox } from '../../../hooks/useOutbox';
import { useRetryOutboxItem, useDiscardOutboxItem } from '../../../hooks/useOutboxActions';
import { fullName, formatCurrency } from '../../../utils/formatters';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { toFloat } from '../../../utils/coerce';
import { mailtoUrl, mapsDirectionsUrl, telUrl } from '../../../utils/links';
import { openLink } from '../../../utils/openLink';
import { hapticSuccess, hapticError } from '../../../utils/haptics';
import { useJobCardLookups } from '../../../hooks/useJobCardLookups';
import { useTheme, type Theme } from '../../../hooks/useTheme';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { DriverRow } from '../../../database/schema';
import type { Stop } from '../../../types/api';

async function openUrl(url: string | null): Promise<void> {
  if (!url) return;
  const opened = await openLink(url);
  if (!opened) Alert.alert('Unable to open', 'No app available to handle this link.');
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = Number(id);
  const { job, detail, isHydrating, error, isOnline } = useJobDetail(jobId);
  const settings = useTeamSettings();
  const { formatDateTimeSmart, formatDateTime } = useDateFormat();
  const statuses = useStatusTypes();
  const update = useUpdateJobStatus();
  const assign = useAssignDriver();
  const { drivers: assignableDrivers, canAssign } = useAssignableDrivers();
  const currentUser = useCurrentUser();
  const { isDriver, isDispatcher, isDecentralized, driverId } = useRole();
  const { failed } = useOutbox();
  const retry = useRetryOutboxItem();
  const discard = useDiscardOutboxItem();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [driverPickerVisible, setDriverPickerVisible] = useState(false);
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { serviceNames, vehicleNames } = useJobCardLookups();

  const currency = settings?.currencySymbol ?? '';
  const failedItem = failed.find((item) => item.payload.id === jobId);
  // Dispatchers always manage assignment; decentralized drivers manage their own pool.
  const showAssignment = isDispatcher || (isDriver && isDecentralized);
  const isUnassigned = job?.driverId == null;
  const canClaim = isDriver && isDecentralized && isUnassigned && driverId != null;
  const mutating = update.isPending || assign.isPending;
  const statusDisabled = statuses.length === 0 || mutating;
  // The bottom-bar primary action is assignment when the job is unassigned and this user
  // can place an assignment (dispatcher with a target, or a decentralized driver who can claim).
  const assignIsPrimary = isUnassigned && (canClaim || (showAssignment && canAssign));

  // Service / vehicle names from the small reference tables (cheap live-query maps).
  const serviceName = job?.serviceId != null ? serviceNames[job.serviceId] : undefined;
  const vehicleName = job?.vehicleId != null ? vehicleNames[job.vehicleId] : undefined;
  const serviceVehicleLine = [serviceName, vehicleName].filter(Boolean).join(' · ');

  // Fire success haptic + announcement once a confirmed status change or assignment
  // is queued (the optimistic local write succeeded). Track by status name / driver id
  // so we react to the transition, not every render.
  const lastStatusRef = useRef(job?.statusName);
  const lastDriverRef = useRef(job?.driverId);
  useEffect(() => {
    if (!job) return;
    if (lastStatusRef.current !== undefined && lastStatusRef.current !== job.statusName) {
      void hapticSuccess();
      AccessibilityInfo.announceForAccessibility(`Status updated to ${job.statusName}`);
    }
    lastStatusRef.current = job.statusName;
  }, [job, job?.statusName]);
  useEffect(() => {
    if (!job) return;
    if (lastDriverRef.current !== undefined && lastDriverRef.current !== job.driverId && job.driverId != null) {
      void hapticSuccess();
      AccessibilityInfo.announceForAccessibility(`Assigned to ${job.driverName ?? 'driver'}`);
    }
    lastDriverRef.current = job.driverId;
  }, [job, job?.driverId, job?.driverName]);

  // Error haptic on transition INTO a failed-outbox state for this job (not every render).
  const hadFailedRef = useRef(false);
  useEffect(() => {
    const hasFailed = failedItem != null;
    if (hasFailed && !hadFailedRef.current) void hapticError();
    hadFailedRef.current = hasFailed;
  }, [failedItem]);

  const handleSelectStatus = (status: StatusType) => {
    setPickerVisible(false);
    Alert.alert('Update status', `Set status to “${status.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => update.mutate({ jobId, statusTypeId: status.id, statusName: status.name }),
      },
    ]);
  };

  const handleClaim = () => {
    if (driverId == null) return;
    const myName = fullName(currentUser?.firstName, currentUser?.lastName) || null;
    Alert.alert('Claim job', 'Assign this job to yourself?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Claim', onPress: () => assign.mutate({ jobId, driverId, driverName: myName }) },
    ]);
  };

  const handleSelectDriver = (driver: DriverRow) => {
    setDriverPickerVisible(false);
    const name = fullName(driver.firstName, driver.lastName) || null;
    Alert.alert('Assign driver', `Assign this job to ${name ?? `driver ${driver.id}`}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Assign', onPress: () => assign.mutate({ jobId, driverId: driver.id, driverName: name }) },
    ]);
  };

  const handleOpenStop = (stop: Stop) => {
    void openUrl(mapsDirectionsUrl([stop]));
  };

  const handleCallStop = (stop: Stop) => {
    void openUrl(telUrl(stop.contact_phone));
  };

  const routeUrl = detail?.stops?.length ? mapsDirectionsUrl(detail.stops) : null;
  const customerPhone = telUrl(detail?.customer?.phone);
  const customerEmail = mailtoUrl(detail?.customer?.email);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <Pressable
          testID="job-back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size="lg" colour={t.colours.primary} />
        </Pressable>
      </View>

      {!job && isHydrating ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={t.colours.primary} />
        </View>
      ) : !job && error ? (
        <EmptyState title="Couldn’t load this job" subtitle="Check your connection and try again." />
      ) : !job ? (
        <EmptyState title="Job not found" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.ref}>{job.jobRef}</Text>
            <JobStatusBadge statusName={job.statusName} />
          </View>

          {serviceVehicleLine ? <Text style={styles.serviceVehicle}>{serviceVehicleLine}</Text> : null}

          {!isOnline && detail?.hydratedAt ? (
            <View style={styles.asOfRow} testID="detail-as-of">
              <Icon name="clock-outline" size="sm" colour={t.colours.textMuted} />
              <Text style={styles.asOf}>Showing details as of {formatDateTime(detail.hydratedAt)}</Text>
            </View>
          ) : null}

          {failedItem ? (
            <View style={styles.failed} accessibilityLiveRegion="polite">
              <Text style={styles.failedText} numberOfLines={3}>
                Action failed: {failedItem.lastError ?? 'The action was rejected.'}
              </Text>
              <View style={styles.failedActions}>
                <Pressable onPress={() => retry.mutate(failedItem.id)} disabled={retry.isPending} hitSlop={6}>
                  <Text style={styles.retry}>Retry</Text>
                </Pressable>
                <Pressable onPress={() => discard.mutate(failedItem.id)} disabled={discard.isPending} hitSlop={6}>
                  <Text style={styles.discard}>Discard</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {job.description ? <Text style={styles.description}>{job.description}</Text> : null}
          {job.deliveryTime ? (
            <Text style={styles.meta}>Scheduled: {formatDateTimeSmart(job.deliveryTime)}</Text>
          ) : null}

          {/* When the bottom bar primary action is "Assign"/"Claim", Update status stays
              available inline here so it is never hidden for dispatchers/drivers. */}
          {assignIsPrimary ? (
            <View style={styles.actions}>
              <Button
                testID="job-update-status"
                label="Update status"
                onPress={() => setPickerVisible(true)}
                loading={update.isPending}
                disabled={statusDisabled}
              />
            </View>
          ) : null}

          {showAssignment ? (
            <Section title="Assignment" styles={styles}>
              <Field label="Driver" value={job.driverName ?? 'Unassigned'} styles={styles} />
              {/* job-claim lives in the sticky bottom bar; the section keeps job-assign so
                  dispatchers can (re)assign whether or not the job is currently unassigned. */}
              {canAssign ? (
                <View style={styles.assignButtons}>
                  <Button
                    testID="job-assign"
                    label="Assign driver"
                    variant="secondary"
                    onPress={() => setDriverPickerVisible(true)}
                    disabled={mutating}
                  />
                </View>
              ) : null}
            </Section>
          ) : null}

          {detail?.stops?.length ? (
            <Section title={`Route (${detail.stops.length} stops)`} styles={styles}>
              {detail.journey ? (
                <Field
                  label="Distance / time"
                  value={[detail.journey.distance, detail.journey.time].filter(Boolean).join(' · ') || '—'}
                  styles={styles}
                />
              ) : null}
              <StopList stops={detail.stops} onOpenStop={handleOpenStop} onCallStop={handleCallStop} />
              {routeUrl ? (
                <View style={styles.mapButton}>
                  <Button testID="job-open-maps" label="Open route in Maps" variant="secondary" onPress={() => openUrl(routeUrl)} />
                </View>
              ) : null}
            </Section>
          ) : null}

          {detail?.customer ? (
            <Section title="Customer" styles={styles}>
              <Field label="Name" value={fullName(detail.customer.first_name, detail.customer.last_name)} styles={styles} />
              {detail.customer.phone ? <Field label="Phone" value={detail.customer.phone} styles={styles} /> : null}
              {detail.customer.email ? <Field label="Email" value={detail.customer.email} styles={styles} /> : null}
              {job.customerReference ? <Field label="Reference" value={job.customerReference} styles={styles} /> : null}
              {customerPhone || customerEmail ? (
                <View style={styles.contactActions}>
                  {customerPhone ? (
                    <ContactButton testID="customer-call" icon="phone-outline" label="Call customer" url={customerPhone} styles={styles} colour={t.colours.primary} />
                  ) : null}
                  {customerEmail ? (
                    <ContactButton testID="customer-email" icon="email-outline" label="Email customer" url={customerEmail} styles={styles} colour={t.colours.primary} />
                  ) : null}
                </View>
              ) : null}
            </Section>
          ) : null}

          {detail?.quote ? (
            <Section title="Pricing" styles={styles}>
              <Field label="Basic" value={formatCurrency(toFloat(detail.quote.basic_cost), currency)} styles={styles} />
              <Field label="Distance" value={formatCurrency(toFloat(detail.quote.distance_cost), currency)} styles={styles} />
              <Field label="Time" value={formatCurrency(toFloat(detail.quote.time_cost), currency)} styles={styles} />
              <Field label="Surcharge" value={formatCurrency(toFloat(detail.quote.notice_cost), currency)} styles={styles} />
              <Field label={settings?.taxName || 'Tax'} value={formatCurrency(toFloat(detail.quote.tax_cost), currency)} styles={styles} />
              <Field label="Total" value={formatCurrency(toFloat(detail.quote.total), currency)} emphasis styles={styles} />
              {job.weight != null ? (
                <Field label="Weight" value={`${job.weight} ${settings?.weightUnit ?? ''}`.trim()} styles={styles} />
              ) : null}
            </Section>
          ) : null}

          {detail?.payment?.length ? (
            <Section title="Payment" styles={styles}>
              {detail.payment.map((row, index) => (
                <Field key={index} label={row.label} value={row.value} styles={styles} />
              ))}
            </Section>
          ) : null}

          {!detail && isHydrating ? (
            <ActivityIndicator color={t.colours.primary} style={styles.detailSpinner} />
          ) : null}
        </ScrollView>
      )}

      {/* Sticky bottom action bar — the single most likely action stays visible while scrolling.
          Tab-bar / safe-area inset is handled by the navigator, so no extra bottom padding here. */}
      {job ? (
        <View style={styles.bottomBar}>
          {assignIsPrimary ? (
            canClaim ? (
              <Button
                testID="job-claim"
                label="Claim job"
                onPress={handleClaim}
                loading={assign.isPending}
                disabled={mutating}
              />
            ) : (
              <Button
                testID="job-assign-primary"
                label="Assign driver"
                onPress={() => setDriverPickerVisible(true)}
                disabled={mutating}
              />
            )
          ) : (
            <Button
              testID="job-update-status"
              label="Update status"
              onPress={() => setPickerVisible(true)}
              loading={update.isPending}
              disabled={statusDisabled}
            />
          )}
        </View>
      ) : null}

      <StatusPicker
        visible={pickerVisible}
        statuses={statuses}
        currentStatusId={job?.statusTypeId ?? null}
        onSelect={handleSelectStatus}
        onClose={() => setPickerVisible(false)}
      />

      <DriverPicker
        visible={driverPickerVisible}
        drivers={assignableDrivers}
        currentDriverId={job?.driverId ?? null}
        onSelect={handleSelectDriver}
        onClose={() => setDriverPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

type JobDetailStyles = ReturnType<typeof makeStyles>;

function Section({ title, children, styles }: { title: string; children: ReactNode; styles: JobDetailStyles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  emphasis = false,
  styles,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  styles: JobDetailStyles;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, emphasis && styles.fieldValueEmphasis]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

/** A 44dp icon-button that fires a deep-link (tel:/mailto:) — bigger target than tappable text. */
function ContactButton({
  testID,
  icon,
  label,
  url,
  colour,
  styles,
}: {
  testID: string;
  icon: IconName;
  label: string;
  url: string;
  colour: string;
  styles: JobDetailStyles;
}) {
  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [styles.contactButton, pressed && styles.contactButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => openUrl(url)}
    >
      <Icon name={icon} size="md" colour={colour} />
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.background },
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: SPACING.md, gap: SPACING.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    ref: { ...TYPOGRAPHY.title, color: t.colours.text, flexShrink: 1 },
    serviceVehicle: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
    description: { ...TYPOGRAPHY.body, color: t.colours.text },
    meta: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
    asOfRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    asOf: { ...TYPOGRAPHY.caption, color: t.colours.textMuted, fontStyle: 'italic', flexShrink: 1 },
    actions: { marginTop: SPACING.sm },
    bottomBar: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colours.border,
      backgroundColor: t.colours.background,
    },
    contactActions: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.sm },
    contactButton: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: t.colours.border,
      backgroundColor: t.colours.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactButtonPressed: { opacity: 0.6 },
    assignButtons: { gap: SPACING.sm, paddingVertical: SPACING.sm },
    mapButton: { paddingTop: SPACING.sm },
    failed: { backgroundColor: t.colours.dangerSurface, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
    failedText: { ...TYPOGRAPHY.caption, color: t.colours.danger },
    failedActions: { flexDirection: 'row', gap: SPACING.lg },
    retry: { ...TYPOGRAPHY.body, color: t.colours.primary, fontWeight: '600' },
    discard: { ...TYPOGRAPHY.body, color: t.colours.danger },
    section: { marginTop: SPACING.md, gap: SPACING.xs },
    sectionTitle: { ...TYPOGRAPHY.label, color: t.colours.textMuted, textTransform: 'uppercase' },
    card: {
      backgroundColor: t.colours.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: t.colours.border,
      paddingHorizontal: SPACING.md,
    },
    field: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      gap: SPACING.md,
    },
    fieldLabel: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    fieldValue: { ...TYPOGRAPHY.body, color: t.colours.text, flexShrink: 1, textAlign: 'right' },
    fieldValueEmphasis: { ...TYPOGRAPHY.subheading, color: t.colours.text },
    detailSpinner: { marginTop: SPACING.lg },
  });
