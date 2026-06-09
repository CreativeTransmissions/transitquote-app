import { Stack } from 'expo-router';

/** Customers tab stack — list root + customer detail push within the Customers tab. */
export default function CustomersStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
