import { Stack } from 'expo-router';

// Route-level error boundary for the auth segment (onboarding + login) (CLAUDE.md).
export { RouteErrorBoundary as ErrorBoundary } from '../../components/shared/RouteErrorBoundary';

/** Layout for the unauthenticated area — groups onboarding + login under one boundary. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
