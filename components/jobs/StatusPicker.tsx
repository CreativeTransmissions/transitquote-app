/** Bottom-sheet style modal listing the site's status types for a job status update. */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SheetContainer } from '../shared/SheetContainer';
import { Icon } from '../shared/Icon';
import { resolveStatusColour } from '../../utils/statusColours';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';
import type { StatusType } from '../../hooks/useStatusTypes';

interface StatusPickerProps {
  visible: boolean;
  statuses: StatusType[];
  currentStatusId: number | null;
  onSelect: (status: StatusType) => void;
  onClose: () => void;
}

export function StatusPicker({ visible, statuses, currentStatusId, onSelect, onClose }: StatusPickerProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Update status" maxHeightPct={0.7}>
      <ScrollView>
        {statuses.map((status) => {
          const isCurrent = status.id === currentStatusId;
          const dotColour = resolveStatusColour(status.name, String(status.id), t.colours);
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
              {isCurrent ? <Icon name="check" size="md" colour={t.colours.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable testID="status-cancel" style={styles.cancel} onPress={onClose} accessibilityRole="button">
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
      minHeight: 56,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colours.border,
      gap: SPACING.sm,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    rowText: { ...TYPOGRAPHY.body, color: t.colours.text, flex: 1 },
    current: { color: t.colours.primary, fontWeight: '600' },
    cancel: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm },
    cancelText: { ...TYPOGRAPHY.subheading, color: t.colours.primary },
  });
