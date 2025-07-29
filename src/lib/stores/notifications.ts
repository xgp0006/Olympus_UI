/**
 * Notification store implementation for the Modular C2 Frontend
 * Provides centralized notification management for errors, warnings, and success messages
 * Requirements: 1.3
 */

import { writable, type Writable } from 'svelte/store';
import { BoundedArray } from '../utils/bounded-array';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  timeout?: number; // 0 means no auto-dismiss
  timestamp: number;
}

/**
 * Notification creation options
 */
export interface NotificationOptions {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  timeout?: number;
}

/**
 * Default timeout values for different notification types (in milliseconds)
 */
const DEFAULT_TIMEOUTS = {
  info: 5000,
  success: 4000,
  warning: 6000,
  error: 0 // Errors don't auto-dismiss
};

/**
 * Maximum number of notifications to show at once
 */
const MAX_NOTIFICATIONS = 5;

/**
 * Notifications store
 */
export const notifications: Writable<Notification[]> = writable([]);

/**
 * Active timeout IDs for auto-dismissal
 */
const activeTimeouts = new Map<string, number>();

/**
 * Generate unique notification ID
 * @returns Unique notification ID
 */
function generateNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Show a notification
 * @param options - Notification options
 * @returns Notification ID for manual dismissal
 */
export function showNotification(options: NotificationOptions): string {
  const id = generateNotificationId();
  const timeout = options.timeout !== undefined ? options.timeout : DEFAULT_TIMEOUTS[options.type];

  const notification: Notification = {
    id,
    type: options.type,
    message: options.message,
    details: options.details,
    timeout,
    timestamp: Date.now()
  };

  // Add notification to store
  notifications.update((current) => {
    const updated = [...current, notification];

    // Limit number of notifications
    if (updated.length > MAX_NOTIFICATIONS) {
      // Remove oldest notifications
      const removed = updated.splice(0, updated.length - MAX_NOTIFICATIONS);

      // Clear timeouts for removed notifications
      removed.forEach((removedNotification) => {
        const timeoutId = activeTimeouts.get(removedNotification.id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          activeTimeouts.delete(removedNotification.id);
        }
      });
    }

    return updated;
  });

  // Set up auto-dismissal if timeout is specified
  if (timeout > 0) {
    const timeoutId = window.setTimeout(() => {
      dismissNotification(id);
    }, timeout);

    activeTimeouts.set(id, timeoutId);
  }

  console.log(`Notification shown: ${options.type} - ${options.message}`);
  return id;
}

/**
 * Dismiss a specific notification
 * @param id - Notification ID to dismiss
 */
export function dismissNotification(id: string): void {
  // Clear timeout if exists
  const timeoutId = activeTimeouts.get(id);
  if (timeoutId) {
    clearTimeout(timeoutId);
    activeTimeouts.delete(id);
  }

  // Remove notification from store
  notifications.update((current) => current.filter((notification) => notification.id !== id));

  console.log(`Notification dismissed: ${id}`);
}

/**
 * Dismiss all notifications
 */
export function dismissAllNotifications(): void {
  // Clear all active timeouts
  activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  activeTimeouts.clear();

  // Clear notifications store
  notifications.set([]);

  console.log('All notifications dismissed');
}

/**
 * Dismiss notifications of a specific type
 * @param type - Notification type to dismiss
 */
export function dismissNotificationsByType(type: Notification['type']): void {
  // NASA JPL Rule 2: Bounded memory for dismissed IDs
  const dismissedIds = new BoundedArray<string>(100);

  notifications.update((current) => {
    const remaining = current.filter((notification) => {
      if (notification.type === type) {
        dismissedIds.push(notification.id);
        return false;
      }
      return true;
    });

    return remaining;
  });

  // Clear timeouts for dismissed notifications
  dismissedIds.forEach((id) => {
    const timeoutId = activeTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      activeTimeouts.delete(id);
    }
  });

  console.log(`Dismissed ${dismissedIds.length} notifications of type: ${type}`);
}

/**
 * Get notification count by type
 * @param type - Notification type to count
 * @returns Number of notifications of the specified type
 */
export function getNotificationCount(type?: Notification['type']): number {
  let count = 0;

  const unsubscribe = notifications.subscribe((current) => {
    if (type) {
      count = current.filter((notification) => notification.type === type).length;
    } else {
      count = current.length;
    }
  });
  unsubscribe();

  return count;
}

/**
 * Convenience functions for different notification types
 */

export function showInfo(message: string, details?: string, timeout?: number): string {
  return showNotification({ type: 'info', message, details, timeout });
}

export function showSuccess(message: string, details?: string, timeout?: number): string {
  return showNotification({ type: 'success', message, details, timeout });
}

export function showWarning(message: string, details?: string, timeout?: number): string {
  return showNotification({ type: 'warning', message, details, timeout });
}

export function showError(message: string, details?: string, timeout?: number): string {
  return showNotification({ type: 'error', message, details, timeout });
}

/**
 * Cleanup function to clear all timeouts (useful for component cleanup)
 */
export function cleanupNotifications(): void {
  activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  activeTimeouts.clear();
  console.log('Notification timeouts cleaned up');
}

/**
 * Get current notifications (for debugging or advanced use cases)
 * @returns Current notifications array
 */
export function getCurrentNotifications(): Notification[] {
  let current: Notification[] = [];
  const unsubscribe = notifications.subscribe((notifications) => {
    current = notifications;
  });
  unsubscribe();
  return current;
}
