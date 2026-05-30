import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { TextField } from '../../components/shared/TextField';
import { useLogin } from '../../hooks/useLogin';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../services/apiError';
import { COLOURS, SPACING, TYPOGRAPHY } from '../../constants';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const loginMutation = useLogin();

  const handleSubmit = () => {
    loginMutation.mutate(
      { username, password },
      { onSuccess: () => router.replace('/home') },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {siteUrl ?? ''}
          </Text>

          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
          <TextField
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

          <Button label="Sign in" onPress={handleSubmit} loading={loginMutation.isPending} />

          <Pressable
            onPress={() => router.replace('/onboarding')}
            disabled={loginMutation.isPending}
            style={styles.changeSite}
          >
            <Text style={styles.changeSiteText}>Change site</Text>
          </Pressable>
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
  subtitle: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted, marginBottom: SPACING.lg },
  error: { ...TYPOGRAPHY.caption, color: COLOURS.danger, marginBottom: SPACING.md },
  changeSite: { marginTop: SPACING.lg, alignItems: 'center' },
  changeSiteText: { ...TYPOGRAPHY.body, color: COLOURS.primary },
});
