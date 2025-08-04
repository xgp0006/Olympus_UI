export { default as DraggableContainer } from './DraggableContainer.svelte';
export { default as DraggableContainerDemo } from './DraggableContainerDemo.svelte';
export { default as NotificationCenter } from './NotificationCenter.svelte';
export { default as VirtualScrollList } from './VirtualScrollList.svelte';
export { default as MemoizedComponent } from './MemoizedComponent.svelte';
export { default as PerformanceDashboard } from './PerformanceDashboard.svelte';

export type {
  DraggableContainerProps,
  DraggablePosition,
  DraggableSize,
  DraggableState,
  DraggableEvents,
  ResizeHandle,
  PerformanceMetrics
} from './draggable-container.types';

// Re-export performance optimization utilities
export {
  RAFThrottler,
  ComponentPool,
  createDebouncer,
  createThrottler,
  EventListenerManager,
  measurePerformance,
  batchDOMUpdates,
  PERFORMANCE_CONSTANTS
} from '$lib/utils/performance-optimizations';
