/**
 * Gates the app on the boot sequence (migrations + session hydration). Renders a loading
 * indicator while booting and an error message if migrations fail; otherwise renders the app.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppBoot } from '../../hooks/useAppBoot';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';

interface BootGateProps {
  children: ReactNode;
}

export function BootGate({ children }: BootGateProps) {
  const { status, error } = useAppBoot();

  if (status === 'error') {
    return (
      <View style={styles.centre}>
        <Text style={styles.title}>Couldn’t start the app</Text>
        <Text style={styles.subtitle}>{error?.message ?? 'Database migration failed.'}</Text>
      </View>
    );
  }

  if (status === 'booting') {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={COLOURS.primary} />
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
    backgroundColor: COLOURS.background,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLOURS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLOURS.textMuted,
    textAlign: 'center',
  },
});
