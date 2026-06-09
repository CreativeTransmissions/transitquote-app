import { Stack } from 'expo-router';

/** Jobs tab stack — list root + job detail push within the Jobs tab. */
export default function JobsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
