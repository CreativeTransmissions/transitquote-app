/**
 * Forgot-password screen (issue #14). Pre-fills the username passed from Sign in, submits to
 * the unauthenticated /reset_password route with the stored client credentials, and shows the
 * server's enumeration-safe confirmation. The reset itself completes in the browser via the
 * emailed link — the user then signs in with their new password.
 */
import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { Icon } from '../../components/shared/Icon';
import { TextField } from '../../components/shared/TextField';
import { useResetPassword } from '../../hooks/useResetPassword';
import { getApiErrorMessage } from '../../services/apiError';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ username?: string }>();
  const [username, setUsername] = useState(typeof params.username === 'string' ? params.username : '');
  const resetMutation = useResetPassword();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const handleSubmit = () => {
    if (username.trim() === '') return; // belt-and-braces with the Button's disabled guard
    resetMutation.mutate({ username });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Text style={styles.title}>Reset password</Text>

            {resetMutation.isSuccess ? (
              <>
                <View style={styles.successRow}>
                  <Icon name="email-check-outline" size="lg" colour={t.colours.primary} />
                  <Text style={styles.successText} testID="reset-success-message">
                    {resetMutation.data}
                  </Text>
                </View>
                <Text style={styles.hint}>
                  Follow the link in the email to choose a new password, then sign in here with it.
                </Text>
                <Button
                  testID="reset-back-to-login"
                  label="Back to sign in"
                  onPress={() => router.back()}
                />
              </>
            ) : (
              <>
                <Text style={styles.hint}>
                  Enter your username or email and we’ll send you a password reset link.
                </Text>

                <TextField
                  testID="reset-username"
                  label="Username or email"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                />

                {resetMutation.isError ? (
                  <Text style={styles.error} testID="reset-error">
                    {getApiErrorMessage(resetMutation.error)}
                  </Text>
                ) : null}

                <Button
                  testID="reset-submit"
                  label="Send reset link"
                  onPress={handleSubmit}
                  loading={resetMutation.isPending}
                  disabled={username.trim() === ''}
                />

                <Pressable
                  testID="reset-cancel"
                  onPress={() => router.back()}
                  disabled={resetMutation.isPending}
                  style={styles.cancel}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Icon name="arrow-left" size="sm" colour={t.colours.primary} />
                  <Text style={styles.cancelText}>Back to sign in</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colours.surface },
    flex: { flex: 1 },
    content: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center' },
    form: {
      backgroundColor: t.colours.background,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      gap: SPACING.sm,
      ...t.shadows.sm,
    },
    title: { ...TYPOGRAPHY.heading, color: t.colours.text, marginBottom: SPACING.xs },
    hint: { ...TYPOGRAPHY.body, color: t.colours.textMuted, marginBottom: SPACING.sm },
    successRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
    successText: { ...TYPOGRAPHY.body, color: t.colours.text, flex: 1 },
    error: { ...TYPOGRAPHY.caption, color: t.colours.danger, marginBottom: SPACING.md },
    cancel: { marginTop: SPACING.lg, alignItems: 'center', flexDirection: 'row', gap: SPACING.xs, justifyContent: 'center', minHeight: 44 },
    cancelText: { ...TYPOGRAPHY.body, color: t.colours.primary },
  });
