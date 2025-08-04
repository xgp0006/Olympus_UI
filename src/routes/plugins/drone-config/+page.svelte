<script lang="ts">
  import { onMount } from 'svelte';
  import PluginContainer from '$lib/components/plugins/PluginContainer.svelte';
  import { activePluginWritable } from '$lib/stores/plugins';

  // Set the active plugin when the route loads
  onMount(() => {
    activePluginWritable.set('drone-config');

    // Reset active plugin when leaving the route
    return () => {
      activePluginWritable.set(null);
    };
  });
</script>

<PluginContainer pluginId="drone-config" />
