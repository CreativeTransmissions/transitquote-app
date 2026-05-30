/** Normalise a user-entered site URL: trim, default to https:// if no scheme, strip trailing slashes. */
export function normaliseSiteUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed === '') return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}
