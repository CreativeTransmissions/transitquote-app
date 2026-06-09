/**
 * Dismissible inline hint card — shown on first run to orient the user.
 * Surfaced in the Jobs screen header once, then dismissed permanently (per site).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { Icon } from './Icon';

interface HintCardProps {
  message: string;
  onDismiss: () => void;
  testID?: string;
}

export function HintCard({ message, onDismiss, testID }: HintCardProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Icon name="lightbulb-outline" size="md" colour={COLOURS.primary} />
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss hint"
        hitSlop={8}
        style={styles.dismiss}
      >
        <Icon name="close" size="md" colour={COLOURS.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOURS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  message: {
    ...TYPOGRAPHY.caption,
    color: COLOURS.text,
    flex: 1,
  },
  dismiss: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
