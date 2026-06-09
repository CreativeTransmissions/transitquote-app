import { Stack } from 'expo-router';

/** Drivers tab stack — list root + driver detail push within the Drivers tab. */
export default function DriversStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
