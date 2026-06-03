import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  clearPresentedNotifications,
  presentJobNotifications,
  getPresentedNotifications,
} from '../notifier';
import { getNotificationPermission } from '../setup';
import type { JobChangeEvent } from '../../../database/sync/changeDetector';

// The app targets Android; exercise the channel-aware trigger path.
(Platform as { OS: string }).OS = 'android';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
}));
jest.mock('../setup', () => ({
  getNotificationPermission: jest.fn(),
  NOTIFICATION_CHANNEL_ID: 'job-updates',
}));

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const permissionMock = getNotificationPermission as jest.Mock;

const EVENTS: JobChangeEvent[] = [
  { type: 'assigned', jobId: 7, jobRef: 'MTS7', title: 'New job assigned', body: 'Job MTS7 was assigned to you.' },
  { type: 'status', jobId: 8, jobRef: 'MTS8', title: 'Job status updated', body: 'Job MTS8 is now Delivered.' },
];

describe('presentJobNotifications', () => {
  beforeEach(() => {
    clearPresentedNotifications();
    scheduleMock.mockClear();
    permissionMock.mockReset();
  });

  it('always records intent in the in-app log, regardless of permission', () => {
    permissionMock.mockReturnValue('denied');

    const presented = presentJobNotifications(EVENTS);

    expect(presented).toHaveLength(2);
    expect(getPresentedNotifications()).toHaveLength(2);
    expect(getPresentedNotifications()[0]).toEqual({ title: 'New job assigned', body: 'Job MTS7 was assigned to you.', jobId: 7 });
  });

  it('does NOT fire OS notifications when permission is not granted', () => {
    permissionMock.mockReturnValue('denied');

    presentJobNotifications(EVENTS);

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('fires one OS notification per event when permission is granted', () => {
    permissionMock.mockReturnValue('granted');

    presentJobNotifications(EVENTS);

    expect(scheduleMock).toHaveBeenCalledTimes(2);
    expect(scheduleMock).toHaveBeenCalledWith({
      content: { title: 'New job assigned', body: 'Job MTS7 was assigned to you.', data: { jobId: 7 } },
      trigger: { channelId: 'job-updates' },
    });
  });

  it('swallows native firing errors (intent stays in the log)', () => {
    permissionMock.mockReturnValue('granted');
    scheduleMock.mockRejectedValueOnce(new Error('native unavailable'));

    expect(() => presentJobNotifications(EVENTS)).not.toThrow();
    expect(getPresentedNotifications()).toHaveLength(2);
  });

  it('collapses an oversized batch into a single summary OS notification', () => {
    permissionMock.mockReturnValue('granted');
    const many: JobChangeEvent[] = Array.from({ length: 12 }, (_, i) => ({
      type: 'status',
      jobId: i + 1,
      jobRef: `MTS${i + 1}`,
      title: 'Job status updated',
      body: `Job MTS${i + 1} changed.`,
    }));

    presentJobNotifications(many);

    // One summary fired, not 12 — but all 12 still recorded in the in-app log.
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.objectContaining({ title: 'Jobs updated', body: '12 jobs have updates.' }) }),
    );
    expect(getPresentedNotifications()).toHaveLength(12);
  });
});
