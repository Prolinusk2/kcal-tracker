<script lang="ts">
  import { app, go, openAdd, mealForNow, type Screen } from '../lib/state.svelte';
  import { pendingCount } from '../lib/draft.svelte';
  import Icon from './Icon.svelte';

  let { active }: { active: Screen } = $props();

  const pending = $derived(pendingCount());

  function home() {
    // Auf "Heute" springt ein erneuter Tipp zurück zum heutigen Tag.
    app.homeDay = app.today;
    go('home');
  }

  function add() {
    if (active === 'add') {
      document.getElementById('food-text')?.focus();
      return;
    }
    // Liegt noch ein Entwurf vor, bleibt dessen Mahlzeit erhalten.
    openAdd(pending ? app.addMeal : mealForNow(), active);
  }
</script>

<nav aria-label="Hauptmenü" class="tabbar">
  <div class="fab-wrap">
    <button
      class="fab"
      class:active={active === 'add'}
      aria-label={pending ? `Essen hinzufügen – ${pending} nicht gespeichert` : 'Essen hinzufügen'}
      aria-current={active === 'add' ? 'page' : undefined}
      onclick={add}
    >
      <Icon name="plus" size={active === 'add' ? 30 : 26} stroke={active === 'add' ? 3.8 : 2.6} />
      {#if pending && active !== 'add'}<span class="badge">{pending}</span>{/if}
    </button>
  </div>
  <button class="tab" class:active={active === 'home'} aria-current={active === 'home' ? 'page' : undefined} onclick={home}>
    <Icon name="home" />Heute
  </button>
  <button class="tab" class:active={active === 'diary'} aria-current={active === 'diary' ? 'page' : undefined} onclick={() => go('diary')}>
    <Icon name="book" />Tagebuch
  </button>
  <button class="tab" class:active={active === 'settings'} aria-current={active === 'settings' ? 'page' : undefined} onclick={() => go('settings')}>
    <Icon name="gear" /><span class="small">Einstellungen</span>
  </button>
</nav>

<style>
  .tabbar {
    position: fixed;
    left: max(12px, calc(50% - 228px));
    right: max(12px, calc(50% - 228px));
    bottom: calc(var(--safe-bottom) + 20px);
    height: 68px;
    border-radius: 24px;
    background: var(--ink);
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: center;
    padding: 0 6px;
    z-index: 10;
  }
  .fab-wrap {
    display: flex;
    justify-content: center;
  }
  .fab {
    position: relative;
    width: 54px;
    height: 54px;
    border-radius: 19px;
    border: 0;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 11px;
    background: var(--over);
    color: #fff;
    border: 2px solid var(--ink);
    font-size: 12px;
    font-weight: 700;
    line-height: 18px;
  }
  .tab {
    height: 56px;
    border: 0;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--nav-inactive);
    font-size: 11px;
    font-weight: 500;
  }
  .tab.active {
    color: #fff;
    font-weight: 600;
  }
  .small {
    font-size: 10px;
    white-space: nowrap;
  }
</style>
