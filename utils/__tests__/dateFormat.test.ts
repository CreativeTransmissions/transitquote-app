import { phpToDayjsFormat } from '../dateFormat';

describe('phpToDayjsFormat', () => {
  it('converts the live site WordPress formats', () => {
    // date_format / time_format verified live on tq-pro-teams-php8.ddev.site.
    expect(phpToDayjsFormat('F j, Y')).toBe('MMMM D, YYYY');
    expect(phpToDayjsFormat('g:i a')).toBe('h:mm a');
  });

  it('maps other common PHP tokens', () => {
    expect(phpToDayjsFormat('d/m/Y')).toBe('DD/MM/YYYY');
    expect(phpToDayjsFormat('H:i:s')).toBe('HH:mm:ss');
    expect(phpToDayjsFormat('D, d M Y')).toBe('ddd, DD MMM YYYY');
    expect(phpToDayjsFormat('g:i A')).toBe('h:mm A');
  });

  it('escapes unmapped letters as dayjs literals', () => {
    // "z" is not a mapped token; it must not be interpreted by dayjs.
    expect(phpToDayjsFormat('Y z')).toBe('YYYY [z]');
  });

  it('honours PHP backslash escapes as literals', () => {
    expect(phpToDayjsFormat('\\Y Y')).toBe('[Y] YYYY');
  });

  it('returns empty string for empty/nullish input', () => {
    expect(phpToDayjsFormat('')).toBe('');
    expect(phpToDayjsFormat(null)).toBe('');
    expect(phpToDayjsFormat(undefined)).toBe('');
  });
});
