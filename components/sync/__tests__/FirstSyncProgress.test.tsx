import { fireEvent, render, screen } from '@testing-library/react-native';
import { FirstSyncProgress } from '../FirstSyncProgress';

describe('FirstSyncProgress — full-screen layout (default)', () => {
  it('renders the indeterminate first-run copy while the list pulls', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} />);

    expect(screen.getByText('Setting up')).toBeTruthy();
    expect(screen.getByText('Syncing your jobs for the first time…')).toBeTruthy();
  });

  it('renders determinate detail progress once the detail phase begins', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} progress={{ done: 42, total: 120 }} />);

    expect(screen.getByText('Downloading job details… 42/120')).toBeTruthy();
    expect(screen.queryByText('Syncing your jobs for the first time…')).toBeNull();
  });

  it('falls back to the indeterminate copy when total is zero', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} progress={{ done: 0, total: 0 }} />);

    expect(screen.getByText('Syncing your jobs for the first time…')).toBeTruthy();
  });

  it('invokes onCancel when the user taps Cancel', () => {
    const onCancel = jest.fn();
    render(<FirstSyncProgress onCancel={onCancel} />);

    fireEvent.press(screen.getByTestId('first-sync-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('spinner has accessibilityLabel "Setting up"', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} />);
    expect(screen.getByLabelText('Setting up')).toBeTruthy();
  });
});

describe('FirstSyncProgress — compact variant (above skeleton cards)', () => {
  it('renders in compact mode without crashing', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} compact />);
    expect(screen.getByTestId('first-sync-progress')).toBeTruthy();
  });

  it('shows "Setting up…" compact text while indeterminate', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} compact />);
    expect(screen.getByText('Setting up…')).toBeTruthy();
  });

  it('shows compact progress text with done/total during the detail phase', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} compact progress={{ done: 20, total: 80 }} />);
    expect(screen.getByText(/Setting up — downloading job details… 20\/80/)).toBeTruthy();
  });

  it('has the Cancel button in compact mode with correct testID', () => {
    const onCancel = jest.fn();
    render(<FirstSyncProgress onCancel={onCancel} compact />);
    fireEvent.press(screen.getByTestId('first-sync-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('spinner has accessibilityLabel "Setting up" in compact mode', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} compact />);
    expect(screen.getByLabelText('Setting up')).toBeTruthy();
  });
});
