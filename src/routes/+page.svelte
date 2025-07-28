<!--
  Main Page Component for the Modular C2 Frontend
  Renders the root App component within the SvelteKit page structure
  Requirements: 1.1, 1.4
-->
<script lang="ts">
  import App from '$lib/components/core/App.svelte';
</script>

<svelte:head>
  <title>Modular C2 Frontend</title>
  <meta name="description" content="Aerospace Command & Control Interface" />
  <meta name="keywords" content="aerospace, command, control, c2, mission planning, sdr" />
  <meta name="author" content="Modular C2 Team" />
</svelte:head>

<App />
