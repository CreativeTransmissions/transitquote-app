/** Pull-to-refresh job list. Renders an empty state when there are no jobs. */
import { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { JobCard } from './JobCard';
import { EmptyState } from '../shared/EmptyState';
import { SPACING } from '../../constants';
import { useJobCardLookups } from '../../hooks/useJobCardLookups';
import { useTheme } from '../../hooks/useTheme';
import type { JobRow } from '../../database/schema';
import type { JobOutboxState } from '../../hooks/useOutbox';
import type { IconName } from '../shared/Icon';

interface JobListProps {
  jobs: JobRow[];
  onSelect: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  showDriver?: boolean;
  outboxStateByJob?: Map<number, JobOutboxState>;
  emptyTitle?: string;
  emptySubtitle?: string;
  /** Optional icon shown in the empty state above the title. */
  emptyIcon?: IconName;
  /** Optional call-to-action rendered in the empty state. */
  emptyAction?: { label: string; onPress: () => void };
}

export function JobList({
  jobs,
  onSelect,
  refreshing,
  onRefresh,
  showDriver = false,
  outboxStateByJob,
  emptyTitle = 'No jobs',
  emptySubtitle,
  emptyIcon,
  emptyAction,
}: JobListProps) {
  const { serviceNames, vehicleNames, paymentStatusNames } = useJobCardLookups();
  const t = useTheme();

  // Derive a flat primitive-map from the Map to avoid passing the whole Map into renderItem,
  // which would re-render all cards whenever any outbox state changes (P-3).
  const outboxStates = useMemo<Record<number, JobOutboxState>>(() => {
    if (!outboxStateByJob) return {};
    const result: Record<number, JobOutboxState> = {};
    outboxStateByJob.forEach((state, id) => {
      result[id] = state;
    });
    return result;
  }, [outboxStateByJob]);

  const keyExtractor = useCallback((item: JobRow) => String(item.id), []);

  const renderItem = useCallback(
    ({ item }: { item: JobRow }) => (
      <JobCard
        job={item}
        showDriver={showDriver}
        outboxState={outboxStates[item.id]}
        onPress={onSelect}
        serviceNames={serviceNames}
        vehicleNames={vehicleNames}
        paymentStatusNames={paymentStatusNames}
      />
    ),
    [showDriver, outboxStates, onSelect, serviceNames, vehicleNames, paymentStatusNames],
  );

  return (
    <FlatList
      data={jobs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={jobs.length === 0 ? styles.emptyContent : styles.content}
      ListEmptyComponent={<EmptyState title={emptyTitle} subtitle={emptySubtitle} icon={emptyIcon} action={emptyAction} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colours.primary} />
      }
      windowSize={7}
      maxToRenderPerBatch={8}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.md, gap: SPACING.sm },
  emptyContent: { flexGrow: 1 },
});
