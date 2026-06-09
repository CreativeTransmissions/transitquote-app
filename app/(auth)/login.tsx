import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { TextField } from '../../components/shared/TextField';
import { useLogin } from '../../hooks/useLogin';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../services/apiError';
import { COLOURS, GRADIENTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const loginMutation = useLogin();

  const handleSubmit = () => {
    loginMutation.mutate(
      { username, password },
      { onSuccess: () => router.replace('/jobs') },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={GRADIENTS.dark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.brand}>TransitTeam</Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {siteUrl ?? ''}
            </Text>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.title}>Sign in</Text>

            <TextField
            testID="login-username"
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
          <TextField
            testID="login-password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="password"
          />

          {loginMutation.isError ? (
            <Text style={styles.error}>{getApiErrorMessage(loginMutation.error)}</Text>
          ) : null}

          <Button testID="login-submit" label="Sign in" onPress={handleSubmit} loading={loginMutation.isPending} />

            <Pressable
              testID="login-change-site"
              onPress={() => router.replace('/onboarding')}
              disabled={loginMutation.isPending}
              style={styles.changeSite}
              accessibilityRole="button"
            >
              <Text style={styles.changeSiteText}>Change site</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.surface },
  flex: { flex: 1 },
  content: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center', gap: SPACING.lg },
  hero: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
    ...SHADOWS.md,
  },
  brand: { ...TYPOGRAPHY.title, color: COLOURS.textInverse },
  heroSubtitle: { ...TYPOGRAPHY.caption, color: COLOURS.surfaceAlt },
  form: {
    backgroundColor: COLOURS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  title: { ...TYPOGRAPHY.heading, color: COLOURS.text, marginBottom: SPACING.xs },
  error: { ...TYPOGRAPHY.caption, color: COLOURS.danger, marginBottom: SPACING.md },
  changeSite: { marginTop: SPACING.lg, alignItems: 'center' },
  changeSiteText: { ...TYPOGRAPHY.body, color: COLOURS.primary },
});
