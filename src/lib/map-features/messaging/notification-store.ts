/**
 * Notification Store
 * Global notification management for map features
 */

import { writable } from 'svelte/store';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: number;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// Global notification store
export const notifications = writable<Notification[]>([]);

// Add notification helper
export function notify(notification: Omit<Notification, 'id' | 'timestamp'>) {
  const newNotification: Notification = {
    ...notification,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    duration: notification.duration || 5000
  };

  notifications.update((n) => [...n, newNotification]);

  // Auto-remove after duration
  const duration = newNotification.duration;
  if (duration && duration > 0) {
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, duration);
  }
}

// Remove notification
export function removeNotification(id: string) {
  notifications.update((n) => n.filter((notification) => notification.id !== id));
}

// Clear all notifications
export function clearNotifications() {
  notifications.set([]);
}

// Clear notifications by type
export function clearNotificationsByType(type: Notification['type']) {
  notifications.update((n) => n.filter((notification) => notification.type !== type));
}
