/** Bottom-sheet style modal listing the site's status types for a job status update. */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../shared/Icon';
import { resolveStatusColour } from '../../utils/statusColours';
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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: SPACING.lg + insets.bottom }]}>
          <Text style={styles.title}>Update status</Text>
          <ScrollView>
            {statuses.map((status) => {
              const isCurrent = status.id === currentStatusId;
              const dotColour = resolveStatusColour(status.name, String(status.id));
              return (
                <Pressable
                  key={status.id}
                  testID={`status-option-${status.id}`}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  onPress={() => onSelect(status)}
                >
                  <View style={[styles.statusDot, { backgroundColor: dotColour }]} />
                  <Text style={[styles.rowText, isCurrent && styles.current]}>{status.name}</Text>
                  {isCurrent ? <Icon name="check" size="md" colour={COLOURS.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable testID="status-cancel" style={styles.cancel} onPress={onClose} accessibilityRole="button">
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
    minHeight: 56,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.border,
    gap: SPACING.sm,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { ...TYPOGRAPHY.body, color: COLOURS.text, flex: 1 },
  current: { color: COLOURS.primary, fontWeight: '600' },
  cancel: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm },
  cancelText: { ...TYPOGRAPHY.subheading, color: COLOURS.primary },
});
