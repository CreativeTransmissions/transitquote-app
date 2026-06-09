/** Smoke test for the auth segment layout — renders the Stack navigator. */
import { render, screen } from '@testing-library/react-native';
import AuthLayout from '../_layout';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Stack: () => React.createElement(Text, { testID: 'stack' }, 'STACK') };
});

describe('AuthLayout', () => {
  it('renders the Stack navigator', () => {
    render(<AuthLayout />);
    expect(screen.getByTestId('stack')).toBeTruthy();
  });
});
