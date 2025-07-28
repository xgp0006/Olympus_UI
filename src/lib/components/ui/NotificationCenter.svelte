<!--
  Notification Center Component for the Modular C2 Frontend
  Displays toast notifications for errors, warnings, and success messages
  Requirements: 1.3
-->
<script lang="ts">
  import { notifications, dismissNotification } from '../../stores/notifications';
  import { fly } from 'svelte/transition';

  // Handle notification dismissal
  function handleDismiss(notificationId: string) {
    dismissNotification(notificationId);
  }

  // Handle keyboard dismissal
  function handleKeydown(event: KeyboardEvent, notificationId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss(notificationId);
    }
  }
</script>

<div class="notification-center" data-testid="notification-center">
  {#each $notifications as notification (notification.id)}
    <button
      class="notification {notification.type}"
      data-testid="notification"
      data-notification-id={notification.id}
      data-notification-type={notification.type}
      transition:fly={{ y: -50, duration: 300 }}
      on:click={() => handleDismiss(notification.id)}
      on:keydown={(e) => handleKeydown(e, notification.id)}
    >
      <!-- Notification Icon -->
      <div class="notification-icon">
        {#if notification.type === 'success'}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        {:else if notification.type === 'warning'}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        {:else if notification.type === 'error'}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        {/if}
      </div>

      <!-- Notification Content -->
      <div class="notification-content">
        <div class="notification-message">{notification.message}</div>
        {#if notification.details}
          <div class="notification-details">{notification.details}</div>
        {/if}
      </div>

      <!-- Dismiss Button -->
      <button
        class="dismiss-button"
        on:click={() => handleDismiss(notification.id)}
        data-testid="dismiss-button"
        title="Dismiss notification"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>

      <!-- Progress bar for timed notifications -->
      {#if notification.timeout && notification.timeout > 0}
        <div class="notification-progress">
          <div class="progress-bar" style="animation-duration: {notification.timeout}ms"></div>
        </div>
      {/if}
    </button>
  {/each}
</div>

<style>
  .notification-center {
    position: fixed;
    top: calc(var(--layout-spacing_unit) * 2);
    right: calc(var(--layout-spacing_unit) * 2);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: var(--layout-spacing_unit);
    max-width: 400px;
    pointer-events: none;
  }

  .notification {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: var(--layout-spacing_unit);
    padding: calc(var(--layout-spacing_unit) * 1.5);
    border-radius: var(--layout-border_radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
    pointer-events: auto;
    cursor: pointer;
    transition: all var(--animation-transition_duration);
    overflow: hidden;
    background: none;
    border: none;
    font-family: inherit;
    text-align: left;
    width: 100%;
  }

  .notification:hover {
    transform: scale(1.02);
  }

  .notification:focus {
    outline: none;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 0 2px var(--color-accent_blue);
  }

  /* Notification Types */
  .notification.info {
    background-color: rgba(0, 191, 255, 0.1);
    border: var(--layout-border_width) solid var(--color-accent_blue);
    color: var(--color-accent_blue);
  }

  .notification.success {
    background-color: rgba(0, 255, 136, 0.1);
    border: var(--layout-border_width) solid var(--color-accent_green);
    color: var(--color-accent_green);
  }

  .notification.warning {
    background-color: rgba(255, 215, 0, 0.1);
    border: var(--layout-border_width) solid var(--color-accent_yellow);
    color: var(--color-accent_yellow);
  }

  .notification.error {
    background-color: rgba(255, 68, 68, 0.1);
    border: var(--layout-border_width) solid var(--color-accent_red);
    color: var(--color-accent_red);
  }

  /* Notification Icon */
  .notification-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* Notification Content */
  .notification-content {
    flex: 1;
    min-width: 0;
  }

  .notification-message {
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: calc(var(--layout-spacing_unit) / 4);
  }

  .notification-details {
    font-size: var(--typography-font_size_sm);
    opacity: 0.8;
    line-height: 1.3;
    word-break: break-word;
  }

  /* Dismiss Button */
  .dismiss-button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: calc(var(--layout-spacing_unit) / 4);
    border-radius: calc(var(--layout-border_radius) / 2);
    transition: background-color var(--animation-transition_duration);
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dismiss-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .dismiss-button svg {
    width: 16px;
    height: 16px;
  }

  /* Progress Bar */
  .notification-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background-color: rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background-color: currentColor;
    width: 100%;
    transform-origin: left;
    animation: progress linear forwards;
  }

  @keyframes progress {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .notification-center {
      top: var(--layout-spacing_unit);
      right: var(--layout-spacing_unit);
      left: var(--layout-spacing_unit);
      max-width: none;
    }

    .notification {
      padding: var(--layout-spacing_unit);
    }

    .notification-message {
      font-size: var(--typography-font_size_sm);
    }

    .notification-details {
      font-size: var(--typography-font_size_sm);
    }
  }

  @media (max-width: 480px) {
    .notification-center {
      top: calc(var(--layout-spacing_unit) / 2);
      right: calc(var(--layout-spacing_unit) / 2);
      left: calc(var(--layout-spacing_unit) / 2);
    }
  }
</style>
