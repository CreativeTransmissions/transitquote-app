import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomerCard } from '../../../components/customers/CustomerCard';
import { TextField } from '../../../components/shared/TextField';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useCustomers } from '../../../hooks/useCustomers';
import { useRole } from '../../../hooks/useRole';
import { filterCustomers } from '../../../utils/customerSearch';
import { COLOURS, GRADIENTS, SPACING, TYPOGRAPHY } from '../../../constants';

export default function CustomersScreen() {
  const { role, isDispatcher } = useRole();
  const { customers, dbError, isSyncing, refresh } = useCustomers();
  const [query, setQuery] = useState('');

  // role is null until the reactive role query hydrates — don't redirect during that first-render
  // loading window, or a real dispatcher gets bounced back to /jobs (see drivers/index.tsx).
  if (role !== null && !isDispatcher) return <Redirect href="/jobs" />;

  const visible = filterCustomers(customers, query);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={GRADIENTS.screen} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
      </View>

      <View style={styles.search}>
        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Name, email, or phone"
          autoCapitalize="none"
          testID="customer-search"
        />
      </View>

      {dbError ? (
        <EmptyState title="Couldn’t load customers" subtitle={dbError.message} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CustomerCard customer={item} onPress={(id) => router.push(`/customers/${id}`)} />}
          contentContainerStyle={visible.length === 0 ? styles.emptyContent : styles.content}
          refreshing={isSyncing}
          onRefresh={refresh}
          ListEmptyComponent={
            <EmptyState
              title={query ? 'No matches' : 'No customers'}
              subtitle={query ? 'Try a different search.' : 'Customers come from your TransitTeam site. Add them in the WordPress admin.'}
              icon={query ? undefined : 'account-box-outline'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
  title: { ...TYPOGRAPHY.title, color: COLOURS.text },
  search: { paddingHorizontal: SPACING.md },
  content: { padding: SPACING.md, gap: SPACING.sm },
  emptyContent: { flexGrow: 1 },
});
