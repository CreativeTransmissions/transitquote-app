/**
 * OutboxToast — appears on the 0→n offline transition, auto-hides after 4s (fake timers),
 * shows at most once per session.
 */
import { act, render, screen } from '@testing-library/react-native';
import { OutboxToast, _resetOutboxToastSession } from '../OutboxToast';

import { hapticLight } from '../../../utils/haptics';

let mockPendingCount = 0;
let mockIsOnline = false;

jest.mock('../../../hooks/useOutbox', () => ({
  useOutbox: () => ({ pendingCount: mockPendingCount, failed: [], stateByJob: new Map(), items: [] }),
}));
jest.mock('../../../stores/connectivityStore', () => ({
  useConnectivityStore: (sel: (s: unknown) => unknown) => sel({ isOnline: mockIsOnline }),
}));
jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(),
}));
const mockHaptic = hapticLight as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  _resetOutboxToastSession();
  mockPendingCount = 0;
  mockIsOnline = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('OutboxToast', () => {
  it('does not trigger the haptic when the pending count starts at zero (no transition)', () => {
    mockPendingCount = 0;
    render(<OutboxToast />);
    // The toast element is always mounted (for animation), but no haptic should fire
    // when there is no 0→>0 transition.
    expect(mockHaptic).not.toHaveBeenCalled();
  });

  it('renders the toast text node (always mounted for animation)', () => {
    mockPendingCount = 0;
    render(<OutboxToast />);
    // The Animated.View is always in the DOM (opacity 0 until triggered).
    // The text is mounted so Animated can transition it in.
    expect(screen.getByTestId('outbox-toast')).toBeTruthy();
    expect(screen.getByText("Saved — will sync when you're back online")).toBeTruthy();
  });

  it('fires the animation (haptic) when transitioning 0→>0 while offline', () => {
    mockPendingCount = 0;
    const { rerender } = render(<OutboxToast />);

    mockPendingCount = 1;
    rerender(<OutboxToast />);

    expect(mockHaptic).toHaveBeenCalledTimes(1);
  });

  it('fires hapticLight when the toast appears', () => {
    mockPendingCount = 0;
    const { rerender } = render(<OutboxToast />);

    mockPendingCount = 1;
    rerender(<OutboxToast />);

    expect(mockHaptic).toHaveBeenCalledTimes(1);
  });

  it('does NOT show when the transition happens while online', () => {
    mockIsOnline = true;
    mockPendingCount = 0;
    const { rerender } = render(<OutboxToast />);

    mockPendingCount = 1;
    rerender(<OutboxToast />);

    expect(mockHaptic).not.toHaveBeenCalled();
  });

  it('shows the toast at most once per session even with multiple 0→>0 transitions', () => {
    mockPendingCount = 0;
    const { rerender } = render(<OutboxToast />);

    // First trigger
    mockPendingCount = 1;
    rerender(<OutboxToast />);
    act(() => jest.runAllTimers());
    expect(mockHaptic).toHaveBeenCalledTimes(1);

    // Reset to zero then trigger again — should NOT show a second time.
    mockPendingCount = 0;
    rerender(<OutboxToast />);
    mockPendingCount = 2;
    rerender(<OutboxToast />);

    // Haptic called only once total (from the first trigger)
    expect(mockHaptic).toHaveBeenCalledTimes(1);
  });

  it('renders the testID for integration queries', () => {
    render(<OutboxToast />);
    expect(screen.getByTestId('outbox-toast')).toBeTruthy();
  });
});
