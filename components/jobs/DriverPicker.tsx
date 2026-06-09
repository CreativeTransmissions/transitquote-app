/** Bottom-sheet modal listing assignable drivers for a job assignment (spec §6.5 E). */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SheetContainer } from '../shared/SheetContainer';
import { EmptyState } from '../shared/EmptyState';
import { Icon } from '../shared/Icon';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { fullName } from '../../utils/formatters';
import type { DriverRow } from '../../database/schema';

interface DriverPickerProps {
  visible: boolean;
  drivers: DriverRow[];
  currentDriverId: number | null;
  onSelect: (driver: DriverRow) => void;
  onClose: () => void;
}

export function DriverPicker({ visible, drivers, currentDriverId, onSelect, onClose }: DriverPickerProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Assign driver" maxHeightPct={0.7}>
      {drivers.length === 0 ? (
        <EmptyState title="No drivers available" subtitle="You don't have permission to assign this job." />
      ) : (
        <ScrollView>
          {drivers.map((driver) => {
            const isCurrent = driver.id === currentDriverId;
            return (
              <Pressable
                key={driver.id}
                testID={`driver-option-${driver.id}`}
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={{ selected: isCurrent }}
                onPress={() => onSelect(driver)}
              >
                <View style={styles.rowBody}>
                  <Text style={[styles.name, isCurrent && styles.current]}>
                    {fullName(driver.firstName, driver.lastName) || `Driver ${driver.id}`}
                  </Text>
                  <View style={styles.availabilityRow}>
                    <View
                      style={[
                        styles.availabilityDot,
                        driver.available ? styles.availabilityDotAvailable : styles.availabilityDotUnavailable,
                      ]}
                    />
                    <Text style={styles.availability}>{driver.available ? 'Available' : 'Unavailable'}</Text>
                  </View>
                </View>
                {isCurrent ? <Icon name="check" size="md" colour={t.colours.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <Pressable testID="driver-cancel" style={styles.cancel} onPress={onClose} accessibilityRole="button">
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </SheetContainer>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: t.colours.border,
    },
    rowBody: { gap: 2, flexShrink: 1 },
    name: { ...TYPOGRAPHY.body, color: t.colours.text },
    current: { color: t.colours.primary, fontWeight: '600' },
    availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    availabilityDot: { width: 8, height: 8, borderRadius: 4 },
    availabilityDotAvailable: { backgroundColor: t.colours.statusDone },
    availabilityDotUnavailable: { backgroundColor: t.colours.textMuted },
    availability: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
    cancel: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm },
    cancelText: { ...TYPOGRAPHY.subheading, color: t.colours.primary },
  });
