/** Centered empty/error placeholder for lists and screens. */
import { StyleSheet, Text, View } from 'react-native';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';
import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  /** Icon rendered above the title at lg size (28dp) in textMuted colour. */
  icon?: IconName;
  /** Optional call-to-action rendered as a secondary Button below the subtitle. */
  action?: { label: string; onPress: () => void };
  testID?: string;
}

export function EmptyState({ title, subtitle, icon, action, testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      {icon ? (
        <Icon name={icon} size="lg" colour={COLOURS.textMuted} />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        </View>
      ) : null}
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
  action: { marginTop: SPACING.sm, alignSelf: 'stretch' },
});
