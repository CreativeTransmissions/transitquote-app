import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { Icon } from '../../components/shared/Icon';
import { TextField } from '../../components/shared/TextField';
import { useOnboarding } from '../../hooks/useOnboarding';
import { getApiErrorMessage } from '../../services/apiError';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

export default function OnboardingScreen() {
  const [siteUrl, setSiteUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [credExpanderOpen, setCredExpanderOpen] = useState(false);
  const onboarding = useOnboarding();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const handleSubmit = () => {
    onboarding.mutate(
      { siteUrl, clientId, clientSecret },
      { onSuccess: () => router.replace('/login') },
    );
  };

  const toggleCredExpander = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCredExpanderOpen((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Connect your site</Text>
          <Text style={styles.subtitle}>
            Enter your TransitTeam site URL and the API credentials provided by your administrator.
          </Text>

          {/* "What you'll need" helper card */}
          <View testID="onboarding-needs-card" style={styles.needsCard}>
            <View style={styles.needsHeader}>
              <Icon name="clipboard-check-outline" size="md" colour={t.colours.primary} />
              <Text style={styles.needsTitle}>{"What you'll need"}</Text>
            </View>
            <View style={styles.needsBullet}>
              <Icon name="circle-small" size="sm" colour={t.colours.primary} />
              <Text style={styles.needsText}>Your TransitTeam site address</Text>
            </View>
            <View style={styles.needsBullet}>
              <Icon name="circle-small" size="sm" colour={t.colours.primary} />
              <Text style={styles.needsText}>A Client ID and Secret from your administrator</Text>
            </View>
            <View style={styles.needsBullet}>
              <Icon name="circle-small" size="sm" colour={t.colours.primary} />
              <Text style={styles.needsText}>Your WordPress username and password</Text>
            </View>
          </View>

          <TextField
            testID="onboarding-site-url"
            label="Site URL"
            value={siteUrl}
            onChangeText={setSiteUrl}
            placeholder="https://yourcompany.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            helperText="Your full WordPress site address, e.g. https://courier.example.com"
          />

          <TextField
            testID="onboarding-client-id"
            label="Client ID"
            value={clientId}
            onChangeText={setClientId}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            testID="onboarding-client-secret"
            label="Client Secret"
            value={clientSecret}
            onChangeText={setClientSecret}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            helperText="Your administrator can find these under TransitTeam → API in WordPress."
          />

          {/* "What's this?" expander for credential fields */}
          <Pressable
            testID="onboarding-cred-expander"
            onPress={toggleCredExpander}
            accessibilityRole="button"
            accessibilityState={{ expanded: credExpanderOpen }}
            style={styles.expanderRow}
          >
            <Icon name="help-circle-outline" size="sm" colour={t.colours.primary} />
            <Text style={styles.expanderLabel}>{"What's this?"}</Text>
          </Pressable>
          {credExpanderOpen ? (
            <View testID="onboarding-cred-expander-content" style={styles.expanderContent}>
              <Text style={styles.expanderText}>
                {"TransitTeam connects this app to your company’s own WordPress site. The Client ID and Secret identify this app to your site — they’re created once by your administrator and shared with drivers."}
              </Text>
            </View>
          ) : null}

          {onboarding.isError ? (
            <Text style={styles.error}>{getApiErrorMessage(onboarding.error)}</Text>
          ) : null}

          <Button testID="onboarding-submit" label="Continue" onPress={handleSubmit} loading={onboarding.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.background },
    flex: { flex: 1 },
    content: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center', gap: SPACING.md },
    title: { ...TYPOGRAPHY.title, color: t.colours.text },
    subtitle: { ...TYPOGRAPHY.body, color: t.colours.textMuted },
    error: { ...TYPOGRAPHY.caption, color: t.colours.danger },
    needsCard: {
      backgroundColor: t.colours.surfaceAlt,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      gap: SPACING.xs,
    },
    needsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    needsTitle: { ...TYPOGRAPHY.body, color: t.colours.text, fontWeight: '600' as const },
    needsBullet: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    needsText: { ...TYPOGRAPHY.body, color: t.colours.textMuted, flex: 1 },
    expanderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    expanderLabel: { ...TYPOGRAPHY.caption, color: t.colours.primary },
    expanderContent: {
      backgroundColor: t.colours.surfaceAlt,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
    },
    expanderText: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
  });
