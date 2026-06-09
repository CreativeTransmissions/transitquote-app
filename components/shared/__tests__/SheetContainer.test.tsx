/**
 * Tests for SheetContainer — the shared bottom-sheet chrome.
 * Verifies: visible/hidden, title render, backdrop close, haptic on open.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SheetContainer } from '../SheetContainer';
import { hapticLight } from '../../../utils/haptics';

// Mock haptics so the test doesn't touch the real native module.
jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(() => Promise.resolve()),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderSheet(props: Partial<React.ComponentProps<typeof SheetContainer>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SheetContainer visible onClose={jest.fn()} {...props}>
        <Text testID="child-content">Sheet content</Text>
      </SheetContainer>
    </SafeAreaProvider>,
  );
}

describe('SheetContainer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders children when visible', () => {
    renderSheet();
    expect(screen.getByTestId('child-content')).toBeTruthy();
  });

  it('renders the title when provided', () => {
    renderSheet({ title: 'Pick something' });
    expect(screen.getByText('Pick something')).toBeTruthy();
  });

  it('does not render a title element when title is omitted', () => {
    renderSheet();
    // no crash — the optional title renders null
    expect(screen.queryByText('Pick something')).toBeNull();
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    renderSheet({ onClose });
    // The backdrop has accessibilityLabel="Close"
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fires hapticLight when visible transitions false→true', () => {
    const { rerender } = render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <SheetContainer visible={false} onClose={jest.fn()}>
          <Text>content</Text>
        </SheetContainer>
      </SafeAreaProvider>,
    );
    expect(hapticLight).not.toHaveBeenCalled();

    rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <SheetContainer visible={true} onClose={jest.fn()}>
          <Text>content</Text>
        </SheetContainer>
      </SafeAreaProvider>,
    );
    expect(hapticLight).toHaveBeenCalledTimes(1);
  });

  it('does not fire hapticLight when already visible on mount', () => {
    renderSheet({ visible: true });
    // Already visible — no false→true transition occurred.
    expect(hapticLight).not.toHaveBeenCalled();
  });

  it('backdrop has accessibilityRole="button"', () => {
    renderSheet();
    const backdrop = screen.getByLabelText('Close');
    expect(backdrop.props.accessibilityRole).toBe('button');
  });
});
