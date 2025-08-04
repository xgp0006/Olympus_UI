<!--
  Group Header Component for Virtual Scrolling
  Optimized header display for parameter groups with minimal re-renders
  Designed for 144fps performance in virtual scroll context
  
  NASA JPL Compliant: Single responsibility and bounded execution
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Component props
  export let groupName: string;
  export let paramCount: number;
  export let expanded: boolean = false;
  export let onToggle: (() => void) | undefined = undefined;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    toggle: { groupName: string };
  }>();

  /**
   * Handle group toggle with event dispatch
   */
  function handleToggle(): void {
    if (onToggle) {
      onToggle();
    }
    dispatch('toggle', { groupName });
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  }
</script>

<!-- Group header container -->
<div
  class="group-header"
  class:expanded
  on:click={handleToggle}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
  aria-label="Toggle {groupName} parameter group"
  aria-expanded={expanded}
>
  <!-- Expansion icon -->
  <span class="group-icon" aria-hidden="true">
    {expanded ? '▼' : '▶'}
  </span>

  <!-- Group name -->
  <span class="group-name">{groupName}</span>

  <!-- Parameter count badge -->
  <span class="group-count" title="{paramCount} parameters in this group">
    ({paramCount})
  </span>
</div>

<style>
  .group-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-background_secondary, #2d2d2d);
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s ease;
    border-bottom: 1px solid var(--color-border_primary, #555555);
    height: 60px; /* Consistent height for virtual scrolling */
    box-sizing: border-box;
  }

  .group-header:hover {
    background: var(--color-background_quaternary, rgba(255, 255, 255, 0.05));
  }

  .group-header:focus {
    outline: 2px solid var(--color-accent_blue, #007acc);
    outline-offset: -2px;
  }

  .group-header.expanded {
    background: var(--color-background_tertiary, #3d3d3d);
  }

  .group-icon {
    margin-right: 0.75rem;
    font-size: 0.9rem;
    transition: transform 0.2s ease;
    color: var(--color-text_secondary, #cccccc);
    min-width: 16px;
    text-align: center;
  }

  .group-header.expanded .group-icon {
    transform: rotate(0deg);
    color: var(--color-accent_blue, #007acc);
  }

  .group-name {
    flex: 1;
    font-weight: 600;
    color: var(--color-text_primary, #ffffff);
    font-size: 0.95rem;
    letter-spacing: 0.025em;
  }

  .group-count {
    font-size: 0.8rem;
    color: var(--color-text_secondary, #cccccc);
    background: var(--color-background_primary, rgba(255, 255, 255, 0.1));
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    line-height: 1;
    font-weight: 500;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .group-header {
      border-bottom: 2px solid var(--color-border_primary, #ffffff);
    }

    .group-header:focus {
      outline: 3px solid var(--color-accent_blue, #007acc);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .group-header,
    .group-icon {
      transition: none;
    }
  }

  /* Print optimization */
  @media print {
    .group-header {
      background: white !important;
      color: black !important;
      border-bottom: 1px solid black;
    }

    .group-name {
      color: black !important;
    }

    .group-count {
      background: #f0f0f0 !important;
      color: black !important;
    }
  }
</style>
