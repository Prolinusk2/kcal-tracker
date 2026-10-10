<script lang="ts">
  import { app, go, openAdd, mealForNow } from '../lib/state.svelte';
  import Icon from './Icon.svelte';

  let { active }: { active: 'home' | 'diary' | 'settings' } = $props();

  function home() {
    // Auf "Heute" springt ein erneuter Tipp zurück zum heutigen Tag.
    app.homeDay = app.today;
    go('home');
  }
</script>

<nav aria-label="Hauptmenü" class="tabbar">
  <div class="fab-wrap">
    <button class="fab" aria-label="Essen hinzufügen" onclick={() => openAdd(mealForNow(), active)}>
      <Icon name="plus" size={26} stroke={2.6} />
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
