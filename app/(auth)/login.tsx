import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { Icon } from '../../components/shared/Icon';
import { TextField } from '../../components/shared/TextField';
import { useLogin } from '../../hooks/useLogin';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../services/apiError';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const loginMutation = useLogin();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

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
            colors={t.gradients.dark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              accessible={false}
              importantForAccessibility="no"
            />
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
              testID="login-forgot-password"
              onPress={() => router.push({ pathname: '/reset-password', params: { username } })}
              disabled={loginMutation.isPending}
              style={styles.changeSite}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Icon name="lock-reset" size="sm" colour={t.colours.primary} />
              <Text style={styles.changeSiteText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              testID="login-change-site"
              onPress={() => router.replace('/onboarding')}
              disabled={loginMutation.isPending}
              style={styles.changeSite}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Icon name="swap-horizontal" size="sm" colour={t.colours.primary} />
              <Text style={styles.changeSiteText}>Change site</Text>
            </Pressable>
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
    content: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center', gap: SPACING.lg },
    hero: {
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
      gap: SPACING.xs,
      alignItems: 'center',
      ...t.shadows.md,
    },
    logo: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.xs,
    },
    // Hero gradient is dark in both schemes, so its text stays white (onColour), not textInverse.
    brand: { ...TYPOGRAPHY.title, color: t.colours.onColour },
    heroSubtitle: { ...TYPOGRAPHY.caption, color: t.colours.onColour, opacity: 0.8 },
    form: {
      backgroundColor: t.colours.background,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      gap: SPACING.sm,
      ...t.shadows.sm,
    },
    title: { ...TYPOGRAPHY.heading, color: t.colours.text, marginBottom: SPACING.xs },
    error: { ...TYPOGRAPHY.caption, color: t.colours.danger, marginBottom: SPACING.md },
    changeSite: { marginTop: SPACING.lg, alignItems: 'center', flexDirection: 'row', gap: SPACING.xs, justifyContent: 'center', minHeight: 44 },
    changeSiteText: { ...TYPOGRAPHY.body, color: t.colours.primary },
  });
