/** Tests for EmptyState: title always, subtitle only when provided. */
import { render, screen } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the title and subtitle', () => {
    render(<EmptyState title="No jobs" subtitle="Pull to refresh" />);
    expect(screen.getByText('No jobs')).toBeTruthy();
    expect(screen.getByText('Pull to refresh')).toBeTruthy();
  });

  it('renders only the title when no subtitle is given', () => {
    render(<EmptyState title="No jobs" />);
    expect(screen.getByText('No jobs')).toBeTruthy();
    expect(screen.queryByText('Pull to refresh')).toBeNull();
  });
});
