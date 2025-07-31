<!--
  Draggable Messaging Component
  Draggable notification center for mission communications
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte';
  import { notifications, notify, removeNotification, clearNotifications } from '$lib/map-features/messaging/notification-store';
  
  export let id = 'messaging';
  export let title = 'Messages';
  export let initialX = 20;
  export let initialY = 200;
  export let minWidth = 350;
  export let minHeight = 200;
  
  const dispatch = createEventDispatcher<{
    minimize: { minimized: boolean };
  }>();
  
  let isMinimized = false;
  let filter: 'all' | 'info' | 'success' | 'warning' | 'error' = 'all';
  
  // Handle minimize events from DraggableContainer
  function handleMinimize(event: CustomEvent<{ minimized: boolean }>) {
    isMinimized = event.detail.minimized;
    dispatch('minimize', { minimized: isMinimized });
  }
  
  // Get filtered notifications
  $: filteredNotifications = $notifications.filter((n: import('$lib/map-features/messaging/notification-store').Notification) => 
    filter === 'all' || n.type === filter
  );
  
  // Format timestamp
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
  
  // Icon map
  const icons: Record<'info' | 'success' | 'warning' | 'error', string> = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
</script>

<DraggableContainer
  {id}
  {title}
  {initialX}
  {initialY}
  initialWidth={400}
  initialHeight={300}
  {minWidth}
  {minHeight}
  snapToGrid={true}
  snapToEdges={true}
  resizable={true}
  minimizable={true}
  on:minimize={handleMinimize}
>
  <div class="messaging-content">
    <div class="message-controls">
      <div class="filter-buttons">
        <button
          class="filter-btn"
          class:active={filter === 'all'}
          on:click={() => filter = 'all'}
        >
          All ({$notifications.length})
        </button>
        <button
          class="filter-btn"
          class:active={filter === 'info'}
          on:click={() => filter = 'info'}
        >
          Info
        </button>
        <button
          class="filter-btn"
          class:active={filter === 'success'}
          on:click={() => filter = 'success'}
        >
          Success
        </button>
        <button
          class="filter-btn"
          class:active={filter === 'warning'}
          on:click={() => filter = 'warning'}
        >
          Warning
        </button>
        <button
          class="filter-btn"
          class:active={filter === 'error'}
          on:click={() => filter = 'error'}
        >
          Error
        </button>
      </div>
      
      <button
        class="clear-btn"
        on:click={clearNotifications}
        disabled={$notifications.length === 0}
      >
        Clear All
      </button>
    </div>
    
    <div class="message-list">
      {#if filteredNotifications.length === 0}
        <div class="empty-state">
          <p>No messages to display</p>
        </div>
      {:else}
        {#each filteredNotifications.reverse() as notification (notification.id)}
          <div class="message-item message-{notification.type}">
            <div class="message-header">
              <span class="message-icon">{icons[notification.type]}</span>
              <span class="message-time">{formatTime(notification.timestamp)}</span>
              <button
                class="message-remove"
                on:click={() => removeNotification(notification.id)}
                title="Remove"
              >
                ✕
              </button>
            </div>
            <h4 class="message-title">{notification.title}</h4>
            {#if notification.message}
              <p class="message-body">{notification.message}</p>
            {/if}
            {#if notification.actions && notification.actions.length > 0}
              <div class="message-actions">
                {#each notification.actions as action}
                  <button
                    class="message-action"
                    on:click={() => {
                      action.action();
                      removeNotification(notification.id);
                    }}
                  >
                    {action.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</DraggableContainer>

<style>
  .messaging-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  .message-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .filter-buttons {
    display: flex;
    gap: 0.25rem;
  }
  
  .filter-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .filter-btn:hover {
    background: var(--color-surface-variant);
    color: var(--color-text);
  }
  
  .filter-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  
  .clear-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .clear-btn:hover:not(:disabled) {
    background: var(--color-surface-variant);
    color: var(--color-text);
  }
  
  .clear-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  
  .message-item {
    background: var(--color-surface-variant);
    border-radius: 0.5rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border-left: 3px solid transparent;
  }
  
  .message-info {
    border-left-color: #3498db;
  }
  
  .message-success {
    border-left-color: #2ecc71;
  }
  
  .message-warning {
    border-left-color: #f39c12;
  }
  
  .message-error {
    border-left-color: #e74c3c;
  }
  
  .message-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  
  .message-icon {
    font-size: 1rem;
  }
  
  .message-time {
    flex: 1;
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
  }
  
  .message-remove {
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: 0.125rem;
    font-size: 0.875rem;
    line-height: 1;
    transition: color 0.2s ease;
  }
  
  .message-remove:hover {
    color: var(--color-text);
  }
  
  .message-title {
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }
  
  .message-body {
    margin: 0;
    font-size: 0.813rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }
  
  .message-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .message-action {
    padding: 0.25rem 0.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }
  
  .message-action:hover {
    opacity: 0.9;
  }
</style>