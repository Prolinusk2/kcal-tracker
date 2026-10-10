<script lang="ts">
  import { app, dataChanged } from '../lib/state.svelte';
  import { saveSettings, exportData, importData, loadSettings } from '../lib/db';
  import { todayKey } from '../lib/dates';
  import type { Goals } from '../lib/types';
  import Icon from './Icon.svelte';
  import TabBar from './TabBar.svelte';
  import ModelPicker from './ModelPicker.svelte';

  let pickerOpen = $state(false);
  let apiKey = $state(app.settings.apiKey);
  let model = $state(app.settings.model);
  let showKey = $state(false);
  let saved = $state(false);
  let goals = $state<Record<keyof Goals, string>>(
    Object.fromEntries(Object.entries(app.settings.goals).map(([k, v]) => [k, String(v)])) as Record<keyof Goals, string>,
  );

  const DEFS: [keyof Goals, string, string][] = [
    ['kcal', 'Tagesziel', 'kcal'],
    ['tol', 'Spielraum (±)', 'kcal'],
    ['protein', 'Eiweiß', 'g'],
    ['carbs', 'Kohlenhydrate', 'g'],
    ['fat', 'Fett', 'g'],
  ];

  async function save() {
    const parsed = Object.fromEntries(
      DEFS.map(([k]) => [k, Math.max(0, parseInt(goals[k], 10) || app.settings.goals[k])]),
    ) as unknown as Goals;
    app.settings = { apiKey: apiKey.trim(), model: model.trim(), goals: parsed };
    await saveSettings(app.settings);
    goals = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])) as Record<keyof Goals, string>;
    saved = true;
  }

  // ---------- Export / Import ----------
  let dataMsg = $state('');
  let fileInput: HTMLInputElement;

  async function doExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kcal-tracker-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    dataMsg = `${data.entries.length} Einträge exportiert.`;
  }

  async function doImport(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const n = await importData(JSON.parse(await file.text()));
      const s = await loadSettings();
      app.settings = s;
      model = s.model;
      goals = Object.fromEntries(Object.entries(s.goals).map(([k, v]) => [k, String(v)])) as Record<keyof Goals, string>;
      dataChanged();
      dataMsg = `${n} Einträge importiert.`;
    } catch (err) {
      dataMsg = err instanceof SyntaxError ? 'Die Datei ist kein gültiges JSON.' : (err as Error).message;
    } finally {
      fileInput.value = '';
    }
  }
</script>

<main class="screen">
  <header class="head">
    <h1 class="title">Einstellungen</h1>
    <button class="save" class:done={saved} onclick={save}>{saved ? 'Gespeichert ✓' : 'Speichern'}</button>
  </header>

  <section aria-labelledby="ki-title" class="card section">
    <div class="sec-head">
      <span class="icon-tile sm" style="background: #DCEFE2; color: #1F5E3A"><Icon name="sparkle" size={17} /></span>
      <div class="sec-title">
        <h2 id="ki-title">KI-Erkennung</h2>
        <div class="sub">Über OpenRouter</div>
      </div>
    </div>

    <div class="group">
      <label for="api-key">API-Key</label>
      <div class="field key-field">
        <input
          id="api-key" class="mono" type={showKey ? 'text' : 'password'} placeholder="sk-or-…"
          autocomplete="off" spellcheck="false" bind:value={apiKey} oninput={() => (saved = false)}
        />
        <button class="eye" aria-label={showKey ? 'Key verbergen' : 'Key anzeigen'} onclick={() => (showKey = !showKey)}>
          <Icon name={showKey ? 'eye-off' : 'eye'} size={19} />
        </button>
      </div>
      <div class="hint">Deinen Key bekommst du unter <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai › Keys</a>. Er bleibt auf deinem Gerät.</div>
    </div>

    <div class="group">
      <label for="model">Modell</label>
      <div class="model-row">
        <div class="field">
          <input
            id="model" class="mono" type="text" placeholder="anbieter/modell-name"
            autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={model} oninput={() => (saved = false)}
          />
        </div>
        <button class="pick-btn" onclick={() => (pickerOpen = true)}>Auswählen</button>
      </div>
      <div class="hint">Aus der Liste wählen oder die Modell-ID genau so eintippen, wie sie bei <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">OpenRouter</a> steht.</div>
    </div>
  </section>

  <section aria-labelledby="ziele-title" class="card section goals">
    <div class="sec-head pad">
      <span class="icon-tile sm" style="background: #FCEBD8; color: #9A5412"><Icon name="target" size={17} /></span>
      <h2 id="ziele-title">Ziele</h2>
    </div>
    {#each DEFS as [k, label, unit] (k)}
      <div class="goal-row">
        <label for="goal-{k}">{label}</label>
        <div class="field goal-field">
          <input id="goal-{k}" type="number" inputmode="numeric" min="0" bind:value={goals[k]} oninput={() => (saved = false)} />
          <span class="unit">{unit}</span>
        </div>
      </div>
    {/each}
  </section>

  <section aria-labelledby="data-title" class="card section">
    <div class="sec-head">
      <span class="icon-tile sm" style="background: #E4E2F4; color: #4A3E8F"><Icon name="database" size={17} /></span>
      <div class="sec-title">
        <h2 id="data-title">Daten</h2>
        <div class="sub">Alles liegt nur auf diesem Gerät</div>
      </div>
    </div>
    <div class="data-btns">
      <button class="btn-secondary" onclick={doExport}><Icon name="download" size={18} />Exportieren</button>
      <button class="btn-secondary" onclick={() => fileInput.click()}><Icon name="upload" size={18} />Importieren</button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={doImport} />
    </div>
    <div class="hint">{dataMsg || 'Mach ab und zu ein Backup – beim Löschen der Browserdaten ist sonst alles weg. Der API-Key wird nicht mit exportiert.'}</div>
  </section>
</main>

<TabBar active="settings" />

{#if pickerOpen}
  <ModelPicker
    current={model}
    onclose={() => (pickerOpen = false)}
    onpick={(id) => {
      model = id;
      pickerOpen = false;
      save();
    }}
  />
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
  }
  .save {
    height: 40px;
    padding: 0 16px;
    border-radius: 20px;
    border: 0;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
  }
  .save.done {
    background: var(--muted-strong);
  }
  .section {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .goals {
    padding: 16px 16px 6px;
    gap: 0;
  }
  .sec-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sec-head.pad {
    padding-bottom: 8px;
  }
  .icon-tile.sm {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }
  .sec-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  .sub,
  .hint {
    font-size: 12px;
    color: var(--muted);
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  label {
    font-size: 13px;
    font-weight: 600;
  }
  .mono {
    font-family: var(--font-mono);
    font-size: 14px !important;
  }
  .model-row {
    display: flex;
    gap: 8px;
  }
  .model-row .field {
    flex-grow: 1;
    min-width: 0;
  }
  .pick-btn {
    height: 48px;
    padding: 0 14px;
    flex-shrink: 0;
    border: 0;
    border-radius: 14px;
    background: var(--ink);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
  }
  .key-field {
    padding: 0 4px 0 12px;
  }
  .eye {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 0;
    background: transparent;
    color: var(--muted-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .goal-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid var(--line);
    min-height: 50px;
  }
  .goal-row label {
    font-size: 14px;
    font-weight: 500;
  }
  .goal-field {
    height: 38px;
    width: 128px;
    border-radius: 12px;
    padding: 0 10px;
  }
  .goal-field input {
    width: 60px;
    font-size: 15px;
    font-weight: 600;
    text-align: right;
  }
  .unit {
    font-size: 13px;
    color: var(--muted);
    width: 30px;
  }
  .data-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .data-btns button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
</style>
