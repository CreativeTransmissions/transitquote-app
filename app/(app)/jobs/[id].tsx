import type { ReactNode } from 'react';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobStatusBadge } from '../../../components/jobs/JobStatusBadge';
import { StatusPicker } from '../../../components/jobs/StatusPicker';
import { DriverPicker } from '../../../components/jobs/DriverPicker';
import { StopList } from '../../../components/jobs/StopList';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Button } from '../../../components/shared/Button';
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
import { fullName, formatDateTime, formatCurrency } from '../../../utils/formatters';
import { toFloat } from '../../../utils/coerce';
import { mailtoUrl, mapsDirectionsUrl, telUrl } from '../../../utils/links';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { DriverRow } from '../../../database/schema';
import type { Stop } from '../../../types/api';

async function openUrl(url: string | null): Promise<void> {
  if (!url) return;
  const supported = await Linking.canOpenURL(url);
  if (supported) await Linking.openURL(url);
  else Alert.alert('Unable to open', 'No app available to handle this link.');
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = Number(id);
  const { job, detail, isHydrating, error } = useJobDetail(jobId);
  const settings = useTeamSettings();
  const statuses = useStatusTypes();
  const update = useUpdateJobStatus();
  const assign = useAssignDriver();
  const { drivers: assignableDrivers, canAssign } = useAssignableDrivers();
  const currentUser = useCurrentUser();
  const { isDriver, isDecentralized, driverId } = useRole();
  const { failed } = useOutbox();
  const retry = useRetryOutboxItem();
  const discard = useDiscardOutboxItem();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [driverPickerVisible, setDriverPickerVisible] = useState(false);

  const currency = settings?.currencySymbol ?? '';
  const failedItem = failed.find((item) => item.payload.id === jobId);
  const showAssignment = isDriver && isDecentralized;
  const canClaim = showAssignment && job?.driverId == null && driverId != null;
  const mutating = update.isPending || assign.isPending;

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

  const routeUrl = detail?.stops?.length ? mapsDirectionsUrl(detail.stops) : null;
  const customerPhone = telUrl(detail?.customer?.phone);
  const customerEmail = mailtoUrl(detail?.customer?.email);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <Pressable testID="job-back" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      {!job && isHydrating ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={COLOURS.primary} />
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

          {failedItem ? (
            <View style={styles.failed}>
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
            <Text style={styles.meta}>Scheduled: {formatDateTime(job.deliveryTime)}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              testID="job-update-status"
              label="Update status"
              onPress={() => setPickerVisible(true)}
              loading={update.isPending}
              disabled={statuses.length === 0 || mutating}
            />
          </View>

          {showAssignment ? (
            <Section title="Assignment">
              <Field label="Driver" value={job.driverName ?? 'Unassigned'} />
              <View style={styles.assignButtons}>
                {canClaim ? (
                  <Button
                    testID="job-claim"
                    label="Claim job"
                    onPress={handleClaim}
                    loading={assign.isPending}
                    disabled={mutating}
                  />
                ) : null}
                {canAssign ? (
                  <Button
                    testID="job-assign"
                    label="Assign driver"
                    variant="secondary"
                    onPress={() => setDriverPickerVisible(true)}
                    disabled={mutating}
                  />
                ) : null}
              </View>
            </Section>
          ) : null}

          {detail?.stops?.length ? (
            <Section title={`Route (${detail.stops.length} stops)`}>
              {detail.journey ? (
                <Field
                  label="Distance / time"
                  value={[detail.journey.distance, detail.journey.time].filter(Boolean).join(' · ') || '—'}
                />
              ) : null}
              <StopList stops={detail.stops} onOpenStop={handleOpenStop} />
              {routeUrl ? (
                <View style={styles.mapButton}>
                  <Button testID="job-open-maps" label="Open route in Maps" variant="secondary" onPress={() => openUrl(routeUrl)} />
                </View>
              ) : null}
            </Section>
          ) : null}

          {detail?.customer ? (
            <Section title="Customer">
              <Field label="Name" value={fullName(detail.customer.first_name, detail.customer.last_name)} />
              <LinkField label="Phone" value={detail.customer.phone} url={customerPhone} testID="customer-call" />
              <LinkField label="Email" value={detail.customer.email} url={customerEmail} testID="customer-email" />
              {job.customerReference ? <Field label="Reference" value={job.customerReference} /> : null}
            </Section>
          ) : null}

          {detail?.quote ? (
            <Section title="Pricing">
              <Field label="Basic" value={formatCurrency(toFloat(detail.quote.basic_cost), currency)} />
              <Field label="Distance" value={formatCurrency(toFloat(detail.quote.distance_cost), currency)} />
              <Field label="Time" value={formatCurrency(toFloat(detail.quote.time_cost), currency)} />
              <Field label="Surcharge" value={formatCurrency(toFloat(detail.quote.notice_cost), currency)} />
              <Field label={settings?.taxName || 'Tax'} value={formatCurrency(toFloat(detail.quote.tax_cost), currency)} />
              <Field label="Total" value={formatCurrency(toFloat(detail.quote.total), currency)} emphasis />
              {job.weight != null ? (
                <Field label="Weight" value={`${job.weight} ${settings?.weightUnit ?? ''}`.trim()} />
              ) : null}
            </Section>
          ) : null}

          {detail?.payment?.length ? (
            <Section title="Payment">
              {detail.payment.map((row, index) => (
                <Field key={index} label={row.label} value={row.value} />
              ))}
            </Section>
          ) : null}

          {!detail && isHydrating ? (
            <ActivityIndicator color={COLOURS.primary} style={styles.detailSpinner} />
          ) : null}
        </ScrollView>
      )}

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Field({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, emphasis && styles.fieldValueEmphasis]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

/** A field whose value is a tappable deep-link (tel:/mailto:) when `url` is non-null. */
function LinkField({ label, value, url, testID }: { label: string; value: string; url: string | null; testID?: string }) {
  if (!url) return <Field label={label} value={value} />;
  return (
    <Pressable testID={testID} style={styles.field} accessibilityRole="link" onPress={() => openUrl(url)}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, styles.fieldValueLink]} numberOfLines={2}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.md, gap: SPACING.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  ref: { ...TYPOGRAPHY.title, color: COLOURS.text, flexShrink: 1 },
  description: { ...TYPOGRAPHY.body, color: COLOURS.text },
  meta: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
  actions: { marginTop: SPACING.sm },
  assignButtons: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  mapButton: { paddingTop: SPACING.sm },
  failed: { backgroundColor: '#FDECEA', borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  failedText: { ...TYPOGRAPHY.caption, color: COLOURS.danger },
  failedActions: { flexDirection: 'row', gap: SPACING.lg },
  retry: { ...TYPOGRAPHY.body, color: COLOURS.primary, fontWeight: '600' },
  discard: { ...TYPOGRAPHY.body, color: COLOURS.danger },
  section: { marginTop: SPACING.md, gap: SPACING.xs },
  sectionTitle: { ...TYPOGRAPHY.label, color: COLOURS.textMuted, textTransform: 'uppercase' },
  card: {
    backgroundColor: COLOURS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLOURS.border,
    paddingHorizontal: SPACING.md,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  fieldLabel: { ...TYPOGRAPHY.body, color: COLOURS.textMuted },
  fieldValue: { ...TYPOGRAPHY.body, color: COLOURS.text, flexShrink: 1, textAlign: 'right' },
  fieldValueEmphasis: { ...TYPOGRAPHY.subheading, color: COLOURS.text },
  fieldValueLink: { color: COLOURS.primary },
  detailSpinner: { marginTop: SPACING.lg },
});
