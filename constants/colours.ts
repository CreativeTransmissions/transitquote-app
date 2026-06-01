// App-wide colour palette. No hardcoded colours in components — reference these.
// Derived from the TransitQuote website brand (transitquote-theme): a green identity
// (#419e61) with a bright accent and deep-green ink. Mirrors the site so the app feels
// like part of the same product.
export const COLOURS = {
  primary: '#419E61', // brand green
  primaryDark: '#2D7045', // pressed / deep green
  primaryLight: '#5BC47D', // bright accent green (gradient end)
  accent: '#FF9C2A', // orange highlight (sparingly — CTAs, badges)
  background: '#FFFFFF',
  surface: '#F2F5F4', // green-tinted off-white panel
  surfaceAlt: '#E8F5ED', // light green tint (selected / pressed)
  border: '#D9E2DD', // grey-green hairline
  text: '#0D1D14', // near-black green ink
  textMuted: '#5F6F66', // muted green-grey
  textInverse: '#FFFFFF',
  success: '#2E7D32',
  warning: '#ED6C02',
  danger: '#D32F2F',
  offline: '#9E9E9E',
} as const;

// Gradient colour stops for expo-linear-gradient `colors` props. Kept as readonly tuples
// so the LinearGradient type (≥2 colour stops) is satisfied without casts.
export const GRADIENTS = {
  primary: ['#419E61', '#5BC47D'], // left→right brand sweep (buttons)
  primaryDeep: ['#419E61', '#2D7045'], // top→bottom, more depth
  dark: ['#0D1D14', '#1A3322'], // dark hero / header
  card: ['#FFFFFF', '#F2F5F4'], // subtle card lift
  surface: ['#F8FDF9', '#FFFFFF'], // screen background wash
  screen: ['#EAF6EE', '#FFFFFF'], // very light green → white wash behind list cards
} as const;

// Job status colours are resolved at runtime from configuration.status_types (per-site,
// not hardcodable). This is the *fallback* palette cycled by status index for unknown statuses.
export const STATUS_FALLBACK_COLOURS = [
  '#9E9E9E', // pending / unknown
  '#419E61', // assigned (brand green)
  '#FF9C2A', // in transit (accent orange)
  '#2D7045', // delivered (deep green)
] as const;
