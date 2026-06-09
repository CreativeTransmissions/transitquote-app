/**
 * Thin wrapper around MaterialCommunityIcons that enforces the project size scale,
 * colour defaults, and accessibility contract.
 *
 * Accessibility:
 * - When `accessibilityLabel` is provided the icon is announced as an image with that label.
 * - When omitted the icon is hidden from the TalkBack/VoiceOver tree (decorative).
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLOURS } from '../../constants';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 28,
} as const;

interface IconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  colour?: string;
  accessibilityLabel?: string;
  testID?: string;
}

export function Icon({
  name,
  size = 'md',
  colour = COLOURS.text,
  accessibilityLabel,
  testID,
}: IconProps) {
  const px = SIZE_MAP[size];

  if (accessibilityLabel) {
    return (
      <MaterialCommunityIcons
        name={name}
        size={px}
        color={colour}
        testID={testID}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      />
    );
  }

  return (
    <MaterialCommunityIcons
      name={name}
      size={px}
      color={colour}
      testID={testID}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
