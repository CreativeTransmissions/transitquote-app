/** Primary/secondary action button with a loading state. Reusable across screens. */
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onPress, loading = false, disabled = false, variant = 'primary' }: ButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (isDisabled || pressed) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? COLOURS.background : COLOURS.primary} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  primary: {
    backgroundColor: COLOURS.primary,
  },
  secondary: {
    backgroundColor: COLOURS.surface,
    borderWidth: 1,
    borderColor: COLOURS.border,
  },
  dimmed: {
    opacity: 0.6,
  },
  label: {
    ...TYPOGRAPHY.subheading,
  },
  labelPrimary: {
    color: COLOURS.background,
  },
  labelSecondary: {
    color: COLOURS.primary,
  },
});
