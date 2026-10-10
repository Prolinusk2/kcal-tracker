<script lang="ts">
  import { app, initApp } from './lib/state.svelte';
  import Home from './components/Home.svelte';
  import Diary from './components/Diary.svelte';
  import Settings from './components/Settings.svelte';
  import AddFood from './components/AddFood.svelte';

  initApp();

  // Beim Screenwechsel nach oben scrollen.
  $effect(() => {
    void app.screen;
    window.scrollTo(0, 0);
  });
</script>

<div class="app">
  {#if app.ready}
    {#if app.screen === 'home'}
      <Home />
    {:else if app.screen === 'diary'}
      <Diary />
    {:else if app.screen === 'settings'}
      <Settings />
    {:else}
      <AddFood />
    {/if}
  {/if}
</div>

<style>
  .app {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100dvh;
    position: relative;
  }
</style>
