/**
 * Tests for the notifications store
 * Requirements: 1.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  notifications,
  showNotification,
  dismissNotification,
  dismissAllNotifications,
  dismissNotificationsByType,
  getNotificationCount,
  showInfo,
  showSuccess,
  showWarning,
  showError,
  cleanupNotifications,
  getCurrentNotifications,
  type NotificationOptions
} from '../notifications';

// Mock timers
vi.useFakeTimers();

describe('Notifications Store', () => {
  beforeEach(() => {
    // Clear notifications before each test
    dismissAllNotifications();
    vi.clearAllTimers();
  });

  afterEach(() => {
    // Clean up after each test
    cleanupNotifications();
    vi.clearAllTimers();
  });

  describe('showNotification', () => {
    it('should add a notification to the store', () => {
      const options: NotificationOptions = {
        type: 'info',
        message: 'Test message'
      };

      const id = showNotification(options);

      const current = get(notifications);
      expect(current).toHaveLength(1);
      expect(current[0]).toMatchObject({
        id,
        type: 'info',
        message: 'Test message',
        timestamp: expect.any(Number)
      });
    });

    it('should generate unique IDs for notifications', () => {
      const id1 = showNotification({ type: 'info', message: 'Message 1' });
      const id2 = showNotification({ type: 'info', message: 'Message 2' });

      expect(id1).not.toBe(id2);
    });

    it('should include details when provided', () => {
      const options: NotificationOptions = {
        type: 'error',
        message: 'Error occurred',
        details: 'Detailed error information'
      };

      showNotification(options);

      const current = get(notifications);
      expect(current[0].details).toBe('Detailed error information');
    });

    it('should use default timeout for each notification type', () => {
      showNotification({ type: 'info', message: 'Info' });
      showNotification({ type: 'success', message: 'Success' });
      showNotification({ type: 'warning', message: 'Warning' });
      showNotification({ type: 'error', message: 'Error' });

      const current = get(notifications);
      expect(current[0].timeout).toBe(5000); // info
      expect(current[1].timeout).toBe(4000); // success
      expect(current[2].timeout).toBe(6000); // warning
      expect(current[3].timeout).toBe(0); // error (no auto-dismiss)
    });

    it('should use custom timeout when provided', () => {
      showNotification({ type: 'info', message: 'Custom timeout', timeout: 10000 });

      const current = get(notifications);
      expect(current[0].timeout).toBe(10000);
    });

    it('should auto-dismiss notifications with timeout > 0', () => {
      showNotification({ type: 'info', message: 'Auto dismiss', timeout: 1000 });

      expect(get(notifications)).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      expect(get(notifications)).toHaveLength(0);
    });

    it('should not auto-dismiss notifications with timeout = 0', () => {
      showNotification({ type: 'error', message: 'No auto dismiss', timeout: 0 });

      expect(get(notifications)).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(10000);

      expect(get(notifications)).toHaveLength(1);
    });

    it('should limit notifications to maximum count', () => {
      // Add 7 notifications (more than MAX_NOTIFICATIONS = 5)
      for (let i = 0; i < 7; i++) {
        showNotification({ type: 'info', message: `Message ${i}` });
      }

      const current = get(notifications);
      expect(current).toHaveLength(5);

      // Should keep the most recent notifications
      expect(current[0].message).toBe('Message 2');
      expect(current[4].message).toBe('Message 6');
    });
  });

  describe('dismissNotification', () => {
    it('should remove specific notification', () => {
      const id1 = showNotification({ type: 'info', message: 'Message 1' });
      const id2 = showNotification({ type: 'info', message: 'Message 2' });

      expect(get(notifications)).toHaveLength(2);

      dismissNotification(id1);

      const current = get(notifications);
      expect(current).toHaveLength(1);
      expect(current[0].id).toBe(id2);
    });

    it('should handle dismissing non-existent notification', () => {
      showNotification({ type: 'info', message: 'Message' });

      expect(() => dismissNotification('non-existent-id')).not.toThrow();
      expect(get(notifications)).toHaveLength(1);
    });

    it('should clear timeout when dismissing notification', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const id = showNotification({ type: 'info', message: 'Message', timeout: 5000 });
      dismissNotification(id);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('dismissAllNotifications', () => {
    it('should remove all notifications', () => {
      showNotification({ type: 'info', message: 'Message 1' });
      showNotification({ type: 'error', message: 'Message 2' });
      showNotification({ type: 'success', message: 'Message 3' });

      expect(get(notifications)).toHaveLength(3);

      dismissAllNotifications();

      expect(get(notifications)).toHaveLength(0);
    });

    it('should clear all active timeouts', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      showNotification({ type: 'info', message: 'Message 1', timeout: 5000 });
      showNotification({ type: 'success', message: 'Message 2', timeout: 4000 });

      dismissAllNotifications();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('dismissNotificationsByType', () => {
    it('should remove notifications of specific type', () => {
      showNotification({ type: 'info', message: 'Info 1' });
      showNotification({ type: 'error', message: 'Error 1' });
      showNotification({ type: 'info', message: 'Info 2' });
      showNotification({ type: 'success', message: 'Success 1' });

      expect(get(notifications)).toHaveLength(4);

      dismissNotificationsByType('info');

      const current = get(notifications);
      expect(current).toHaveLength(2);
      expect(current.every((n) => n.type !== 'info')).toBe(true);
    });

    it('should clear timeouts for dismissed notifications', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      showNotification({ type: 'info', message: 'Info', timeout: 5000 });
      showNotification({ type: 'error', message: 'Error', timeout: 0 });

      dismissNotificationsByType('info');

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNotificationCount', () => {
    it('should return total count when no type specified', () => {
      showNotification({ type: 'info', message: 'Info' });
      showNotification({ type: 'error', message: 'Error' });
      showNotification({ type: 'success', message: 'Success' });

      expect(getNotificationCount()).toBe(3);
    });

    it('should return count for specific type', () => {
      showNotification({ type: 'info', message: 'Info 1' });
      showNotification({ type: 'error', message: 'Error 1' });
      showNotification({ type: 'info', message: 'Info 2' });

      expect(getNotificationCount('info')).toBe(2);
      expect(getNotificationCount('error')).toBe(1);
      expect(getNotificationCount('warning')).toBe(0);
    });
  });

  describe('convenience functions', () => {
    it('should create info notification', () => {
      const id = showInfo('Info message', 'Details');

      const current = get(notifications);
      expect(current[0]).toMatchObject({
        id,
        type: 'info',
        message: 'Info message',
        details: 'Details'
      });
    });

    it('should create success notification', () => {
      const id = showSuccess('Success message');

      const current = get(notifications);
      expect(current[0]).toMatchObject({
        id,
        type: 'success',
        message: 'Success message'
      });
    });

    it('should create warning notification', () => {
      const id = showWarning('Warning message');

      const current = get(notifications);
      expect(current[0]).toMatchObject({
        id,
        type: 'warning',
        message: 'Warning message'
      });
    });

    it('should create error notification', () => {
      const id = showError('Error message', 'Error details');

      const current = get(notifications);
      expect(current[0]).toMatchObject({
        id,
        type: 'error',
        message: 'Error message',
        details: 'Error details'
      });
    });
  });

  describe('getCurrentNotifications', () => {
    it('should return current notifications array', () => {
      showNotification({ type: 'info', message: 'Message 1' });
      showNotification({ type: 'error', message: 'Message 2' });

      const current = getCurrentNotifications();
      expect(current).toHaveLength(2);
      expect(current[0].message).toBe('Message 1');
      expect(current[1].message).toBe('Message 2');
    });

    it('should return empty array when no notifications', () => {
      const current = getCurrentNotifications();
      expect(current).toEqual([]);
    });
  });

  describe('cleanupNotifications', () => {
    it('should clear all active timeouts', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      showNotification({ type: 'info', message: 'Message 1', timeout: 5000 });
      showNotification({ type: 'success', message: 'Message 2', timeout: 4000 });

      cleanupNotifications();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });
  });
});
