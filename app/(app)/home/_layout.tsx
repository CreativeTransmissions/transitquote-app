import { Stack } from 'expo-router';

/** Profile tab stack — profile index + nested help screen. */
export default function HomeStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
