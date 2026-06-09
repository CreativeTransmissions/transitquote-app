/**
 * Tests for the entry guard (app/index.tsx). BootGate has already settled session state before this
 * renders, so it just routes: authenticated → /jobs, no site configured → /onboarding, else → /login.
 */
import { render, screen } from '@testing-library/react-native';
import Index from '../index';

let mockAuthState: { status: string; siteUrl: string | null };

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Redirect: ({ href }: { href: string }) => React.createElement(Text, { testID: 'redirect' }, href) };
});
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel(mockAuthState),
}));

describe('Index entry guard', () => {
  it('redirects an authenticated user to /jobs', () => {
    mockAuthState = { status: 'authenticated', siteUrl: 'https://acme.example' };
    render(<Index />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/jobs');
  });

  it('redirects to /onboarding when no site is configured', () => {
    mockAuthState = { status: 'unauthenticated', siteUrl: null };
    render(<Index />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/onboarding');
  });

  it('redirects to /login when a site is configured but not authenticated', () => {
    mockAuthState = { status: 'unauthenticated', siteUrl: 'https://acme.example' };
    render(<Index />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/login');
  });
});
