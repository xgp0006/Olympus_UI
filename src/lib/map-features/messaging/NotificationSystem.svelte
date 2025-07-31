<!--
  Notification System Component
  Global notification display for map features
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  // Import from centralized store
  import { 
    notifications, 
    removeNotification, 
    clearNotifications,
    type Notification 
  } from './notification-store';
  
  let notificationElements: Map<string, HTMLDivElement> = new Map();
  
  // Icon map
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  // Animation for new notifications
  function animateIn(node: HTMLDivElement) {
    node.style.transform = 'translateX(400px)';
    node.style.opacity = '0';
    
    setTimeout(() => {
      node.style.transition = 'all 0.3s ease-out';
      node.style.transform = 'translateX(0)';
      node.style.opacity = '1';
    }, 10);
  }
  
  // Animation for removing notifications
  function animateOut(id: string) {
    const node = notificationElements.get(id);
    if (node) {
      node.style.transition = 'all 0.3s ease-in';
      node.style.transform = 'translateX(400px)';
      node.style.opacity = '0';
      
      setTimeout(() => {
        removeNotification(id);
      }, 300);
    }
  }
</script>

<div class="notification-container">
  {#each $notifications as notification (notification.id)}
    <div
      class="notification notification-{notification.type}"
      use:animateIn
    >
      <div class="notification-header">
        <span class="notification-icon">{icons[notification.type]}</span>
        <h4 class="notification-title">{notification.title}</h4>
        <button
          class="notification-close"
          on:click={() => animateOut(notification.id)}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      
      {#if notification.message}
        <p class="notification-message">{notification.message}</p>
      {/if}
      
      {#if notification.actions && notification.actions.length > 0}
        <div class="notification-actions">
          {#each notification.actions as action}
            <button
              class="notification-action"
              on:click={() => {
                action.action();
                animateOut(notification.id);
              }}
            >
              {action.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
    pointer-events: none;
  }
  
  .notification {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
  }
  
  .notification-info {
    border-left: 4px solid #3498db;
  }
  
  .notification-success {
    border-left: 4px solid #2ecc71;
  }
  
  .notification-warning {
    border-left: 4px solid #f39c12;
  }
  
  .notification-error {
    border-left: 4px solid #e74c3c;
  }
  
  .notification-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .notification-icon {
    font-size: 20px;
  }
  
  .notification-title {
    flex: 1;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
  }
  
  .notification-close {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 4px;
    font-size: 16px;
    line-height: 1;
    transition: color 0.2s ease;
  }
  
  .notification-close:hover {
    color: var(--color-text);
  }
  
  .notification-message {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
  
  .notification-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  
  .notification-action {
    padding: 6px 12px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }
  
  .notification-action:hover {
    opacity: 0.9;
  }
</style>