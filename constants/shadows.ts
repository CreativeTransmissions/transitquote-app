// Cross-platform elevation presets for subtle 3D depth. iOS reads the shadow* props;
// Android reads `elevation`. Spread a preset into a StyleSheet entry — no magic numbers.
// `brand` uses a green-tinted shadow to echo the website's glow on primary actions.
export const SHADOWS = {
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
