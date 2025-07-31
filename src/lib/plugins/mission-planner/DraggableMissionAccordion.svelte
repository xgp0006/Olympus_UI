<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte';
  import MissionAccordion from './MissionAccordion.svelte';
  import type { MissionItem } from './types';
  
  export let id = 'mission-accordion';
  export let title = 'Mission Items';
  export let initialX = 20;
  export let initialY = 400;
  export let missionItems: MissionItem[] = [];
  export let selectedItemId: string | null = null;
  export let minWidth = 350;
  export let minHeight = 300;
  
  const dispatch = createEventDispatcher<{
    selectItem: { id: string };
    updateItem: { id: string; params: any };
    deleteItem: { id: string };
    reorderItems: { items: MissionItem[] };
    minimize: { minimized: boolean };
  }>();
  
  let isMinimized = false;
  
  // Forward events from MissionAccordion
  function handleSelectItem(event: CustomEvent<{ id: string }>) {
    dispatch('selectItem', event.detail);
  }
  
  function handleUpdateItem(event: CustomEvent<{ id: string; params: any }>) {
    dispatch('updateItem', event.detail);
  }
  
  function handleDeleteItem(event: CustomEvent<{ id: string }>) {
    dispatch('deleteItem', event.detail);
  }
  
  function handleReorderItems(event: CustomEvent<{ items: MissionItem[] }>) {
    dispatch('reorderItems', event.detail);
  }
  
  // Handle minimize events from DraggableContainer
  function handleMinimize(event: CustomEvent<{ minimized: boolean }>) {
    isMinimized = event.detail.minimized;
    dispatch('minimize', { minimized: isMinimized });
  }
</script>

<DraggableContainer
  {id}
  {title}
  {initialX}
  {initialY}
  initialWidth={400}
  initialHeight={500}
  {minWidth}
  {minHeight}
  snapToGrid={true}
  snapToEdges={true}
  resizable={true}
  minimizable={true}
  on:minimize={handleMinimize}
>
  <div class="mission-accordion-wrapper">
    <MissionAccordion
      items={missionItems}
      {selectedItemId}
      on:selectItem={handleSelectItem}
      on:updateItem={handleUpdateItem}
      on:deleteItem={handleDeleteItem}
      on:reorderItems={handleReorderItems}
    />
  </div>
</DraggableContainer>

<style>
  .mission-accordion-wrapper {
    height: 100%;
    overflow-y: auto;
    padding: 0.5rem;
  }
</style>