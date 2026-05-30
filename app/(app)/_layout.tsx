import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

/** Protected layout — bounces to login if the session is not authenticated. */
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);

  if (status !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
