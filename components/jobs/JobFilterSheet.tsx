/**
 * Slide-up filter sheet for the job list (spec §6.4): status multi-select chips, driver
 * single-select (dispatcher only), and a scheduled-date range. Holds a local draft so changes
 * only take effect on Apply; Clear All resets to empty.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextField } from '../shared/TextField';
import { Button } from '../shared/Button';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { fullName } from '../../utils/formatters';
import type { JobFilters } from '../../utils/jobFilter';
import type { StatusType } from '../../hooks/useStatusTypes';
import type { DriverRow } from '../../database/schema';

interface JobFilterSheetProps {
  visible: boolean;
  filters: JobFilters;
  statuses: StatusType[];
  drivers: DriverRow[];
  showDriverFilter: boolean;
  onApply: (next: JobFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

export function JobFilterSheet({
  visible,
  filters,
  statuses,
  drivers,
  showDriverFilter,
  onApply,
  onClear,
  onClose,
}: JobFilterSheetProps) {
  const [draft, setDraft] = useState<JobFilters>(filters);
  const insets = useSafeAreaInsets();

  const toggleStatus = (id: number) => {
    setDraft((d) => ({
      ...d,
      statusIds: d.statusIds.includes(id) ? d.statusIds.filter((s) => s !== id) : [...d.statusIds, id],
    }));
  };

  const selectDriver = (id: number | null) => setDraft((d) => ({ ...d, driverId: id }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => setDraft(filters)}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: SPACING.lg + insets.bottom }]}>
          <Text style={styles.title}>Filter jobs</Text>
          <ScrollView>
            <Text style={styles.section}>Status</Text>
            <View style={styles.chips}>
              {statuses.map((status) => {
                const active = draft.statusIds.includes(status.id);
                return (
                  <Pressable
                    key={status.id}
                    testID={`filter-status-${status.id}`}
                    onPress={() => toggleStatus(status.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{status.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            {showDriverFilter ? (
              <>
                <Text style={styles.section}>Driver</Text>
                <View style={styles.chips}>
                  <Pressable
                    testID="filter-driver-any"
                    onPress={() => selectDriver(null)}
                    style={[styles.chip, draft.driverId == null && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, draft.driverId == null && styles.chipTextActive]}>Any</Text>
                  </Pressable>
                  {drivers.map((driver) => {
                    const active = draft.driverId === driver.id;
                    return (
                      <Pressable
                        key={driver.id}
                        testID={`filter-driver-${driver.id}`}
                        onPress={() => selectDriver(driver.id)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {fullName(driver.firstName, driver.lastName) || `Driver ${driver.id}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.section}>Scheduled date</Text>
            <TextField
              label="From (YYYY-MM-DD)"
              value={draft.dateFrom ?? ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, dateFrom: t.trim() || null }))}
              placeholder="2026-01-01"
              autoCapitalize="none"
              testID="filter-date-from"
            />
            <TextField
              label="To (YYYY-MM-DD)"
              value={draft.dateTo ?? ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, dateTo: t.trim() || null }))}
              placeholder="2026-12-31"
              autoCapitalize="none"
              testID="filter-date-to"
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable testID="filter-clear" onPress={onClear} style={styles.clear} accessibilityRole="button">
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
            <View style={styles.apply}>
              <Button testID="filter-apply" label="Apply" onPress={() => onApply(draft)} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLOURS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  title: { ...TYPOGRAPHY.heading, color: COLOURS.text, marginBottom: SPACING.sm },
  section: {
    ...TYPOGRAPHY.label,
    color: COLOURS.textMuted,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOURS.border,
    backgroundColor: COLOURS.surface,
  },
  chipActive: { backgroundColor: COLOURS.primary, borderColor: COLOURS.primary },
  chipText: { ...TYPOGRAPHY.body, color: COLOURS.text },
  chipTextActive: { color: COLOURS.background },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.md },
  clear: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  clearText: { ...TYPOGRAPHY.body, color: COLOURS.danger },
  apply: { flex: 1 },
});
