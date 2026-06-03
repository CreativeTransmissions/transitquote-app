import { fireEvent, render, screen } from '@testing-library/react-native';
import { FirstSyncProgress } from '../FirstSyncProgress';

describe('FirstSyncProgress', () => {
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
});
