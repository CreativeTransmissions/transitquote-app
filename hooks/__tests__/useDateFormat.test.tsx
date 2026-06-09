/**
 * Tests for useDateFormat — binds the date/time formatters to the site's WordPress display formats
 * (date_format / time_format / ask_for_time) so the app renders dates like the server does. Falls
 * back to app defaults until configuration is synced. useTeamSettings is mocked to drive the format.
 */
import { renderHook } from '@testing-library/react-native';
import { useTeamSettings } from '../useTeamSettings';
import { useDateFormat } from '../useDateFormat';
import type { TeamSettingsRow } from '../../database/schema';

jest.mock('../useTeamSettings', () => ({ useTeamSettings: jest.fn() }));

const mockSettings = useTeamSettings as jest.Mock;
const settings = (o: Partial<TeamSettingsRow>) => mockSettings.mockReturnValue(o as TeamSettingsRow);
const ISO = '2026-06-03 14:30:00';

beforeEach(() => mockSettings.mockReset());

describe('useDateFormat — defaults (no site config yet)', () => {
  beforeEach(() => mockSettings.mockReturnValue(null));

  it('formats with the app default date/datetime formats', () => {
    const { result } = renderHook(() => useDateFormat());
    expect(result.current.formatDate(ISO)).toBe('03 Jun 2026');
    expect(result.current.formatDateTime(ISO)).toBe('03 Jun 2026, 14:30');
  });

  it('returns empty string for null input', () => {
    const { result } = renderHook(() => useDateFormat());
    expect(result.current.formatDate(null)).toBe('');
    expect(result.current.formatDateTime(undefined)).toBe('');
  });
});

describe('useDateFormat — site WordPress formats', () => {
  it('maps PHP formats to the site rendering (Y-m-d / H:i)', () => {
    settings({ dateFormat: 'Y-m-d', timeFormat: 'H:i', askForTime: true });
    const { result } = renderHook(() => useDateFormat());
    expect(result.current.formatDate(ISO)).toBe('2026-06-03');
    expect(result.current.formatDateTime(ISO)).toBe('2026-06-03 14:30');
  });
});

describe('useDateFormat — formatDateTimeSmart', () => {
  it('shows the time when a real time-of-day is present', () => {
    settings({ dateFormat: 'Y-m-d', timeFormat: 'H:i', askForTime: true });
    const { result } = renderHook(() => useDateFormat());
    expect(result.current.formatDateTimeSmart(ISO)).toBe('2026-06-03 14:30');
  });

  it('renders date-only at midnight (no time captured)', () => {
    settings({ dateFormat: 'Y-m-d', timeFormat: 'H:i', askForTime: true });
    const { result } = renderHook(() => useDateFormat());
    expect(result.current.formatDateTimeSmart('2026-06-03 00:00:00')).toBe('2026-06-03');
  });

  it('renders date-only when the site does not collect a time (askForTime false)', () => {
    settings({ dateFormat: 'Y-m-d', timeFormat: 'H:i', askForTime: false });
    const { result } = renderHook(() => useDateFormat());
    expect(result.current.formatDateTimeSmart(ISO)).toBe('2026-06-03');
  });
});
