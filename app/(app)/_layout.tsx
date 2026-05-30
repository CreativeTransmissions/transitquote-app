import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useConnectivity } from '../../hooks/useConnectivity';

/** Protected layout — tracks connectivity and bounces to login if not authenticated. */
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  useConnectivity(); // keep online/offline state fresh across the authenticated area

  if (status !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
