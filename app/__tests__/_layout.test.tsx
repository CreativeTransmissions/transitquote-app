/**
 * Smoke test for the root layout — mounts the provider stack (SafeAreaProvider + QueryClient) and
 * renders the navigator behind the BootGate. BootGate is mocked to pass children through; Stack and
 * the status bar are stubbed.
 */
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Stack: () => React.createElement(Text, { testID: 'stack' }, 'STACK') };
});
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../components/shared/BootGate', () => ({
  BootGate: ({ children }: { children: React.ReactNode }) => children,
}));

import { render, screen } from '@testing-library/react-native';
import RootLayout from '../_layout';

describe('RootLayout', () => {
  it('renders the navigator inside the provider stack', () => {
    render(<RootLayout />);
    expect(screen.getByTestId('stack')).toBeTruthy();
  });
});
