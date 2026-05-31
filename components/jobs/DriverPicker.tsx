/** Bottom-sheet modal listing assignable drivers for a job assignment (spec §6.5 E). */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../shared/EmptyState';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Assign driver</Text>
          {drivers.length === 0 ? (
            <EmptyState title="No drivers available" subtitle="You don’t have permission to assign this job." />
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
                    onPress={() => onSelect(driver)}
                  >
                    <View style={styles.rowBody}>
                      <Text style={[styles.name, isCurrent && styles.current]}>
                        {fullName(driver.firstName, driver.lastName) || `Driver ${driver.id}`}
                      </Text>
                      <Text style={styles.availability}>{driver.available ? 'Available' : 'Unavailable'}</Text>
                    </View>
                    {isCurrent ? <Text style={styles.tick}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Pressable testID="driver-cancel" style={styles.cancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
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
    maxHeight: '70%',
  },
  title: { ...TYPOGRAPHY.heading, color: COLOURS.text, marginBottom: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.border,
  },
  rowBody: { gap: 2, flexShrink: 1 },
  name: { ...TYPOGRAPHY.body, color: COLOURS.text },
  current: { color: COLOURS.primary, fontWeight: '600' },
  availability: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
  tick: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  cancel: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm },
  cancelText: { ...TYPOGRAPHY.subheading, color: COLOURS.primary },
});
