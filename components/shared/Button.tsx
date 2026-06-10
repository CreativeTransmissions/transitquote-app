/** Primary/secondary action button with a loading state. Reusable across screens.
 *  Primary renders a brand gradient with a green-tinted shadow for a subtle 3D lift. */
import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

export function Button({ label, onPress, loading = false, disabled = false, variant = 'primary', testID }: ButtonProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  const content = loading ? (
    <ActivityIndicator color={isPrimary ? t.colours.textInverse : t.colours.primary} />
  ) : (
    <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>{label}</Text>
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.shadow,
        isPrimary && t.shadows.brand,
        (isDisabled || pressed) && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      {isPrimary ? (
        <LinearGradient colors={t.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.base}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.base, styles.secondary]}>{content}</View>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    // Holds the shadow + clips children to the radius; backgroundColor gives Android elevation a surface.
    shadow: {
      borderRadius: RADIUS.md,
      backgroundColor: t.colours.primary,
    },
    base: {
      minHeight: 56,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.lg,
      overflow: 'hidden',
    },
    secondary: {
      backgroundColor: t.colours.surface,
      borderWidth: 1,
      borderColor: t.colours.border,
    },
    dimmed: {
      opacity: 0.6,
    },
    pressed: {
      transform: [{ scale: 0.98 }],
    },
    label: {
      ...TYPOGRAPHY.subheading,
    },
    labelPrimary: {
      color: t.colours.textInverse,
    },
    labelSecondary: {
      color: t.colours.primary,
    },
  });
