import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BootGate } from '../components/shared/BootGate';

// Route-level error boundary for the root segment — the ultimate catch-all (CLAUDE.md).
export { RouteErrorBoundary as ErrorBoundary } from '../components/shared/RouteErrorBoundary';

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
