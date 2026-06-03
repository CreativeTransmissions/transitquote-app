/** Smoke test for the auth segment layout — renders the Stack navigator. */
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Stack: () => React.createElement(Text, { testID: 'stack' }, 'STACK') };
});

import { render, screen } from '@testing-library/react-native';
import AuthLayout from '../_layout';

describe('AuthLayout', () => {
  it('renders the Stack navigator', () => {
    render(<AuthLayout />);
    expect(screen.getByTestId('stack')).toBeTruthy();
  });
});
