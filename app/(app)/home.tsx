import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/shared/Button';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useRole } from '../../hooks/useRole';
import { useLogout } from '../../hooks/useLogout';
import { useAuthStore } from '../../stores/authStore';
import { fullName } from '../../utils/formatters';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

/**
 * Placeholder authenticated landing — confirms the auth + bootstrap round-trip works.
 * The real driver/dispatcher job lists replace this in the next slice.
 */
export default function HomeScreen() {
  const user = useCurrentUser();
  const { role, assignmentMode, driverId } = useRole();
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => router.replace('/login') });
  };

  const name = fullName(user?.firstName, user?.lastName);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Signed in</Text>

        <View style={styles.card}>
          <Row label="User" value={name || user?.firstName || '—'} />
          <Row label="Role" value={role ?? '—'} />
          <Row label="Assignment mode" value={assignmentMode} />
          <Row label="Driver ID" value={driverId != null ? String(driverId) : 'Not a driver'} />
          <Row label="Site" value={siteUrl ?? '—'} />
        </View>

        <Button label="Log out" variant="secondary" onPress={handleLogout} loading={logout.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOURS.background },
  content: { padding: SPACING.lg },
  title: { ...TYPOGRAPHY.title, color: COLOURS.text, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLOURS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLOURS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  rowLabel: { ...TYPOGRAPHY.body, color: COLOURS.textMuted },
  rowValue: { ...TYPOGRAPHY.body, color: COLOURS.text, flexShrink: 1, textAlign: 'right' },
});
