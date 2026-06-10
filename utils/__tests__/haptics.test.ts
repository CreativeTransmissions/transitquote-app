/**
 * Tests for the haptics utility (utils/haptics.ts).
 * Asserts that each helper delegates to the correct expo-haptics API and that a rejected
 * promise is swallowed — haptic failures must never propagate to caller code.
 */
import * as Haptics from 'expo-haptics';

// Import AFTER the mock is set up.
import { hapticSuccess, hapticError, hapticLight } from '../haptics';

// Mock the entire expo-haptics module so no native modules are needed in CI.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

const mockNotification = Haptics.notificationAsync as jest.Mock;
const mockImpact = Haptics.impactAsync as jest.Mock;

beforeEach(() => {
  mockNotification.mockReset();
  mockImpact.mockReset();
});

describe('hapticSuccess', () => {
  it('calls notificationAsync with NotificationFeedbackType.Success', async () => {
    mockNotification.mockResolvedValue(undefined);
    await hapticSuccess();
    expect(mockNotification).toHaveBeenCalledTimes(1);
    expect(mockNotification).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('swallows a rejected promise without throwing', async () => {
    mockNotification.mockRejectedValue(new Error('haptic unavailable'));
    await expect(hapticSuccess()).resolves.toBeUndefined();
  });
});

describe('hapticError', () => {
  it('calls notificationAsync with NotificationFeedbackType.Error', async () => {
    mockNotification.mockResolvedValue(undefined);
    await hapticError();
    expect(mockNotification).toHaveBeenCalledTimes(1);
    expect(mockNotification).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('swallows a rejected promise without throwing', async () => {
    mockNotification.mockRejectedValue(new Error('haptic unavailable'));
    await expect(hapticError()).resolves.toBeUndefined();
  });
});

describe('hapticLight', () => {
  it('calls impactAsync with ImpactFeedbackStyle.Light', async () => {
    mockImpact.mockResolvedValue(undefined);
    await hapticLight();
    expect(mockImpact).toHaveBeenCalledTimes(1);
    expect(mockImpact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('swallows a rejected promise without throwing', async () => {
    mockImpact.mockRejectedValue(new Error('haptic unavailable'));
    await expect(hapticLight()).resolves.toBeUndefined();
  });
});
