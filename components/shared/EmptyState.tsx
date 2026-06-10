/** Centered empty/error placeholder for lists and screens. */
import { StyleSheet, Text, View } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
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
  const t = useTheme();
  return (
    <View style={styles.container} testID={testID}>
      {icon ? <Icon name={icon} size="lg" colour={t.colours.textMuted} /> : null}
      <Text style={[styles.title, { color: t.colours.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: t.colours.textMuted }]}>{subtitle}</Text> : null}
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
  title: { ...TYPOGRAPHY.subheading, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center' },
  action: { marginTop: SPACING.sm, alignSelf: 'stretch' },
});
