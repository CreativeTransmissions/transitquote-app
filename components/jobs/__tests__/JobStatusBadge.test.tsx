/**
 * Tests for JobStatusBadge — renders the status name, falling back to "Unknown" for a null status
 * (the wire can omit it). The tinted chip applies the status colour as background + text.
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

  it('renders with a statusTypeId prop (used for fallback colour cycle)', () => {
    render(<JobStatusBadge statusName="Custom Status" statusTypeId={3} />);
    expect(screen.getByText('Custom Status')).toBeTruthy();
  });

  it('always renders the status text (never colour-only — a11y invariant)', () => {
    render(<JobStatusBadge statusName="Delivered" />);
    // Text must be present — colour alone is insufficient for accessibility
    expect(screen.getByText('Delivered')).toBeTruthy();
  });

  it('caps font scaling on the label to 1.5 (A11y-3 dense chip)', () => {
    render(<JobStatusBadge statusName="In Transit" />);
    const label = screen.getByText('In Transit');
    expect(label.props.maxFontSizeMultiplier).toBe(1.5);
  });
});
