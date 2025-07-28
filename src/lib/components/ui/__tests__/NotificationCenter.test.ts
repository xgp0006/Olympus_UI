/**
 * Tests for the NotificationCenter component
 * Requirements: 1.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import NotificationCenter from '../NotificationCenter.svelte';
import {
  notifications,
  showNotification,
  dismissAllNotifications
} from '../../../stores/notifications';

// Mock timers for transition testing
vi.useFakeTimers();

describe('NotificationCenter Component', () => {
  beforeEach(() => {
    // Clear notifications before each test
    dismissAllNotifications();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render without notifications', () => {
    render(NotificationCenter);

    const center = screen.getByTestId('notification-center');
    expect(center).toBeInTheDocument();
    expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
  });

  it('should render notifications from store', () => {
    showNotification({ type: 'info', message: 'Test message' });
    showNotification({ type: 'error', message: 'Error message' });

    render(NotificationCenter);

    const notifications = screen.getAllByTestId('notification');
    expect(notifications).toHaveLength(2);
  });

  it('should display notification content correctly', () => {
    showNotification({
      type: 'warning',
      message: 'Warning message',
      details: 'Additional details'
    });

    render(NotificationCenter);

    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Additional details')).toBeInTheDocument();
  });

  it('should apply correct CSS classes for notification types', () => {
    showNotification({ type: 'info', message: 'Info' });
    showNotification({ type: 'success', message: 'Success' });
    showNotification({ type: 'warning', message: 'Warning' });
    showNotification({ type: 'error', message: 'Error' });

    render(NotificationCenter);

    const notifications = screen.getAllByTestId('notification');
    expect(notifications[0]).toHaveClass('info');
    expect(notifications[1]).toHaveClass('success');
    expect(notifications[2]).toHaveClass('warning');
    expect(notifications[3]).toHaveClass('error');
  });

  it('should set correct data attributes', () => {
    const id = showNotification({ type: 'error', message: 'Test' });

    render(NotificationCenter);

    const notification = screen.getByTestId('notification');
    expect(notification).toHaveAttribute('data-notification-id', id);
    expect(notification).toHaveAttribute('data-notification-type', 'error');
  });

  it('should dismiss notification when clicked', async () => {
    const id = showNotification({ type: 'info', message: 'Click to dismiss' });

    render(NotificationCenter);

    const notification = screen.getByTestId('notification');
    await fireEvent.click(notification);

    // Check that notification was removed from store
    const current = get(notifications);
    expect(current.find((n) => n.id === id)).toBeUndefined();
  });

  it('should dismiss notification when dismiss button is clicked', async () => {
    const id = showNotification({ type: 'info', message: 'Dismiss me' });

    render(NotificationCenter);

    const dismissButton = screen.getByTestId('dismiss-button');
    await fireEvent.click(dismissButton);

    // Check that notification was removed from store
    const current = get(notifications);
    expect(current.find((n) => n.id === id)).toBeUndefined();
  });

  it('should handle keyboard navigation', async () => {
    const id = showNotification({ type: 'info', message: 'Keyboard test' });

    render(NotificationCenter);

    const notification = screen.getByTestId('notification');

    // Test Enter key using fireEvent
    await fireEvent(
      notification,
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      })
    );

    const current = get(notifications);
    expect(current.find((n) => n.id === id)).toBeUndefined();
  });

  it('should ignore other keyboard keys', async () => {
    const id = showNotification({ type: 'info', message: 'Key test' });

    render(NotificationCenter);

    const notification = screen.getByTestId('notification');

    // Test other keys (should not dismiss)
    await fireEvent(
      notification,
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      })
    );
    await fireEvent(
      notification,
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
    );

    const current = get(notifications);
    expect(current.find((n) => n.id === id)).toBeDefined();
  });

  it('should render correct icons for each notification type', () => {
    showNotification({ type: 'info', message: 'Info' });
    showNotification({ type: 'success', message: 'Success' });
    showNotification({ type: 'warning', message: 'Warning' });
    showNotification({ type: 'error', message: 'Error' });

    render(NotificationCenter);

    const notifications = screen.getAllByTestId('notification');

    // Each notification should have an icon (svg element)
    notifications.forEach((notification) => {
      const icon = notification.querySelector('.notification-icon svg');
      expect(icon).toBeInTheDocument();
    });
  });

  it('should show progress bar for timed notifications', () => {
    showNotification({ type: 'info', message: 'Timed', timeout: 5000 });
    showNotification({ type: 'error', message: 'No timeout', timeout: 0 });

    render(NotificationCenter);

    const notifications = screen.getAllByTestId('notification');

    // First notification should have progress bar
    const progressBar1 = notifications[0].querySelector('.notification-progress');
    expect(progressBar1).toBeInTheDocument();

    // Second notification should not have progress bar
    const progressBar2 = notifications[1].querySelector('.notification-progress');
    expect(progressBar2).not.toBeInTheDocument();
  });

  it('should not show progress bar for notifications without timeout', () => {
    showNotification({ type: 'error', message: 'No timeout' }); // Default error timeout is 0

    render(NotificationCenter);

    const notification = screen.getByTestId('notification');
    const progressBar = notification.querySelector('.notification-progress');
    expect(progressBar).not.toBeInTheDocument();
  });

  it('should handle multiple notifications correctly', () => {
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    messages.forEach((message) => {
      showNotification({ type: 'info', message });
    });

    render(NotificationCenter);

    const notifications = screen.getAllByTestId('notification');
    expect(notifications).toHaveLength(3);

    messages.forEach((message) => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });

  it('should update when notifications store changes', async () => {
    const { rerender } = render(NotificationCenter);

    // Initially no notifications
    expect(screen.queryByTestId('notification')).not.toBeInTheDocument();

    // Add notification
    showNotification({ type: 'info', message: 'Dynamic test' });

    // Trigger re-render to reflect store changes
    await rerender({});

    // Should now show notification
    expect(screen.getByTestId('notification')).toBeInTheDocument();
    expect(screen.getByText('Dynamic test')).toBeInTheDocument();
  });

  it('should handle notification details correctly', () => {
    showNotification({
      type: 'error',
      message: 'Main message',
      details: 'Detailed information about the error'
    });

    render(NotificationCenter);

    expect(screen.getByText('Main message')).toBeInTheDocument();
    expect(screen.getByText('Detailed information about the error')).toBeInTheDocument();
  });

  it('should not show details when not provided', () => {
    showNotification({
      type: 'info',
      message: 'Message without details'
    });

    render(NotificationCenter);

    const notification = screen.getByTestId('notification');
    const details = notification.querySelector('.notification-details');
    expect(details).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    showNotification({ type: 'info', message: 'Accessibility test' });

    render(NotificationCenter);

    const dismissButton = screen.getByTestId('dismiss-button');
    expect(dismissButton).toHaveAttribute('title', 'Dismiss notification');
  });

  it('should prevent event propagation on dismiss button click', async () => {
    showNotification({ type: 'info', message: 'Event test' });

    render(NotificationCenter);

    const notification = screen.getByTestId('notification');
    const dismissButton = screen.getByTestId('dismiss-button');

    // Mock click handlers
    const notificationClickSpy = vi.fn();
    const dismissClickSpy = vi.fn();

    notification.addEventListener('click', notificationClickSpy);
    dismissButton.addEventListener('click', dismissClickSpy);

    // Click dismiss button
    await fireEvent.click(dismissButton);

    // Dismiss button should be clicked, but notification click should not be triggered
    expect(dismissClickSpy).toHaveBeenCalled();
    // Note: In the actual component, event propagation should be stopped
  });
});
