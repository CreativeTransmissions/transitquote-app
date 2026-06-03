import { nameSurnameFirst, formatDate, formatDateTime, smartDateTime } from '../formatters';
import { phpToDayjsFormat } from '../dateFormat';

describe('nameSurnameFirst', () => {
  it('formats surname first when both names are present', () => {
    expect(nameSurnameFirst('John', 'Smith')).toBe('Smith, John');
  });

  it('falls back to surname only', () => {
    expect(nameSurnameFirst('', 'Smith')).toBe('Smith');
    expect(nameSurnameFirst(null, 'Smith')).toBe('Smith');
  });

  it('falls back to first name only', () => {
    expect(nameSurnameFirst('John', '')).toBe('John');
    expect(nameSurnameFirst('John', null)).toBe('John');
  });

  it('returns empty string when neither name is present', () => {
    expect(nameSurnameFirst(null, null)).toBe('');
    expect(nameSurnameFirst('  ', '  ')).toBe('');
  });
});

describe('formatDate / formatDateTime with WordPress formats', () => {
  // Mirrors useDateFormat: PHP formats from the site → dayjs, applied to wire datetimes.
  const datePhp = 'F j, Y';
  const timePhp = 'g:i a';
  const dateFmt = phpToDayjsFormat(datePhp); // MMMM D, YYYY
  const dateTimeFmt = `${dateFmt} ${phpToDayjsFormat(timePhp)}`; // MMMM D, YYYY h:mm a

  it('renders a date to match the WordPress date_format', () => {
    expect(formatDate('2026-05-12 09:30:00', dateFmt)).toBe('May 12, 2026');
  });

  it('renders a datetime to match the WordPress date_format + time_format', () => {
    expect(formatDateTime('2026-05-12 09:30:00', dateTimeFmt)).toBe('May 12, 2026 9:30 am');
    expect(formatDateTime('2026-05-15 00:00:00', dateTimeFmt)).toBe('May 15, 2026 12:00 am');
  });

  it('falls back to the app default format when none is supplied', () => {
    expect(formatDateTime('2026-05-12 09:30:00')).toBe('12 May 2026, 09:30');
  });

  it('returns empty string for null/invalid input', () => {
    expect(formatDate(null, dateFmt)).toBe('');
    expect(formatDateTime('', dateTimeFmt)).toBe('');
  });

  it('returns empty string for the MySQL zero-date sentinel (not a bogus 1899 date)', () => {
    expect(formatDate('0000-00-00 00:00:00', dateFmt)).toBe('');
    expect(formatDateTime('0000-00-00 00:00:00', dateTimeFmt)).toBe('');
  });
});

describe('smartDateTime (date-only when no time-of-day)', () => {
  const dateFmt = phpToDayjsFormat('F j, Y'); // MMMM D, YYYY
  const dateTimeFmt = `${dateFmt} ${phpToDayjsFormat('g:i a')}`; // MMMM D, YYYY h:mm a
  const opts = { askForTime: true, dateFmt, dateTimeFmt };

  it('shows date + time when a real time-of-day is present', () => {
    expect(smartDateTime('2026-05-12 09:30:00', opts)).toBe('May 12, 2026 9:30 am');
  });

  it('shows date only when the time is midnight (no time captured)', () => {
    expect(smartDateTime('2026-05-29 00:00:00', opts)).toBe('May 29, 2026');
  });

  it('shows date only when the form does not collect a time (askForTime false)', () => {
    expect(smartDateTime('2026-05-12 09:30:00', { ...opts, askForTime: false })).toBe('May 12, 2026');
  });

  it('returns empty string for null/invalid input', () => {
    expect(smartDateTime(null, opts)).toBe('');
    expect(smartDateTime('0000-00-00 00:00:00', opts)).toBe('');
  });
});
