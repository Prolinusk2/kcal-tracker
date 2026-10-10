<script lang="ts">
  import { fetchModels, formatEntryCost, formatTokenPrice, type ModelInfo } from '../lib/models';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';

  let { current, onpick, onclose }: { current: string; onpick: (id: string) => void; onclose: () => void } = $props();

  let models = $state<ModelInfo[]>([]);
  let status = $state<'loading' | 'done' | 'error'>('loading');
  let error = $state('');
  let query = $state('');
  let onlyFree = $state(false);
  let sort = $state<'price' | 'new'>('price');

  function load() {
    status = 'loading';
    fetchModels()
      .then((m) => {
        models = m;
        status = 'done';
      })
      .catch((e) => {
        error = (e as Error).message;
        status = 'error';
      });
  }
  load();

  const freeCount = $derived(models.filter((m) => m.free).length);

  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const list = models.filter(
      (m) => (!onlyFree || m.free) && (!q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)),
    );
    // Variable Preise ans Ende, sonst nach Kosten bzw. Datum
    const cost = (m: ModelInfo) => m.centsPerEntry ?? Infinity;
    return list.sort((a, b) => (sort === 'price' ? cost(a) - cost(b) || b.created - a.created : b.created - a.created));
  });
</script>

<Sheet title="Modell wählen" {onclose}>
  <div class="controls">
    <div class="field white">
      <label class="sr-only" for="model-search">Modell suchen</label>
      <input id="model-search" type="search" placeholder="Suchen, z. B. gemini, llama …" autocomplete="off" bind:value={query} />
    </div>
    <div class="row">
      <button class="chip" class:on={onlyFree} aria-pressed={onlyFree} onclick={() => (onlyFree = !onlyFree)}>
        {#if onlyFree}<Icon name="check" size={14} stroke={3} />{/if}Nur kostenlos{status === 'done' ? ` (${freeCount})` : ''}
      </button>
      <div class="seg" role="radiogroup" aria-label="Sortierung">
        <button role="radio" aria-checked={sort === 'price'} class:on={sort === 'price'} onclick={() => (sort = 'price')}>Günstigste</button>
        <button role="radio" aria-checked={sort === 'new'} class:on={sort === 'new'} onclick={() => (sort = 'new')}>Neueste</button>
      </div>
    </div>
  </div>

  {#if status === 'loading'}
    <p class="msg">Lade Modelle von OpenRouter …</p>
  {:else if status === 'error'}
    <p class="msg err">{error}</p>
    <button class="btn-primary" onclick={load}>Nochmal versuchen</button>
  {:else}
    {#if onlyFree}
      <p class="note">Kostenlose Modelle haben Limits (Anfragen pro Minute/Tag), sind manchmal langsamer und verschwinden auch mal wieder.</p>
    {/if}
    <div class="card list">
      {#each shown as m, i (m.id)}
        <button class="model" class:first={i === 0} class:current={m.id === current} onclick={() => onpick(m.id)}>
          <span class="text">
            <span class="name">{m.name}</span>
            <span class="id">{m.id}</span>
            {#if formatTokenPrice(m) && !m.free}<span class="price">{formatTokenPrice(m)}</span>{/if}
          </span>
          <span class="cost" class:free={m.free}>{formatEntryCost(m)}</span>
          {#if m.id === current}<span class="tick"><Icon name="check" size={18} stroke={2.6} /></span>{/if}
        </button>
      {:else}
        <p class="msg pad">Nichts gefunden.</p>
      {/each}
    </div>
    <p class="note">Kosten pro Eintrag sind grob geschätzt (ca. 800 Tokens rein, 250 raus).</p>
  {/if}
</Sheet>

<style>
  .controls {
    position: sticky;
    top: -18px;
    margin: -18px -20px 0;
    padding: 18px 20px 4px;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1;
  }
  .white {
    background: var(--surface);
  }
  .row {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }
  .chip {
    height: 40px;
    padding: 0 14px;
    border-radius: 20px;
    border: 1.5px solid var(--check-border);
    background: var(--surface);
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }
  .seg {
    display: flex;
    gap: 2px;
    background: var(--surface);
    border-radius: 14px;
    padding: 3px;
  }
  .seg button {
    height: 34px;
    padding: 0 10px;
    border: 0;
    border-radius: 11px;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }
  .seg button.on {
    background: var(--ink);
    color: #fff;
  }
  .msg {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
  }
  .msg.pad {
    padding: 14px 16px;
  }
  .err {
    color: var(--danger);
  }
  .note {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.4;
  }
  .list {
    border-radius: 20px;
    padding: 4px 0;
  }
  .model {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px 10px 16px;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    text-align: left;
  }
  .model.first {
    border-top: 0;
  }
  .model.current {
    background: #f1f7f3;
  }
  .text {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .name {
    font-size: 14px;
    font-weight: 600;
  }
  .id {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .price {
    font-size: 11px;
    color: var(--muted);
  }
  .cost {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    text-align: right;
    max-width: 92px;
  }
  .cost.free {
    padding: 4px 9px;
    border-radius: 999px;
    background: #d3ebdb;
    color: #154a2c;
  }
  .tick {
    color: var(--accent);
    display: flex;
    flex-shrink: 0;
  }
</style>
