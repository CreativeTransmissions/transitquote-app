import { Redirect, router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DriverCard } from '../../../components/drivers/DriverCard';
import { OfflineBanner } from '../../../components/sync/OfflineBanner';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useDrivers } from '../../../hooks/useDrivers';
import { useDriverJobCounts } from '../../../hooks/useDriverJobCounts';
import { useRole } from '../../../hooks/useRole';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../../constants';

export default function DriversScreen() {
  const { isDispatcher } = useRole();
  const drivers = useDrivers();
  const counts = useDriverJobCounts();

  // Drivers list is dispatcher/admin-only (spec §6.6); guard the route for non-dispatchers.
  if (!isDispatcher) return <Redirect href="/jobs" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <Pressable testID="drivers-back" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Drivers</Text>
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DriverCard driver={item} jobCount={counts.get(item.id) ?? 0} onPress={(id) => router.push(`/drivers/${id}`)} />
        )}
        contentContainerStyle={drivers.length === 0 ? styles.emptyContent : styles.content}
        ListEmptyComponent={<EmptyState title="No drivers" subtitle="No drivers in this site’s configuration." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
  back: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  title: { ...TYPOGRAPHY.title, color: COLOURS.text },
  content: { padding: SPACING.md, gap: SPACING.sm },
  emptyContent: { flexGrow: 1 },
});
