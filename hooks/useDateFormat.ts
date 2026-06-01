/**
 * Date/time formatters bound to the site's WordPress display settings (date_format / time_format),
 * so the app renders dates exactly like the server does. Falls back to the app defaults until the
 * configuration has been synced. Combined date+time uses a space separator, matching the server.
 */
import { useMemo } from 'react';
import { useTeamSettings } from './useTeamSettings';
import { phpToDayjsFormat } from '../utils/dateFormat';
import {
  formatDate as rawFormatDate,
  formatDateTime as rawFormatDateTime,
  smartDateTime,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATETIME_FORMAT,
} from '../utils/formatters';

export interface DateFormatters {
  /** Date only, in the site's WordPress date_format. */
  formatDate: (iso: string | null | undefined) => string;
  /** Date + time, in the site's WordPress date_format + time_format. */
  formatDateTime: (iso: string | null | undefined) => string;
  /**
   * Date + time when a real time-of-day exists, else date only. Midnight means "no time captured";
   * sites that don't collect a time (ask_for_time false) always render date-only.
   */
  formatDateTimeSmart: (iso: string | null | undefined) => string;
}

export function useDateFormat(): DateFormatters {
  const settings = useTeamSettings();

  return useMemo(() => {
    const dateFmt = phpToDayjsFormat(settings?.dateFormat) || DEFAULT_DATE_FORMAT;
    const timeFmt = phpToDayjsFormat(settings?.timeFormat);
    const dateTimeFmt = timeFmt ? `${dateFmt} ${timeFmt}` : DEFAULT_DATETIME_FORMAT;
    // Default to true when unset (older config) — the midnight check still suppresses no-time dates.
    const askForTime = settings?.askForTime ?? true;
    return {
      formatDate: (iso) => rawFormatDate(iso, dateFmt),
      formatDateTime: (iso) => rawFormatDateTime(iso, dateTimeFmt),
      formatDateTimeSmart: (iso) => smartDateTime(iso, { askForTime, dateFmt, dateTimeFmt }),
    };
  }, [settings?.dateFormat, settings?.timeFormat, settings?.askForTime]);
}
