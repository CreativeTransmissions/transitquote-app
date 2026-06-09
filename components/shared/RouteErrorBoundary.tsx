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
import { SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();
  const t = useTheme();

  return (
    <View
      testID="route-error-boundary"
      style={[
        styles.container,
        { backgroundColor: t.colours.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.colours.text }]}>Something went wrong</Text>
        <Text style={[styles.subtitle, { color: t.colours.textMuted }]}>
          This screen ran into an unexpected problem. Your data is safe — try again.
        </Text>
        <Text style={[styles.detail, { color: t.colours.danger }]} testID="route-error-message">
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
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  title: { ...TYPOGRAPHY.heading, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center' },
  detail: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
});
