/**
 * Help & About screen (H-5).
 *
 * Four plain-language sections explaining how the app works, followed by an
 * About card showing the app version and active site URL.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Icon } from '../../../components/shared/Icon';
import { useAuthStore } from '../../../stores/authStore';
import { useTheme, type Theme } from '../../../hooks/useTheme';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Your data lives on your phone',
    body: 'The app reads everything from a local copy, so lists and job details open instantly and work without signal.',
  },
  {
    heading: 'Syncing happens in the background',
    body: 'Changes upload automatically; new jobs download when the app is open or refreshed. The spinner next to the Jobs title means a sync is running.',
  },
  {
    heading: 'Pending and failed updates',
    body: "Offline changes queue with a ‘Pending sync’ label and send automatically when you’re back online. ‘Update failed’ means the server rejected a change — open it to retry or discard.",
  },
  {
    heading: 'Who sees what',
    body: 'Drivers see their own jobs (plus an Available tab when self-assignment is on). Dispatchers see all jobs, drivers, and customers.',
  },
];

export default function HelpScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          testID="help-back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size="lg" colour={t.colours.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>How this app works</Text>

        {SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue} testID="help-version">{version}</Text>
          </View>
          {siteUrl ? (
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Site</Text>
              <Text style={styles.aboutValue} numberOfLines={1} testID="help-site">{siteUrl}</Text>
            </View>
          ) : null}
          <Text style={styles.adminNote}>
            Questions about your account or credentials? Contact your site administrator.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.background },
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
    content: { padding: SPACING.lg, gap: SPACING.lg },
    title: { ...TYPOGRAPHY.title, color: t.colours.text },
    section: { gap: SPACING.xs },
    sectionHeading: { ...TYPOGRAPHY.subheading, color: t.colours.text },
    sectionBody: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    aboutCard: {
      backgroundColor: t.colours.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: t.colours.border,
      padding: SPACING.md,
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    aboutTitle: { ...TYPOGRAPHY.subheading, color: t.colours.text },
    aboutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: SPACING.md,
    },
    aboutLabel: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    aboutValue: { ...TYPOGRAPHY.body, color: t.colours.text, flexShrink: 1, textAlign: 'right' },
    adminNote: { ...TYPOGRAPHY.caption, color: t.colours.textMuted, marginTop: SPACING.xs },
  });
