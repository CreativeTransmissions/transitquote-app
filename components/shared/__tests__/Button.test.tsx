/**
 * Tests for the shared Button: label vs loading spinner, the disabled/loading press guard, and
 * the secondary variant. The gradient is a presentation detail (mocked to a plain view).
 */
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement(View, props, children) };
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} testID="btn" />);
    expect(screen.getByText('Save')).toBeTruthy();
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('hides the label and shows a spinner while loading', () => {
    render(<Button label="Save" onPress={jest.fn()} loading testID="btn" />);
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('does not fire onPress while loading', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} loading testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders the secondary variant label', () => {
    render(<Button label="Cancel" onPress={jest.fn()} variant="secondary" testID="btn" />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });
});
