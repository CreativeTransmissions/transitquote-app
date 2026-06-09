// App-wide colour palettes. No hardcoded colours in components — reference these via useTheme().
// Derived from the TransitQuote website brand (transitquote-theme): a green identity
// (#419e61) with a bright accent and deep-green ink. Mirrors the site so the app feels
// like part of the same product.
//
// Two palettes are exposed (LIGHT_COLOURS / DARK_COLOURS) with identical key sets so the
// dark mode sweep can swap them wholesale via the theme hook. `COLOURS` remains a legacy
// alias to the light palette so untouched code (and colour-asserting tests) keeps compiling.

export const LIGHT_COLOURS = {
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
  // Always-white foreground for text/icons on intentionally-coloured surfaces (offline banner,
  // pending/failed sync badges) that stay coloured in BOTH schemes. Distinct from textInverse,
  // which flips to dark ink in dark mode (for dark text on the bright-green primary button).
  onColour: '#FFFFFF',
  success: '#2E7D32',
  warning: '#ED6C02',
  danger: '#D32F2F',
  offline: '#757575', // banner bg (darkened from #9E9E9E for white-text contrast margin — A11y-6)
  // Semantic status colour tokens (§3.4). Use via resolveStatusColour() in utils/statusColours.ts.
  statusNeutral: '#6B7280', // pending / new / open
  statusInfo: '#2563EB', // assigned / accepted / claimed
  statusActive: '#ED6C02', // in transit / route / progress / collected / picked
  statusDone: '#2E7D32', // delivered / completed / done
  statusProblem: '#D32F2F', // cancelled / failed / rejected
  // Surface tokens for failure/availability boxes — replaces hardcoded literals site-wide.
  dangerSurface: '#FDECEA',
  successSurface: '#E6F4EA',
} as const;

/** Palette shape — both palettes share these exact keys (values widened to string). */
export type Palette = { [K in keyof typeof LIGHT_COLOURS]: string };

// Dark palette (spec §3.5 + task table). True-dark-adjacent (not pure black) to avoid OLED
// smear while driving. Primary is lightened (#5BC47D) for contrast on the dark background.
export const DARK_COLOURS: Palette = {
  primary: '#5BC47D', // lighter brand green for contrast on dark
  primaryDark: '#2D7045', // pressed / deep green (kept)
  primaryLight: '#5BC47D',
  accent: '#F5A146',
  background: '#0E1412',
  surface: '#1A2420',
  surfaceAlt: '#22332A',
  border: '#2E3B35',
  text: '#E7EFEA',
  textMuted: '#9DAFA6',
  // Dark text on the light-green primary buttons in dark mode. #5BC47D against #0E1412 gives
  // ~7.8:1 (AAA); against #0E1412 dark text gives ~9:1 — dark text on the bright green button
  // is the higher-contrast, more legible choice, so textInverse is the near-black ink.
  textInverse: '#0E1412',
  onColour: '#FFFFFF',
  success: '#4CAF6E',
  warning: '#F5A146',
  danger: '#EF6B5E',
  offline: '#75807A', // banner bg — white text passes (~4.9:1) so kept as specified
  statusNeutral: '#9CA3AF',
  statusInfo: '#60A5FA',
  statusActive: '#F5A146',
  statusDone: '#66BB6A',
  statusProblem: '#EF6B5E',
  dangerSurface: '#3A1F1C',
  successSurface: '#1C3A26',
};

// Legacy alias — the light palette. Kept so non-themed code, utils, and colour-asserting tests
// keep compiling during/after the sweep. Themed code reads colours from useTheme() instead.
export const COLOURS = LIGHT_COLOURS;

// Gradient colour stops for expo-linear-gradient `colors` props. Kept as readonly tuples
// so the LinearGradient type (≥2 colour stops) is satisfied without casts. Light + dark
// variants exposed via the theme object (useTheme().gradients).
export const LIGHT_GRADIENTS = {
  primary: ['#419E61', '#5BC47D'], // left→right brand sweep (buttons)
  primaryDeep: ['#419E61', '#2D7045'], // top→bottom, more depth
  dark: ['#0D1D14', '#1A3322'], // dark hero / header
  card: ['#FFFFFF', '#F2F5F4'], // subtle card lift
  surface: ['#F8FDF9', '#FFFFFF'], // screen background wash
  screen: ['#EAF6EE', '#FFFFFF'], // very light green → white wash behind list cards
} as const;

/** Gradient set shape — both variants share these keys. */
export type GradientSet = { [K in keyof typeof LIGHT_GRADIENTS]: readonly [string, string] };

// Dark gradient variant: muted dark washes; the hero/dark block stays dark-on-dark.
export const DARK_GRADIENTS: GradientSet = {
  primary: ['#2D7045', '#5BC47D'], // deep→bright green sweep (buttons)
  primaryDeep: ['#2D7045', '#1C3A26'],
  dark: ['#101814', '#0E1412'], // dark hero / header
  card: ['#1A2420', '#141C19'], // subtle card lift on dark
  surface: ['#101814', '#0E1412'],
  screen: ['#101814', '#0E1412'], // dark screen wash
} as const;

// Legacy alias for the light gradients (used by non-themed paths during the sweep).
export const GRADIENTS = LIGHT_GRADIENTS;

// Job status colours are resolved at runtime from configuration.status_types (per-site,
// not hardcodable). This is the *fallback* palette cycled by status index for unknown statuses.
export const STATUS_FALLBACK_COLOURS = [
  '#9E9E9E', // pending / unknown
  '#419E61', // assigned (brand green)
  '#FF9C2A', // in transit (accent orange)
  '#2D7045', // delivered (deep green)
] as const;
