/**
 * Slide-up filter sheet for the job list (spec §6.4): status multi-select chips, driver
 * single-select (dispatcher only), and a scheduled-date range with native date pickers.
 * Holds a local draft so changes only take effect on Apply; Clear All resets to empty.
 *
 * Quick-preset chips (Today / This week / All) sit at the top and set the draft date range.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { SheetContainer } from '../shared/SheetContainer';
import { Icon } from '../shared/Icon';
import { Button } from '../shared/Button';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';
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

// ─── preset helpers ────────────────────────────────────────────────────────────

type PresetId = 'today' | 'this-week' | 'all';

interface PresetRange {
  dateFrom: string | null;
  dateTo: string | null;
}

function getPresetRange(id: PresetId): PresetRange {
  const now = dayjs();
  if (id === 'today') {
    const d = now.format('YYYY-MM-DD');
    return { dateFrom: d, dateTo: d };
  }
  if (id === 'this-week') {
    // Monday–Sunday of the current week (dayjs week starts Sunday; compute manually):
    const dow = now.day(); // 0 = Sun, 1 = Mon, …
    const monday = now.subtract(dow === 0 ? 6 : dow - 1, 'day');
    const sunday = monday.add(6, 'day');
    return { dateFrom: monday.format('YYYY-MM-DD'), dateTo: sunday.format('YYYY-MM-DD') };
  }
  // 'all'
  return { dateFrom: null, dateTo: null };
}

function matchesPreset(id: PresetId, dateFrom: string | null, dateTo: string | null): boolean {
  const p = getPresetRange(id);
  return p.dateFrom === dateFrom && p.dateTo === dateTo;
}

// ─── component ─────────────────────────────────────────────────────────────────

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
  // Which native picker is open: 'from' | 'to' | null
  const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null);
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Sync draft to the latest external filters each time the sheet is opened.
  // We depend only on `visible` (not `filters`) so that in-flight draft edits are
  // not clobbered while the sheet is open.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (visible) setDraft(filters); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStatus = (id: number) => {
    setDraft((d) => ({
      ...d,
      statusIds: d.statusIds.includes(id) ? d.statusIds.filter((s) => s !== id) : [...d.statusIds, id],
    }));
  };

  const selectDriver = (id: number | null) => setDraft((d) => ({ ...d, driverId: id }));

  const applyPreset = (id: PresetId) => {
    const range = getPresetRange(id);
    setDraft((d) => ({ ...d, ...range }));
  };

  const handleFromChange = (_event: DateTimePickerEvent, date?: Date) => {
    setPickerOpen(null);
    if (date) {
      setDraft((d) => ({ ...d, dateFrom: dayjs(date).format('YYYY-MM-DD') }));
    }
  };

  const handleToChange = (_event: DateTimePickerEvent, date?: Date) => {
    setPickerOpen(null);
    if (date) {
      setDraft((d) => ({ ...d, dateTo: dayjs(date).format('YYYY-MM-DD') }));
    }
  };

  const clearFrom = () => setDraft((d) => ({ ...d, dateFrom: null }));
  const clearTo = () => setDraft((d) => ({ ...d, dateTo: null }));

  // Display helpers
  const fromDisplay = draft.dateFrom ? dayjs(draft.dateFrom).format('D MMM YYYY') : null;
  const toDisplay = draft.dateTo ? dayjs(draft.dateTo).format('D MMM YYYY') : null;

  // Native picker initial date values (fall back to today for the calendar position)
  const fromDate = draft.dateFrom ? dayjs(draft.dateFrom).toDate() : new Date();
  const toDate = draft.dateTo ? dayjs(draft.dateTo).toDate() : new Date();

  const presets: { id: PresetId; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'this-week', label: 'This week' },
    { id: 'all', label: 'All' },
  ];

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Filter jobs" maxHeightPct={0.85}>
      {/* ── Quick preset chips (above the ScrollView) ── */}
      <View style={styles.chips}>
        {presets.map((preset) => {
          const active = matchesPreset(preset.id, draft.dateFrom, draft.dateTo);
          return (
            <Pressable
              key={preset.id}
              testID={`filter-preset-${preset.id}`}
              onPress={() => applyPreset(preset.id)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView>
        {/* ── Status chips ── */}
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{status.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Driver filter (dispatcher only) ── */}
        {showDriverFilter ? (
          <>
            <Text style={styles.section}>Driver</Text>
            <View style={styles.chips}>
              <Pressable
                testID="filter-driver-any"
                onPress={() => selectDriver(null)}
                style={[styles.chip, draft.driverId == null && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.driverId == null }}
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
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
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

        {/* ── Date range pickers ── */}
        <Text style={styles.section}>Scheduled date</Text>

        {/* From date field */}
        <Pressable
          testID="filter-date-from"
          style={styles.dateField}
          onPress={() => setPickerOpen('from')}
          accessibilityRole="button"
          accessibilityLabel={`From date, ${fromDisplay ?? 'Any date'}`}
        >
          <Text style={fromDisplay ? styles.dateValue : styles.datePlaceholder}>
            {fromDisplay ?? 'Any date'}
          </Text>
          {fromDisplay ? (
            <Pressable
              onPress={clearFrom}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Clear from date"
              testID="filter-date-from-clear"
            >
              <Icon name="close" size="sm" colour={t.colours.textMuted} />
            </Pressable>
          ) : null}
        </Pressable>

        {/* To date field */}
        <Pressable
          testID="filter-date-to"
          style={styles.dateField}
          onPress={() => setPickerOpen('to')}
          accessibilityRole="button"
          accessibilityLabel={`To date, ${toDisplay ?? 'Any date'}`}
        >
          <Text style={toDisplay ? styles.dateValue : styles.datePlaceholder}>
            {toDisplay ?? 'Any date'}
          </Text>
          {toDisplay ? (
            <Pressable
              onPress={clearTo}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Clear to date"
              testID="filter-date-to-clear"
            >
              <Icon name="close" size="sm" colour={t.colours.textMuted} />
            </Pressable>
          ) : null}
        </Pressable>

        {/* Native date picker dialogs — rendered inside ScrollView so they appear in-tree */}
        {pickerOpen === 'from' ? (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={handleFromChange}
          />
        ) : null}
        {pickerOpen === 'to' ? (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={handleToChange}
          />
        ) : null}
      </ScrollView>

      {/* ── Actions row ── */}
      <View style={styles.actions}>
        <Pressable testID="filter-clear" onPress={onClear} style={styles.clear} accessibilityRole="button">
          <Text style={styles.clearText}>Clear all</Text>
        </Pressable>
        <View style={styles.apply}>
          <Button testID="filter-apply" label="Apply" onPress={() => onApply(draft)} />
        </View>
      </View>
    </SheetContainer>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    section: {
      ...TYPOGRAPHY.label,
      color: t.colours.textMuted,
      textTransform: 'uppercase',
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.xs },
    chip: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colours.border,
      backgroundColor: t.colours.surface,
    },
    chipActive: { backgroundColor: t.colours.primary, borderColor: t.colours.primary },
    chipText: { ...TYPOGRAPHY.body, color: t.colours.text },
    chipTextActive: { color: t.colours.textInverse },
    dateField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.colours.border,
      backgroundColor: t.colours.surface,
      marginBottom: SPACING.sm,
    },
    dateValue: { ...TYPOGRAPHY.body, color: t.colours.text, flex: 1 },
    datePlaceholder: { ...TYPOGRAPHY.body, color: t.colours.textMuted, flex: 1 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.md },
    clear: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
    clearText: { ...TYPOGRAPHY.body, color: t.colours.danger },
    apply: { flex: 1 },
  });
