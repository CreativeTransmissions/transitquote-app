/**
 * Thin wrapper around MaterialCommunityIcons that enforces the project size scale,
 * colour defaults, and accessibility contract.
 *
 * Accessibility:
 * - When `accessibilityLabel` is provided the icon is announced as an image with that label.
 * - When omitted the icon is hidden from the TalkBack/VoiceOver tree (decorative).
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

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
  colour,
  accessibilityLabel,
  testID,
}: IconProps) {
  const t = useTheme();
  const px = SIZE_MAP[size];
  // Default to the themed text colour when no explicit colour token is supplied.
  const resolvedColour = colour ?? t.colours.text;

  if (accessibilityLabel) {
    return (
      <MaterialCommunityIcons
        name={name}
        size={px}
        color={resolvedColour}
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
      color={resolvedColour}
      testID={testID}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
