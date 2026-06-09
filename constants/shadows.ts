// Cross-platform elevation presets for subtle 3D depth. iOS reads the shadow* props;
// Android reads `elevation`. Spread a preset into a StyleSheet entry — no magic numbers.
// `brand` uses a green-tinted shadow to echo the website's glow on primary actions.
//
// Light + dark variants are exposed via the theme object (useTheme().shadows). Shadows are
// barely visible on dark surfaces, so the dark variant reduces opacity/elevation and leans
// on borders instead (per spec §3.5).
export const LIGHT_SHADOWS = {
  sm: {
    shadowColor: '#0D1D14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0D1D14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  brand: {
    shadowColor: '#419E61',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/** A single cross-platform elevation preset. */
export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/** Shadow set shape — both variants share these keys. */
export type ShadowSet = { [K in keyof typeof LIGHT_SHADOWS]: ShadowStyle };

// Dark variant: pure-black shadow, low opacity — depth comes mainly from surface/border tonality.
export const DARK_SHADOWS: ShadowSet = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 5,
  },
  brand: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// Legacy alias — light shadows. Kept for non-themed paths during the sweep.
export const SHADOWS = LIGHT_SHADOWS;
