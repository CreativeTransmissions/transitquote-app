import { fireEvent, render, screen } from '@testing-library/react-native';
import { FirstSyncProgress } from '../FirstSyncProgress';

describe('FirstSyncProgress', () => {
  it('renders the first-run progress copy', () => {
    render(<FirstSyncProgress onCancel={jest.fn()} />);

    expect(screen.getByText('Setting up')).toBeTruthy();
    expect(screen.getByText('Syncing your jobs for the first time…')).toBeTruthy();
  });

  it('invokes onCancel when the user taps Cancel', () => {
    const onCancel = jest.fn();
    render(<FirstSyncProgress onCancel={onCancel} />);

    fireEvent.press(screen.getByTestId('first-sync-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
