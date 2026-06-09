/**
 * Tests for the shared Icon component:
 * - renders with the correct testID
 * - maps size prop to the correct numeric pixel size
 * - hides decorative icons from the accessibility tree
 * - exposes accessible icons with the provided label and role
 */

// MaterialCommunityIcons renders a native font glyph — stub it to a plain View so RNTL
// can render and query it without loading native font assets.
import { render, screen } from '@testing-library/react-native';
import { Icon } from '../Icon';
import { COLOURS } from '../../../constants';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: ({
      size,
      color,
      testID,
      accessible,
      importantForAccessibility,
      accessibilityLabel,
      accessibilityRole,
    }: {
      size?: number;
      color?: string;
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
        // Expose size/color as data-testids so assertions can read them.
        'data-size': size,
        'data-color': color,
      }),
    // glyphMap must exist for the IconName type to resolve.
     
    __esModule: true,
  } as any;
});

// Attach a minimal glyphMap so `keyof typeof MaterialCommunityIcons.glyphMap` compiles.
// This must come after jest.mock so the mock module is in scope.
const mockModule = require('@expo/vector-icons');
mockModule.MaterialCommunityIcons.glyphMap = { 'check': 1, 'chevron-right': 2, 'alert-circle': 3 };

describe('Icon', () => {
  it('renders and is queryable by testID', () => {
    render(<Icon name="check" testID="icon-check" />);
    expect(screen.getByTestId('icon-check')).toBeTruthy();
  });

  it('maps size "sm" → 16', () => {
    render(<Icon name="check" size="sm" testID="icon-sm" />);
    const el = screen.getByTestId('icon-sm');
    expect(el.props['data-size']).toBe(16);
  });

  it('maps size "md" → 20 (default)', () => {
    render(<Icon name="check" testID="icon-md" />);
    const el = screen.getByTestId('icon-md');
    expect(el.props['data-size']).toBe(20);
  });

  it('maps size "lg" → 28', () => {
    render(<Icon name="check" size="lg" testID="icon-lg" />);
    const el = screen.getByTestId('icon-lg');
    expect(el.props['data-size']).toBe(28);
  });

  it('uses COLOURS.text as the default colour', () => {
    render(<Icon name="check" testID="icon-colour" />);
    const el = screen.getByTestId('icon-colour');
    expect(el.props['data-color']).toBe(COLOURS.text);
  });

  it('passes a custom colour through', () => {
    render(<Icon name="check" colour="#FF0000" testID="icon-custom-colour" />);
    const el = screen.getByTestId('icon-custom-colour');
    expect(el.props['data-color']).toBe('#FF0000');
  });

  describe('accessibility — decorative (no label)', () => {
    it('sets accessible={false} when accessibilityLabel is omitted', () => {
      render(<Icon name="check" testID="icon-decorative" />);
      const el = screen.getByTestId('icon-decorative');
      expect(el.props.accessible).toBe(false);
    });

    it('sets importantForAccessibility="no" when accessibilityLabel is omitted', () => {
      render(<Icon name="check" testID="icon-decorative2" />);
      const el = screen.getByTestId('icon-decorative2');
      expect(el.props.importantForAccessibility).toBe('no');
    });
  });

  describe('accessibility — labelled', () => {
    it('sets accessible={true} when accessibilityLabel is provided', () => {
      render(<Icon name="check" accessibilityLabel="Confirmed" testID="icon-labelled" />);
      const el = screen.getByTestId('icon-labelled');
      expect(el.props.accessible).toBe(true);
    });

    it('passes the accessibilityLabel through', () => {
      render(<Icon name="check" accessibilityLabel="Confirmed" testID="icon-labelled2" />);
      const el = screen.getByTestId('icon-labelled2');
      expect(el.props.accessibilityLabel).toBe('Confirmed');
    });

    it('sets accessibilityRole="image" when labelled', () => {
      render(<Icon name="check" accessibilityLabel="Confirmed" testID="icon-role" />);
      const el = screen.getByTestId('icon-role');
      expect(el.props.accessibilityRole).toBe('image');
    });
  });
});
