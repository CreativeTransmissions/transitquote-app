// App-wide colour palette. No hardcoded colours in components — reference these.
export const COLOURS = {
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  background: '#FFFFFF',
  surface: '#F5F7FA',
  border: '#E0E4E8',
  text: '#1A1A1A',
  textMuted: '#666666',
  success: '#2E7D32',
  warning: '#ED6C02',
  danger: '#D32F2F',
  offline: '#9E9E9E',
} as const;

// Job status colours are resolved at runtime from configuration.status_types (per-site,
// not hardcodable). This is the *fallback* palette cycled by status index for unknown statuses.
export const STATUS_FALLBACK_COLOURS = [
  '#9E9E9E', // pending / unknown
  '#1565C0', // assigned
  '#ED6C02', // in transit
  '#2E7D32', // delivered
] as const;
