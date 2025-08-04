<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DraggableContainerEnhanced from '$lib/components/ui/DraggableContainerEnhanced.svelte';
  import MissionAccordion from './MissionAccordion.svelte';
  import MinimizedCoin from './MinimizedCoin.svelte';
  import type { MissionItem } from './types';

  export let id = 'mission-accordion';
  export let title = 'Mission Items';
  export let initialX = 20;
  export let initialY = 400;
  export let missionItems: MissionItem[] = [];
  export let selectedItemId: string | null = null;
  export let minWidth = 400;
  export let minHeight = 400;

  const dispatch = createEventDispatcher<{
    selectItem: { id: string | null };
    updateItem: { id: string; params: any };
    deleteItem: { id: string };
    reorderItems: { items: MissionItem[] };
    minimize: { minimized: boolean };
    createWaypointCard: { itemId: string };
  }>();

  let isMinimized = false;
  let minimizedPosition = { x: initialX, y: initialY };

  // Minimized coin props
  $: minimizedCoinProps = {
    item: {
      id: 'mission-accordion',
      type: 'waypoint',
      name: `${missionItems.length} Items`,
      params: {},
      position: { lat: 0, lng: 0, alt: 0 }
    } as MissionItem,
    isPinned: false,
    snapPoints: [],
    initialPosition: minimizedPosition,
    disableOwnDragging: false
  };

  // Forward events from MissionAccordion
  function handleSelectItem(event: CustomEvent<{ itemId: string | null }>) {
    dispatch('selectItem', { id: event.detail.itemId });
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

  function handleCreateWaypointCard(event: CustomEvent<{ itemId: string }>) {
    dispatch('createWaypointCard', event.detail);
  }

  // Handle minimize events from DraggableContainer
  function handleMinimize(event: CustomEvent<{ minimized: boolean }>) {
    isMinimized = event.detail.minimized;
    dispatch('minimize', { minimized: isMinimized });
  }

  // Handle coin expand
  function handleCoinExpand(event: CustomEvent<{ itemId: string }>) {
    // The enhanced container will handle restoration
    console.log('Expanding mission accordion from coin');
  }

  // Handle coin move
  function handleCoinMove(
    event: CustomEvent<{ itemId: string; position: { x: number; y: number } }>
  ) {
    minimizedPosition = event.detail.position;
  }
</script>

<DraggableContainerEnhanced
  {id}
  {title}
  {initialX}
  {initialY}
  initialWidth={500}
  initialHeight={600}
  {minWidth}
  {minHeight}
  maxWidth={600}
  maxHeight={800}
  snapToGrid={true}
  snapToEdges={true}
  resizable={true}
  minimizable={true}
  dockable={true}
  autoResize={false}
  minimizedComponent={MinimizedCoin}
  minimizedProps={minimizedCoinProps}
  on:minimize={handleMinimize}
  on:restore={() => (isMinimized = false)}
>
  <div class="mission-accordion-wrapper">
    <MissionAccordion
      items={missionItems}
      {selectedItemId}
      on:selectItem={handleSelectItem}
      on:updateItem={handleUpdateItem}
      on:deleteItem={handleDeleteItem}
      on:reorderItems={handleReorderItems}
      on:createWaypointCard={handleCreateWaypointCard}
    />
  </div>
</DraggableContainerEnhanced>

<style>
  .mission-accordion-wrapper {
    height: 100%;
    overflow-y: auto;
    padding: 0.5rem;
  }
</style>
