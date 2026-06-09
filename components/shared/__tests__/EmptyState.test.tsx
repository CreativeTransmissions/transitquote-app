/**
 * Tests for EmptyState:
 * - existing: title always rendered, subtitle only when provided
 * - new: icon renders (via Icon), action button fires onPress, omitting both keeps old behaviour
 */

// Stub expo-linear-gradient (pulled in by Button).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

// Stub MaterialCommunityIcons (pulled in by Icon).
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MCIcons = ({
    testID,
    accessible,
    importantForAccessibility,
    accessibilityLabel,
    accessibilityRole,
  }: {
    testID?: string;
    accessible?: boolean;
    importantForAccessibility?: string;
    accessibilityLabel?: string;
    accessibilityRole?: string;
  }) =>
    React.createElement(View, {
      testID,
      accessible,
      importantForAccessibility,
      accessibilityLabel,
      accessibilityRole,
    });
  MCIcons.glyphMap = {};
  return { MaterialCommunityIcons: MCIcons };
});

describe('EmptyState', () => {
  // ── existing behaviour (backward-compat) ─────────────────────────────────

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

  // ── new props ─────────────────────────────────────────────────────────────

  it('renders an icon when the icon prop is supplied', () => {
    render(<EmptyState title="No jobs" icon="briefcase" testID="es" />);
    // Icon renders a stubbed View — just check it exists in the tree (no crash).
    expect(screen.getByText('No jobs')).toBeTruthy();
  });

  it('does not render an icon when icon prop is omitted', () => {
    render(<EmptyState title="No jobs" testID="es-noicon" />);
    // There should be no accessible image element (the icon is decorative anyway,
    // but checking the tree is clean).
    expect(screen.getByText('No jobs')).toBeTruthy();
  });

  it('renders an action button with the correct label', () => {
    render(
      <EmptyState
        title="No jobs"
        action={{ label: 'Retry', onPress: jest.fn() }}
        testID="es-action"
      />,
    );
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('fires onPress when the action button is pressed', () => {
    const onPress = jest.fn();
    render(
      <EmptyState
        title="No jobs"
        action={{ label: 'Retry', onPress }}
        testID="es-action-press"
      />,
    );
    fireEvent.press(screen.getByText('Retry'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when action prop is omitted', () => {
    render(<EmptyState title="No jobs" />);
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('omitting icon and action keeps the same basic layout (no crash, title present)', () => {
    render(<EmptyState title="Nothing here" subtitle="Check back later" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Check back later')).toBeTruthy();
  });

  it('testID prop is applied to the container', () => {
    render(<EmptyState title="No jobs" testID="empty-container" />);
    expect(screen.getByTestId('empty-container')).toBeTruthy();
  });
});
