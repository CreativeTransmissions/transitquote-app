import type { ReactNode } from 'react';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobStatusBadge } from '../../../components/jobs/JobStatusBadge';
import { StatusPicker } from '../../../components/jobs/StatusPicker';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Button } from '../../../components/shared/Button';
import { useJobDetail } from '../../../hooks/useJobDetail';
import { useTeamSettings } from '../../../hooks/useTeamSettings';
import { useStatusTypes, type StatusType } from '../../../hooks/useStatusTypes';
import { useUpdateJobStatus } from '../../../hooks/useUpdateJobStatus';
import { useOutbox } from '../../../hooks/useOutbox';
import { useRetryOutboxItem, useDiscardOutboxItem } from '../../../hooks/useOutboxActions';
import { fullName, formatDateTime } from '../../../utils/formatters';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = Number(id);
  const { job, detail, isHydrating, error } = useJobDetail(jobId);
  const settings = useTeamSettings();
  const statuses = useStatusTypes();
  const update = useUpdateJobStatus();
  const { failed } = useOutbox();
  const retry = useRetryOutboxItem();
  const discard = useDiscardOutboxItem();

  const [pickerVisible, setPickerVisible] = useState(false);
  const currency = settings?.currencySymbol ?? '';
  const failedItem = failed.find((item) => item.payload.id === jobId);

  const handleSelect = (status: StatusType) => {
    setPickerVisible(false);
    Alert.alert('Update status', `Set status to “${status.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => update.mutate({ jobId, statusTypeId: status.id, statusName: status.name }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
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
                Update failed: {failedItem.lastError ?? 'The action was rejected.'}
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

          <View style={styles.updateButton}>
            <Button
              label="Update status"
              onPress={() => setPickerVisible(true)}
              loading={update.isPending}
              disabled={statuses.length === 0}
            />
          </View>

          {detail?.customer ? (
            <Section title="Customer">
              <Field label="Name" value={fullName(detail.customer.first_name, detail.customer.last_name)} />
              <Field label="Phone" value={detail.customer.phone} />
              <Field label="Email" value={detail.customer.email} />
            </Section>
          ) : null}

          {detail?.stops?.length ? (
            <Section title={`Stops (${detail.stops.length})`}>
              {detail.stops.map((stop, index) => (
                <View key={stop.id ?? index} style={styles.stop}>
                  <Text style={styles.stopType}>{stop.visit_type || `Stop ${index + 1}`}</Text>
                  <Text style={styles.stopAddress}>{stop.address}</Text>
                </View>
              ))}
            </Section>
          ) : null}

          {detail?.quote ? (
            <Section title="Pricing">
              <Field label="Distance" value={`${currency}${detail.quote.distance_cost}`} />
              <Field label="Time" value={`${currency}${detail.quote.time_cost}`} />
              <Field label="Tax" value={`${currency}${detail.quote.tax_cost}`} />
              <Field label="Total" value={`${currency}${detail.quote.total}`} emphasis />
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
        onSelect={handleSelect}
        onClose={() => setPickerVisible(false)}
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
  updateButton: { marginTop: SPACING.sm },
  failed: {
    backgroundColor: '#FDECEA',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
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
  stop: { paddingVertical: SPACING.sm, gap: 2 },
  stopType: { ...TYPOGRAPHY.label, color: COLOURS.primary, textTransform: 'capitalize' },
  stopAddress: { ...TYPOGRAPHY.body, color: COLOURS.text },
  detailSpinner: { marginTop: SPACING.lg },
});
