import { useMemo } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobCard } from '../../../components/jobs/JobCard';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Icon } from '../../../components/shared/Icon';
import { useCustomers, useCustomerJobs } from '../../../hooks/useCustomers';
import { useOutbox } from '../../../hooks/useOutbox';
import { useRole } from '../../../hooks/useRole';
import { useTheme, type Theme } from '../../../hooks/useTheme';
import { fullName } from '../../../utils/formatters';
import { mailtoUrl, telUrl } from '../../../utils/links';
import { openLink } from '../../../utils/openLink';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';

async function openUrl(url: string | null): Promise<void> {
  if (!url) return;
  const opened = await openLink(url);
  if (!opened) Alert.alert('Unable to open', 'No app available to handle this link.');
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const { role, isDispatcher } = useRole();
  const { customers } = useCustomers();
  const jobs = useCustomerJobs(customerId);
  const { stateByJob } = useOutbox();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Don't redirect while the role query is still hydrating (role === null) — see drivers/index.tsx.
  if (role !== null && !isDispatcher) return <Redirect href="/jobs" />;

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const phone = telUrl(customer?.phone);
  const email = mailtoUrl(customer?.email);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <Pressable
          testID="customer-back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size="lg" colour={t.colours.primary} />
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
                <LinkRow label="Phone" value={customer.phone ?? ''} url={phone} testID="customer-call" styles={styles} />
                <LinkRow label="Email" value={customer.email ?? ''} url={email} testID="customer-email" styles={styles} />
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

type CustomerDetailStyles = ReturnType<typeof makeStyles>;

function Row({ label, value, styles }: { label: string; value: string; styles: CustomerDetailStyles }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

function LinkRow({
  label,
  value,
  url,
  testID,
  styles,
}: {
  label: string;
  value: string;
  url: string | null;
  testID?: string;
  styles: CustomerDetailStyles;
}) {
  if (!url) return <Row label={label} value={value} styles={styles} />;
  return (
    <Pressable testID={testID} style={styles.row} accessibilityRole="link" onPress={() => openUrl(url)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, styles.rowValueLink]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.background },
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
    content: { padding: SPACING.md, gap: SPACING.sm },
    headerBlock: { gap: SPACING.sm, marginBottom: SPACING.sm },
    name: { ...TYPOGRAPHY.title, color: t.colours.text },
    card: {
      backgroundColor: t.colours.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: t.colours.border,
      paddingHorizontal: SPACING.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      gap: SPACING.md,
    },
    rowLabel: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    rowValue: { ...TYPOGRAPHY.body, color: t.colours.text, flexShrink: 1, textAlign: 'right' },
    rowValueLink: { color: t.colours.primary },
    section: { ...TYPOGRAPHY.label, color: t.colours.textMuted, textTransform: 'uppercase', marginTop: SPACING.sm },
  });
