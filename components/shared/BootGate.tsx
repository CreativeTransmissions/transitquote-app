/**
 * Gates the app on the boot sequence (migrations + session hydration). Renders a loading
 * indicator while booting and an error message if migrations fail; otherwise renders the app.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppBoot } from '../../hooks/useAppBoot';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../constants';

interface BootGateProps {
  children: ReactNode;
}

export function BootGate({ children }: BootGateProps) {
  const { status, error } = useAppBoot();
  const t = useTheme();

  if (status === 'error') {
    return (
      <View style={[styles.centre, { backgroundColor: t.colours.background }]}>
        <Text style={[styles.title, { color: t.colours.text }]}>Couldn’t start the app</Text>
        <Text style={[styles.subtitle, { color: t.colours.textMuted }]}>
          {error?.message ?? 'Database migration failed.'}
        </Text>
      </View>
    );
  }

  if (status === 'booting') {
    return (
      <View style={[styles.centre, { backgroundColor: t.colours.background }]}>
        <ActivityIndicator size="large" color={t.colours.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
});
