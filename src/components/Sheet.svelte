<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  // Einfaches Bottom-Sheet für kleine Formulare (Barcode-Ergebnis, manuelle Eingabe, Verbrannt).
  let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
  <header>
    <h2>{title}</h2>
    <button class="close" aria-label="Schließen" onclick={onclose}><Icon name="close" size={20} stroke={2.2} /></button>
  </header>
  {@render children()}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(18, 26, 21, 0.4);
    z-index: 30;
  }
  .sheet {
    position: fixed;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    max-height: 90dvh;
    overflow-y: auto;
    background: var(--bg);
    border-radius: 26px 26px 0 0;
    padding: 18px 20px calc(var(--safe-bottom) + 20px);
    display: flex;
    flex-direction: column;
    gap: 14px;
    z-index: 31;
    animation: up 0.18s ease-out;
  }
  @keyframes up {
    from {
      transform: translate(-50%, 30px);
      opacity: 0;
    }
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .close {
    width: 44px;
    height: 44px;
    border-radius: 22px;
    border: 0;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
