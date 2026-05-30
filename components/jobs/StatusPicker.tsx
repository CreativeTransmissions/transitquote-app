/** Bottom-sheet style modal listing the site's status types for a job status update. */
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import type { StatusType } from '../../hooks/useStatusTypes';

interface StatusPickerProps {
  visible: boolean;
  statuses: StatusType[];
  currentStatusId: number | null;
  onSelect: (status: StatusType) => void;
  onClose: () => void;
}

export function StatusPicker({ visible, statuses, currentStatusId, onSelect, onClose }: StatusPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Update status</Text>
          <ScrollView>
            {statuses.map((status) => {
              const isCurrent = status.id === currentStatusId;
              return (
                <Pressable
                  key={status.id}
                  style={styles.row}
                  accessibilityRole="button"
                  onPress={() => onSelect(status)}
                >
                  <Text style={[styles.rowText, isCurrent && styles.current]}>{status.name}</Text>
                  {isCurrent ? <Text style={styles.tick}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
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
  rowText: { ...TYPOGRAPHY.body, color: COLOURS.text },
  current: { color: COLOURS.primary, fontWeight: '600' },
  tick: { ...TYPOGRAPHY.body, color: COLOURS.primary },
  cancel: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm },
  cancelText: { ...TYPOGRAPHY.subheading, color: COLOURS.primary },
});
