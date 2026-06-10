/**
 * StatusGlossarySheet (H-6) — plain-language status glossary.
 *
 * Lists the site's status types in id order, each with a semantic colour dot
 * (via resolveStatusColour) and the status name. Uses the same useStatusTypes
 * hook as StatusPicker — no duplicated query logic.
 */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SheetContainer } from '../shared/SheetContainer';
import { resolveStatusColour } from '../../utils/statusColours';
import { useStatusTypes } from '../../hooks/useStatusTypes';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../constants';

interface StatusGlossarySheetProps {
  visible: boolean;
  onClose: () => void;
}

export function StatusGlossarySheet({ visible, onClose }: StatusGlossarySheetProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const statuses = useStatusTypes();

  // Statuses are already ordered by id from the DB query; sort defensively to guarantee it.
  const sorted = useMemo(() => [...statuses].sort((a, b) => a.id - b.id), [statuses]);

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Job statuses" maxHeightPct={0.6}>
      <ScrollView>
        {sorted.map((status) => {
          const dotColour = resolveStatusColour(status.name, String(status.id), t.colours);
          return (
            <View key={status.id} style={styles.row} testID={`glossary-status-${status.id}`}>
              <View style={[styles.dot, { backgroundColor: dotColour }]} />
              <Text style={styles.name}>{status.name}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SheetContainer>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colours.border,
      gap: SPACING.sm,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    name: { ...TYPOGRAPHY.body, color: t.colours.text, flex: 1 },
  });
