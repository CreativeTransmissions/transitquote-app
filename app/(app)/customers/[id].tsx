import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobCard } from '../../../components/jobs/JobCard';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useCustomers, useCustomerJobs } from '../../../hooks/useCustomers';
import { useOutbox } from '../../../hooks/useOutbox';
import { useRole } from '../../../hooks/useRole';
import { fullName } from '../../../utils/formatters';
import { mailtoUrl, telUrl } from '../../../utils/links';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';

async function openUrl(url: string | null): Promise<void> {
  if (!url) return;
  const supported = await Linking.canOpenURL(url);
  if (supported) await Linking.openURL(url);
  else Alert.alert('Unable to open', 'No app available to handle this link.');
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const { isDispatcher } = useRole();
  const { customers } = useCustomers();
  const jobs = useCustomerJobs(customerId);
  const { stateByJob } = useOutbox();

  if (!isDispatcher) return <Redirect href="/jobs" />;

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const phone = telUrl(customer?.phone);
  const email = mailtoUrl(customer?.email);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <Pressable testID="customer-back" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      {!customer ? (
        <EmptyState title="Customer not found" />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <JobCard job={item} outboxState={stateByJob.get(item.id)} onPress={(jobId) => router.push(`/jobs/${jobId}`)} />
          )}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Text style={styles.name}>{fullName(customer.firstName, customer.lastName) || `Customer ${customer.id}`}</Text>
              <View style={styles.card}>
                <LinkRow label="Phone" value={customer.phone ?? ''} url={phone} testID="customer-call" />
                <LinkRow label="Email" value={customer.email ?? ''} url={email} testID="customer-email" />
              </View>
              <Text style={styles.section}>Job history ({jobs.length})</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState title="No jobs for this customer" />}
        />
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

function LinkRow({ label, value, url, testID }: { label: string; value: string; url: string | null; testID?: string }) {
  if (!url) return <Row label={label} value={value} />;
  return (
    <Pressable testID={testID} style={styles.row} accessibilityRole="link" onPress={() => openUrl(url)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, styles.rowValueLink]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  content: { padding: SPACING.md, gap: SPACING.sm },
  headerBlock: { gap: SPACING.sm, marginBottom: SPACING.sm },
  name: { ...TYPOGRAPHY.title, color: COLOURS.text },
  card: {
    backgroundColor: COLOURS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLOURS.border,
    paddingHorizontal: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  rowLabel: { ...TYPOGRAPHY.body, color: COLOURS.textMuted },
  rowValue: { ...TYPOGRAPHY.body, color: COLOURS.text, flexShrink: 1, textAlign: 'right' },
  rowValueLink: { color: COLOURS.primary },
  section: { ...TYPOGRAPHY.label, color: COLOURS.textMuted, textTransform: 'uppercase', marginTop: SPACING.sm },
});
