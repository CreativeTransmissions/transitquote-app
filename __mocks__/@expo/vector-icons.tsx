/**
 * Manual Jest mock for @expo/vector-icons.
 *
 * Replaces all icon family exports with a plain React Native View so tests can render
 * components that include icons without loading native font assets.
 *
 * Only MaterialCommunityIcons (used by Icon.tsx) is needed, but all common families are
 * stubbed to avoid "Cannot find module" errors from any import site.
 */
 
import React from 'react';
import { View } from 'react-native';

type IconProps = {
  name?: string;
  size?: number;
  color?: string;
  testID?: string;
  accessible?: boolean;
  importantForAccessibility?: string;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  [key: string]: unknown;
};

function createIconStub(displayName: string) {
  function IconStub(props: IconProps) {
    const { name: _name, size: _size, color: _color, ...rest } = props;
    // Pass size/color as extra props via any-cast so RNTL tests can read them off
    // props['data-size'] / props['data-color'] while TypeScript stays clean elsewhere.
    return React.createElement(View as any, {
      ...rest,
      'data-size': _size,
      'data-color': _color,
    });
  }
  IconStub.displayName = displayName;
  // glyphMap must exist so `keyof typeof MaterialCommunityIcons.glyphMap` resolves in types.
  (IconStub as unknown as { glyphMap: Record<string, number> }).glyphMap = {};
  return IconStub;
}

export const MaterialCommunityIcons = createIconStub('MaterialCommunityIcons');
export const MaterialIcons = createIconStub('MaterialIcons');
export const Ionicons = createIconStub('Ionicons');
export const FontAwesome = createIconStub('FontAwesome');
export const FontAwesome5 = createIconStub('FontAwesome5');
export const AntDesign = createIconStub('AntDesign');
export const Feather = createIconStub('Feather');
export const Entypo = createIconStub('Entypo');
export const EvilIcons = createIconStub('EvilIcons');
export const Octicons = createIconStub('Octicons');
export const SimpleLineIcons = createIconStub('SimpleLineIcons');
export const Foundation = createIconStub('Foundation');
export const Fontisto = createIconStub('Fontisto');
export const Zocial = createIconStub('Zocial');
