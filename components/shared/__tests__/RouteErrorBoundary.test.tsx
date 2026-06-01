import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderBoundary(error: Error, retry = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <RouteErrorBoundary error={error} retry={retry} />
    </SafeAreaProvider>,
  );
}

describe('RouteErrorBoundary', () => {
  it('renders the fallback with the thrown error message', () => {
    renderBoundary(new Error('boom: pull failed'));

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByTestId('route-error-message')).toHaveTextContent('boom: pull failed');
  });

  it('falls back to a generic message when the error has none', () => {
    renderBoundary(new Error(''));

    expect(screen.getByTestId('route-error-message')).toHaveTextContent('Unknown error');
  });

  it('invokes retry when the user taps "Try again"', () => {
    const retry = jest.fn();
    renderBoundary(new Error('boom'), retry);

    fireEvent.press(screen.getByTestId('route-error-retry'));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
