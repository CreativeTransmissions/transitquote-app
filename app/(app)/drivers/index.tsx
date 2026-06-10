import { Redirect, router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DriverCard } from '../../../components/drivers/DriverCard';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useDrivers } from '../../../hooks/useDrivers';
import { useDriverJobCounts } from '../../../hooks/useDriverJobCounts';
import { useRole } from '../../../hooks/useRole';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../../constants';

export default function DriversScreen() {
  const { role, isDispatcher } = useRole();
  const drivers = useDrivers();
  const counts = useDriverJobCounts();
  const t = useTheme();

  // Drivers list is dispatcher/admin-only (spec §6.6); guard the route for non-dispatchers.
  // role is null until the reactive role query (useLiveQuery) hydrates — don't redirect during
  // that first-render loading window, or a real dispatcher gets bounced straight back to /jobs.
  if (role !== null && !isDispatcher) return <Redirect href="/jobs" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colours.background }]} edges={['top']}>
      <LinearGradient colors={t.gradients.screen} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.colours.text }]}>Drivers</Text>
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DriverCard driver={item} jobCount={counts.get(item.id) ?? 0} onPress={(id) => router.push(`/drivers/${id}`)} />
        )}
        contentContainerStyle={drivers.length === 0 ? styles.emptyContent : styles.content}
        ListEmptyComponent={<EmptyState title="No drivers" subtitle="Drivers come from your TransitTeam site. Add them in the WordPress admin." icon="account-multiple-outline" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
  title: { ...TYPOGRAPHY.title },
  content: { padding: SPACING.md, gap: SPACING.sm },
  emptyContent: { flexGrow: 1 },
});
