import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

/**
 * Entry guard. BootGate has already run migrations + session hydration before this renders,
 * so `status` is settled here. Routes to the right starting screen based on session state.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const siteUrl = useAuthStore((s) => s.siteUrl);

  if (status === 'authenticated') return <Redirect href="/home" />;
  if (!siteUrl) return <Redirect href="/onboarding" />;
  return <Redirect href="/login" />;
}
