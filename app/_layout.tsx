import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BootGate } from '../components/shared/BootGate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <BootGate>
          <Stack screenOptions={{ headerShown: false }} />
        </BootGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
