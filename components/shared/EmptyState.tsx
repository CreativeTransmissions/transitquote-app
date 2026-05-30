/** Centered empty/error placeholder for lists and screens. */
import { StyleSheet, Text, View } from 'react-native';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.xs,
  },
  title: { ...TYPOGRAPHY.subheading, color: COLOURS.text, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, color: COLOURS.textMuted, textAlign: 'center' },
});
