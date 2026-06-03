/**
 * Tests for JobStatusBadge — renders the status name, falling back to "Unknown" for a null status
 * (the wire can omit it). Colour resolution is delegated to resolveStatusColour (tested separately).
 */
import { render, screen } from '@testing-library/react-native';
import { JobStatusBadge } from '../JobStatusBadge';

describe('JobStatusBadge', () => {
  it('renders the status name', () => {
    render(<JobStatusBadge statusName="In Transit" />);
    expect(screen.getByText('In Transit')).toBeTruthy();
  });

  it('falls back to "Unknown" when the status is null', () => {
    render(<JobStatusBadge statusName={null} />);
    expect(screen.getByText('Unknown')).toBeTruthy();
  });
});
