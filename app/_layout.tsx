import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BootGate } from '../components/shared/BootGate';
import { useTheme } from '../hooks/useTheme';

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

/** StatusBar icon colour follows the resolved theme: dark icons on light, light on dark. */
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemedStatusBar />
      <QueryClientProvider client={queryClient}>
        <BootGate>
          <Stack screenOptions={{ headerShown: false }} />
        </BootGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
