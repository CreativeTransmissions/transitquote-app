/**
 * Route-level error boundary fallback (Expo Router convention).
 *
 * Expo Router wraps any route/layout that exports a component named `ErrorBoundary`,
 * passing `{ error, retry }`. The host boundary is a class internally, so this stays a
 * functional component (per CLAUDE.md: no class components). Re-export it from a layout as
 * `export { RouteErrorBoundary as ErrorBoundary } from '...'` to guard that route segment.
 */
import type { ErrorBoundaryProps } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';
import { Button } from './Button';

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="route-error-boundary"
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          This screen ran into an unexpected problem. Your data is safe — try again.
        </Text>
        <Text style={styles.detail} testID="route-error-message">
          {error.message || 'Unknown error'}
        </Text>
        <View style={styles.action}>
          <Button label="Try again" onPress={retry} testID="route-error-retry" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  title: { ...TYPOGRAPHY.heading, color: COLOURS.text, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, color: COLOURS.textMuted, textAlign: 'center' },
  detail: {
    ...TYPOGRAPHY.caption,
    color: COLOURS.danger,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
});
