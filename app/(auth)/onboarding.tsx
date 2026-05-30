import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { TextField } from '../../components/shared/TextField';
import { useOnboarding } from '../../hooks/useOnboarding';
import { getApiErrorMessage } from '../../services/apiError';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';

export default function OnboardingScreen() {
  const [siteUrl, setSiteUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const onboarding = useOnboarding();

  const handleSubmit = () => {
    onboarding.mutate(
      { siteUrl, clientId, clientSecret },
      { onSuccess: () => router.replace('/login') },
    );
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

          <TextField
            label="Site URL"
            value={siteUrl}
            onChangeText={setSiteUrl}
            placeholder="https://yourcompany.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TextField
            label="Client ID"
            value={clientId}
            onChangeText={setClientId}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="Client Secret"
            value={clientSecret}
            onChangeText={setClientSecret}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          {onboarding.isError ? (
            <Text style={styles.error}>{getApiErrorMessage(onboarding.error)}</Text>
          ) : null}

          <Button label="Continue" onPress={handleSubmit} loading={onboarding.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  flex: { flex: 1 },
  content: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center' },
  title: { ...TYPOGRAPHY.title, color: COLOURS.text, marginBottom: SPACING.xs },
  subtitle: { ...TYPOGRAPHY.body, color: COLOURS.textMuted, marginBottom: SPACING.lg },
  error: { ...TYPOGRAPHY.caption, color: COLOURS.danger, marginBottom: SPACING.md },
});
