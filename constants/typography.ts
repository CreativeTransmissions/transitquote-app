// Type scale. Sizes only — no hardcoded font sizes in components.
// Enlarged for at-a-glance readability in the field (drivers reading on the move).
// Headings carry a slight negative tracking for a tighter, modern look.
export const TYPOGRAPHY = {
  title: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  heading: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  subheading: { fontSize: 19, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '400' as const },
  caption: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
} as const;
