/**
 * Tests for HintCard:
 * - renders the message
 * - dismiss button fires onDismiss
 * - dismiss button has the correct accessibilityLabel
 * - testID is forwarded to the container
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HintCard } from '../HintCard';

describe('HintCard', () => {
  it('renders the message text', () => {
    render(<HintCard message="Here is a helpful tip." onDismiss={jest.fn()} />);
    expect(screen.getByText('Here is a helpful tip.')).toBeTruthy();
  });

  it('fires onDismiss when the dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    render(<HintCard message="Tip" onDismiss={onDismiss} />);
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss hint' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss button has accessibilityLabel "Dismiss hint"', () => {
    render(<HintCard message="Tip" onDismiss={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Dismiss hint' })).toBeTruthy();
  });

  it('forwards testID to the container', () => {
    render(<HintCard message="Tip" onDismiss={jest.fn()} testID="hint-card" />);
    expect(screen.getByTestId('hint-card')).toBeTruthy();
  });
});
