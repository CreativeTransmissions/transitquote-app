/** Pull-to-refresh job list. Renders an empty state when there are no jobs. */
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { JobCard } from './JobCard';
import { EmptyState } from '../shared/EmptyState';
import { COLOURS, SPACING } from '../../constants';
import type { JobRow } from '../../database/schema';

interface JobListProps {
  jobs: JobRow[];
  onSelect: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  showDriver?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export function JobList({
  jobs,
  onSelect,
  refreshing,
  onRefresh,
  showDriver = false,
  emptyTitle = 'No jobs',
  emptySubtitle,
}: JobListProps) {
  return (
    <FlatList
      data={jobs}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <JobCard job={item} showDriver={showDriver} onPress={onSelect} />}
      contentContainerStyle={jobs.length === 0 ? styles.emptyContent : styles.content}
      ListEmptyComponent={<EmptyState title={emptyTitle} subtitle={emptySubtitle} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLOURS.primary} />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.md, gap: SPACING.sm },
  emptyContent: { flexGrow: 1 },
});
