<script lang="ts">
  import { app, closeAdd, dataChanged, go } from '../lib/state.svelte';
  import { addEntries, deleteEntry, entriesForDate, recentFoods } from '../lib/db';
  import { recognizeFood } from '../lib/ai';
  import { lookupBarcode, productPortion, ProductNotFound, type Product } from '../lib/off';
  import { MEALS, fmt, type Entry, type EntrySource, type FoodItem, type MealIndex } from '../lib/types';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';
  import Scanner from './Scanner.svelte';

  type Pick = { item: FoodItem; on: boolean };
  type Exchange = { id: number; text: string; status: 'loading' | 'done' | 'error'; error: string; items: Pick[] };

  let meal = $state<MealIndex>(app.addMeal);

  // ---------- KI-Eingabe ----------
  let text = $state('');
  let exchanges = $state<Exchange[]>([]);
  let nextId = 0;
  const needsSetup = $derived(!app.settings.apiKey || !app.settings.model);

  async function send() {
    const t = text.trim();
    if (!t) return;
    text = '';
    const ex: Exchange = { id: nextId++, text: t, status: 'loading', error: '', items: [] };
    exchanges.push(ex);
    const id = ex.id;
    const find = () => exchanges.find((x) => x.id === id);
    try {
      const items = await recognizeFood(t, app.settings.apiKey, app.settings.model);
      const cur = find();
      if (!cur) return; // inzwischen verworfen
      cur.items = items.map((item) => ({ item, on: true }));
      cur.status = 'done';
      if (!items.length) {
        cur.status = 'error';
        cur.error = 'Ich habe darin kein Essen erkannt.';
      }
    } catch (e) {
      const cur = find();
      if (!cur) return;
      cur.status = 'error';
      cur.error = (e as Error).message;
    }
  }

  function redo(id: number) {
    const ex = exchanges.find((x) => x.id === id);
    if (ex) text = ex.text;
    exchanges = exchanges.filter((x) => x.id !== id);
  }

  // ---------- Gescannt & manuell ----------
  let extras = $state<(Pick & { source: 'barcode' | 'manual' })[]>([]);

  let scanOpen = $state(false);
  let lookup = $state<
    | null
    | { status: 'loading'; code: string }
    | { status: 'found'; code: string; product: Product }
    | { status: 'notfound'; code: string }
    | { status: 'error'; code: string; error: string }
  >(null);
  let amount = $state('100');

  async function onDetect(code: string) {
    scanOpen = false;
    lookup = { status: 'loading', code };
    try {
      const product = await lookupBarcode(code);
      amount = String(product.servingGrams ?? 100);
      lookup = { status: 'found', code, product };
    } catch (e) {
      lookup = e instanceof ProductNotFound ? { status: 'notfound', code } : { status: 'error', code, error: (e as Error).message };
    }
  }

  const amountNum = $derived(Math.max(0, parseFloat(amount.replace(',', '.')) || 0));

  function takeProduct(e: SubmitEvent) {
    e.preventDefault();
    if (lookup?.status !== 'found' || !amountNum) return;
    extras.push({ item: productPortion(lookup.product, amountNum), on: true, source: 'barcode' });
    lookup = null;
  }

  let manualOpen = $state(false);
  let manual = $state({ name: '', portion: '', kcal: '', protein: '', carbs: '', fat: '' });

  function openManual(name = '') {
    manual = { name, portion: '', kcal: '', protein: '', carbs: '', fat: '' };
    lookup = null;
    manualOpen = true;
  }

  function takeManual(e: SubmitEvent) {
    e.preventDefault();
    const n = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);
    const kcal = Math.round(n(manual.kcal));
    if (!kcal) return;
    extras.push({
      item: {
        name: manual.name.trim() || 'Eigener Eintrag',
        portion: manual.portion.trim(),
        kcal,
        protein: n(manual.protein),
        carbs: n(manual.carbs),
        fat: n(manual.fat),
      },
      on: true,
      source: 'manual',
    });
    manualOpen = false;
  }

  // ---------- Erkanntes / Gescanntes anpassen ----------
  const FACTORS = [
    { value: 0.5, label: '½' },
    { value: 0.75, label: '¾' },
    { value: 1, label: '1×' },
    { value: 1.5, label: '1½' },
    { value: 2, label: '2×' },
  ];
  const num1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  const parseNum = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);

  let edit = $state<null | {
    pick: Pick;
    base: FoodItem; // Werte beim Öffnen – Grundlage für die Mengen-Faktoren
    factor: number;
    name: string;
    portion: string;
    kcal: string;
    protein: string;
    carbs: string;
    fat: string;
  }>(null);

  function openEdit(pick: Pick) {
    const i = pick.item;
    edit = {
      pick,
      base: { ...i },
      factor: 1,
      name: i.name,
      portion: i.portion,
      kcal: String(Math.round(i.kcal)),
      protein: num1(i.protein),
      carbs: num1(i.carbs),
      fat: num1(i.fat),
    };
  }

  function setFactor(f: number) {
    if (!edit) return;
    const b = edit.base;
    edit.factor = f;
    edit.portion = f === 1 ? b.portion : `${num1(f)} × ${b.portion || 'Portion'}`;
    edit.kcal = String(Math.round(b.kcal * f));
    edit.protein = num1(b.protein * f);
    edit.carbs = num1(b.carbs * f);
    edit.fat = num1(b.fat * f);
  }

  function stepKcal(delta: number) {
    if (!edit) return;
    edit.kcal = String(Math.max(0, Math.round(parseNum(edit.kcal) + delta)));
  }

  function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    if (!edit) return;
    edit.pick.item = {
      name: edit.name.trim() || edit.base.name,
      portion: edit.portion.trim(),
      kcal: Math.round(parseNum(edit.kcal)),
      protein: parseNum(edit.protein),
      carbs: parseNum(edit.carbs),
      fat: parseNum(edit.fat),
    };
    edit.pick.on = true;
    edit = null;
  }

  // ---------- Zuletzt gegessen & schon eingetragen ----------
  let recent = $state<Pick[]>([]);
  recentFoods(6).then((r) => (recent = r.map((item) => ({ item, on: false }))));

  let existing = $state<Entry[]>([]);
  $effect(() => {
    const m = meal;
    void app.dataVersion;
    entriesForDate(app.today).then((e) => {
      if (m === meal) existing = e.filter((x) => x.meal === m);
    });
  });

  async function remove(id: string) {
    await deleteEntry(id);
    dataChanged();
  }

  // ---------- Speichern ----------
  const selected = $derived([
    ...exchanges.flatMap((x) => x.items.filter((p) => p.on).map((p) => ({ ...p.item, source: 'ai' as EntrySource }))),
    ...extras.filter((p) => p.on).map((p) => ({ ...p.item, source: p.source as EntrySource })),
    ...recent.filter((p) => p.on).map((p) => ({ ...p.item, source: 'recent' as EntrySource })),
  ]);
  const selectedKcal = $derived(selected.reduce((s, i) => s + i.kcal, 0));
  const busy = $derived(exchanges.some((x) => x.status === 'loading'));
  let saving = $state(false);

  async function confirm() {
    if (saving) return;
    if (selected.length) {
      saving = true;
      await addEntries(app.today, meal, selected);
      dataChanged();
    }
    closeAdd();
  }

  const ctaLabel = $derived(
    selected.length === 0
      ? `Zu ${MEALS[meal].name} hinzufügen`
      : `${selected.length} ${selected.length === 1 ? 'Eintrag' : 'Einträge'} zu ${MEALS[meal].name}`,
  );
</script>

<main class="screen add">
  <header class="head">
    <button class="round" aria-label="Schließen" onclick={closeAdd}><Icon name="close" size={20} stroke={2.2} /></button>
    <h1>Essen hinzufügen</h1>
    <div style="width: 44px; flex-shrink: 0"></div>
  </header>

  <div role="radiogroup" aria-label="Mahlzeit" class="seg">
    {#each MEALS as m, i (i)}
      <button role="radio" aria-checked={meal === i} class:on={meal === i} onclick={() => (meal = i as MealIndex)}>{m.short}</button>
    {/each}
  </div>

  <div class="ai-input">
    <div class="ai-label"><Icon name="sparkle" size={16} />Einfach eintippen, was du gegessen hast</div>
    <div class="input-row">
      <form class="text-field" onsubmit={(e) => (e.preventDefault(), send())}>
        <label class="sr-only" for="food-text">Was hast du gegessen?</label>
        <input id="food-text" type="text" enterkeyhint="send" placeholder="z. B. 2 Brötchen mit Käse und Kaffee" bind:value={text} autocomplete="off" />
        <button class="send" aria-label="Senden" type="submit" disabled={!text.trim()}><Icon name="arrow" size={18} stroke={2.4} /></button>
      </form>
      <button class="scan" aria-label="Barcode scannen" onclick={() => (scanOpen = true)}><Icon name="barcode" /></button>
    </div>
    {#if needsSetup}
      <div class="setup-hint">
        Für die KI-Erkennung brauchst du einen OpenRouter-Key und ein Modell.
        <button class="link-btn inline" onclick={() => go('settings')}>Zu den Einstellungen</button>
      </div>
    {/if}
  </div>

  <button class="manual-btn" onclick={() => openManual()}>
    <span class="icon-tile mini" style="background: #E4E2F4; color: #4A3E8F"><Icon name="pencil" size={16} /></span>Kcal manuell eingeben
  </button>

  {#each exchanges as ex (ex.id)}
    <section aria-label="KI-Ergebnis" class="chat">
      <div class="bubble">{ex.text}</div>
      <div class="bot">
        <div class="bot-head">
          <span class="bot-icon"><Icon name="sparkle" size={14} stroke={2.2} /></span>
          {#if ex.status === 'loading'}
            <span class="thinking">Ich rechne nach<span class="dots"><i>.</i><i>.</i><i>.</i></span></span>
          {:else if ex.status === 'error'}
            <span class="err">{ex.error}</span>
          {:else}
            Das habe ich erkannt – antippen zum Anpassen:
          {/if}
        </div>
        {#each ex.items as p, i (i)}
          {@render checkRow(p)}
        {/each}
        {#if ex.status !== 'loading'}
          <button class="link-btn" onclick={() => redo(ex.id)}>Stimmt nicht? Neu eingeben</button>
        {/if}
      </div>
    </section>
  {/each}

  {#if extras.length}
    <section aria-label="Gescannt und manuell" class="card list-card padded">
      <div class="bot-head">Gescannt &amp; manuell – antippen zum Anpassen:</div>
      {#each extras as p, i (i)}
        {@render checkRow(p)}
      {/each}
    </section>
  {/if}

  {#if !exchanges.length && recent.length}
    <section aria-label="Zuletzt gegessen" class="block">
      <h2>Zuletzt gegessen</h2>
      <div class="card list-card">
        {#each recent as p, i (i)}
          <div class="recent-row" class:first={i === 0}>
            <div class="recent-text">
              <div class="recent-name">{p.item.name}</div>
              <div class="recent-meta">{p.item.portion ? p.item.portion + ' · ' : ''}{fmt(p.item.kcal)} kcal</div>
            </div>
            <button
              class="toggle" class:on={p.on}
              aria-label={(p.on ? 'Entfernen: ' : 'Hinzufügen: ') + p.item.name}
              aria-pressed={p.on}
              onclick={() => (p.on = !p.on)}
            >
              <Icon name={p.on ? 'check' : 'plus'} size={18} stroke={2.6} />
            </button>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if existing.length}
    <section aria-label="Schon eingetragen" class="block">
      <h2>Schon in {MEALS[meal].name}</h2>
      <div class="card list-card">
        {#each existing as e, i (e.id)}
          <div class="recent-row" class:first={i === 0}>
            <div class="recent-text">
              <div class="recent-name">{e.name}</div>
              <div class="recent-meta">{e.portion ? e.portion + ' · ' : ''}{fmt(e.kcal)} kcal</div>
            </div>
            <button class="toggle del" aria-label="Löschen: {e.name}" onclick={() => remove(e.id)}><Icon name="trash" size={18} /></button>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</main>

<div class="cta-wrap">
  <button class="cta" onclick={confirm} disabled={saving || (busy && !selected.length)}>
    <span>{ctaLabel}</span><span>{fmt(selectedKcal)} kcal</span>
  </button>
</div>

{#snippet checkRow(p: Pick)}
  <div class="check-row">
    <button class="box-btn" aria-label={(p.on ? 'Abwählen: ' : 'Auswählen: ') + p.item.name} aria-pressed={p.on} onclick={() => (p.on = !p.on)}>
      <span class="box" class:on={p.on}><Icon name="check" size={14} stroke={3} /></span>
    </button>
    <button class="check-body" aria-label="Bearbeiten: {p.item.name}" onclick={() => openEdit(p)}>
      <span class="check-text" class:off={!p.on}><span class="check-name">{p.item.name}</span><span class="check-portion">{p.item.portion}</span></span>
      <span class="check-kcal" class:off={!p.on}>{fmt(p.item.kcal)} kcal</span>
      <span class="edit-hint"><Icon name="pencil" size={14} /></span>
    </button>
  </div>
{/snippet}

{#if edit}
  <Sheet title="Anpassen" onclose={() => (edit = null)}>
    <form class="sheet-form" onsubmit={saveEdit}>
      <label class="lbl" for="e-name">Was?</label>
      <div class="field white"><input id="e-name" type="text" bind:value={edit.name} /></div>

      <span class="lbl">Menge</span>
      <div class="factors" role="radiogroup" aria-label="Menge anpassen">
        {#each FACTORS as f (f.value)}
          <button type="button" role="radio" aria-checked={edit.factor === f.value} class:on={edit.factor === f.value} onclick={() => setFactor(f.value)}>{f.label}</button>
        {/each}
      </div>
      <div class="field white"><input aria-label="Portion" type="text" placeholder="z. B. 150 g" bind:value={edit.portion} /></div>

      <label class="lbl" for="e-kcal">Kalorien</label>
      <div class="stepper">
        <button type="button" class="step" aria-label="10 kcal weniger" onclick={() => stepKcal(-10)}>−</button>
        <div class="field white kcal-field">
          <input id="e-kcal" type="text" inputmode="numeric" bind:value={edit.kcal} />
          <span class="unit">kcal</span>
        </div>
        <button type="button" class="step" aria-label="10 kcal mehr" onclick={() => stepKcal(10)}>+</button>
      </div>

      <div class="three">
        <div class="col">
          <label class="lbl" for="e-p">Eiweiß</label>
          <div class="field white"><input id="e-p" type="text" inputmode="decimal" bind:value={edit.protein} /><span class="unit">g</span></div>
        </div>
        <div class="col">
          <label class="lbl" for="e-c">KH</label>
          <div class="field white"><input id="e-c" type="text" inputmode="decimal" bind:value={edit.carbs} /><span class="unit">g</span></div>
        </div>
        <div class="col">
          <label class="lbl" for="e-f">Fett</label>
          <div class="field white"><input id="e-f" type="text" inputmode="decimal" bind:value={edit.fat} /><span class="unit">g</span></div>
        </div>
      </div>
      <button class="btn-primary" type="submit">Übernehmen</button>
    </form>
  </Sheet>
{/if}

{#if scanOpen}
  <Scanner ondetect={onDetect} onclose={() => (scanOpen = false)} />
{/if}

{#if lookup}
  <Sheet title={lookup.status === 'found' ? 'Produkt gefunden' : 'Barcode ' + lookup.code} onclose={() => (lookup = null)}>
    {#if lookup.status === 'loading'}
      <p class="sheet-text">Suche bei Open Food Facts …</p>
    {:else if lookup.status === 'found'}
      {@const p = lookup.product}
      <form class="sheet-form" onsubmit={takeProduct}>
        <div class="card product">
          <div class="product-name">{p.name}</div>
          {#if p.brand}<div class="product-brand">{p.brand}</div>{/if}
          <div class="product-per100">
            pro 100 {p.unit}: <b>{fmt(p.per100.kcal)} kcal</b> · E {Math.round(p.per100.protein)} g · KH {Math.round(p.per100.carbs)} g · F {Math.round(p.per100.fat)} g
          </div>
        </div>
        <label class="lbl" for="amount">Menge</label>
        <div class="field white">
          <!-- svelte-ignore a11y_autofocus -->
          <input id="amount" type="text" inputmode="decimal" bind:value={amount} autofocus />
          <span class="unit">{p.unit}</span>
        </div>
        <button class="btn-primary cta-inline" type="submit" disabled={!amountNum}>
          <span>Übernehmen</span><span>{fmt(p.per100.kcal * amountNum / 100)} kcal</span>
        </button>
      </form>
    {:else if lookup.status === 'notfound'}
      <p class="sheet-text">Dieses Produkt kennt Open Food Facts leider nicht.</p>
      <button class="btn-primary" onclick={() => openManual()}>Manuell eingeben</button>
      <button class="btn-secondary white" onclick={() => ((lookup = null), (scanOpen = true))}>Nochmal scannen</button>
    {:else}
      <p class="sheet-text">{lookup.error}</p>
      <button class="btn-primary" onclick={() => lookup && onDetect(lookup.code)}>Nochmal versuchen</button>
    {/if}
  </Sheet>
{/if}

{#if manualOpen}
  <Sheet title="Manuell eingeben" onclose={() => (manualOpen = false)}>
    <form class="sheet-form" onsubmit={takeManual}>
      <label class="lbl" for="m-name">Was?</label>
      <div class="field white"><input id="m-name" type="text" placeholder="z. B. Kuchen bei Oma" bind:value={manual.name} /></div>
      <div class="two">
        <div class="col">
          <label class="lbl" for="m-kcal">Kalorien *</label>
          <div class="field white"><input id="m-kcal" type="text" inputmode="numeric" required bind:value={manual.kcal} /><span class="unit">kcal</span></div>
        </div>
        <div class="col">
          <label class="lbl" for="m-portion">Portion</label>
          <div class="field white"><input id="m-portion" type="text" placeholder="1 Stück" bind:value={manual.portion} /></div>
        </div>
      </div>
      <div class="three">
        <div class="col">
          <label class="lbl" for="m-p">Eiweiß</label>
          <div class="field white"><input id="m-p" type="text" inputmode="decimal" bind:value={manual.protein} /><span class="unit">g</span></div>
        </div>
        <div class="col">
          <label class="lbl" for="m-c">KH</label>
          <div class="field white"><input id="m-c" type="text" inputmode="decimal" bind:value={manual.carbs} /><span class="unit">g</span></div>
        </div>
        <div class="col">
          <label class="lbl" for="m-f">Fett</label>
          <div class="field white"><input id="m-f" type="text" inputmode="decimal" bind:value={manual.fat} /><span class="unit">g</span></div>
        </div>
      </div>
      <button class="btn-primary" type="submit" disabled={!parseFloat(manual.kcal)}>Übernehmen</button>
    </form>
  </Sheet>
{/if}

<style>
  .add {
    gap: 16px;
    padding-bottom: calc(var(--safe-bottom) + 110px);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .round {
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

  .seg {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    background: var(--surface);
    border-radius: 16px;
    padding: 4px;
  }
  .seg button {
    height: 40px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
  }
  .seg button.on {
    background: var(--ink);
    color: #fff;
  }

  .ai-input {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ai-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-text);
  }
  .input-row {
    display: flex;
    gap: 10px;
  }
  .text-field {
    flex-grow: 1;
    min-width: 0;
    min-height: 52px;
    border-radius: 16px;
    background: var(--surface);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px 0 14px;
    border: 1.5px solid var(--accent);
    margin: 0;
  }
  .text-field input {
    flex-grow: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 16px;
  }
  .send {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 0;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .send:disabled {
    opacity: 0.55;
  }
  .scan {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    border: 0;
    background: var(--ink);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .setup-hint {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.4;
  }
  .link-btn.inline {
    min-height: 0;
    font-size: 12px;
    text-decoration: underline;
  }

  .manual-btn {
    height: 48px;
    border: 0;
    border-radius: 16px;
    background: var(--surface);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    font-size: 14px;
    font-weight: 600;
  }
  .icon-tile.mini {
    width: 30px;
    height: 30px;
    border-radius: 10px;
  }

  .chat {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bubble {
    align-self: flex-end;
    max-width: 80%;
    background: var(--ink);
    color: #fff;
    border-radius: 18px 18px 4px 18px;
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.4;
  }
  .bot {
    background: var(--surface);
    border-radius: 4px 20px 20px 20px;
    padding: 14px 14px 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bot-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
    padding-bottom: 4px;
  }
  .bot-icon {
    width: 26px;
    height: 26px;
    border-radius: 13px;
    background: #dcefe2;
    color: var(--accent-text);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .err {
    color: var(--danger);
    line-height: 1.4;
  }
  .dots i {
    font-style: normal;
    animation: blink 1.2s infinite;
  }
  .dots i:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dots i:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes blink {
    50% {
      opacity: 0.2;
    }
  }
  .bot > .link-btn {
    align-self: flex-start;
  }

  .check-row {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 48px;
    border-top: 1px solid var(--line);
  }
  .box-btn {
    align-self: stretch;
    width: 44px;
    margin-left: -10px;
    flex-shrink: 0;
    border: 0;
    background: transparent;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .check-body {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 0;
    background: transparent;
    padding: 6px 0 6px 2px;
    text-align: left;
  }
  .off {
    opacity: 0.45;
  }
  .edit-hint {
    color: var(--disabled);
    display: flex;
    flex-shrink: 0;
  }
  .factors {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    background: var(--surface);
    border-radius: 16px;
    padding: 4px;
  }
  .factors button {
    height: 40px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--muted);
    font-size: 15px;
    font-weight: 700;
  }
  .factors button.on {
    background: var(--ink);
    color: #fff;
  }
  .stepper {
    display: flex;
    gap: 8px;
  }
  .step {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border: 0;
    border-radius: 14px;
    background: var(--ink);
    color: #fff;
    font-size: 22px;
    font-weight: 600;
  }
  .kcal-field {
    flex-grow: 1;
  }
  .kcal-field input {
    text-align: center;
    font-weight: 700;
  }
  .box {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 1.5px solid var(--check-border);
    background: transparent;
    color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .box.on {
    border: 0;
    background: var(--accent);
    color: #fff;
  }
  .check-text {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .check-name {
    font-size: 15px;
    font-weight: 600;
  }
  .check-portion {
    font-size: 12px;
    color: var(--muted);
  }
  .check-kcal {
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .block h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
  }
  .list-card {
    border-radius: 20px;
    padding: 4px 0;
  }
  .list-card.padded {
    padding: 14px 14px 4px;
  }
  .recent-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px 8px 16px;
    border-top: 1px solid var(--line);
  }
  .recent-row.first {
    border-top: 0;
  }
  .recent-text {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .recent-name {
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .recent-meta {
    font-size: 12px;
    color: var(--muted);
  }
  .toggle {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    border: 1.5px solid var(--check-border);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .toggle.on {
    border: 0;
    background: var(--accent);
    color: #fff;
  }
  .toggle.del {
    color: var(--danger);
  }

  .cta-wrap {
    position: fixed;
    left: max(12px, calc(50% - 228px));
    right: max(12px, calc(50% - 228px));
    bottom: calc(var(--safe-bottom) + 20px);
    z-index: 10;
  }
  .cta {
    width: 100%;
    height: 60px;
    border: 0;
    border-radius: 22px;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 22px;
    font-size: 16px;
    font-weight: 700;
    gap: 12px;
  }
  .cta span:first-child {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cta:disabled {
    opacity: 0.7;
  }

  .sheet-text {
    margin: 0;
    font-size: 15px;
    line-height: 1.4;
  }
  .sheet-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sheet-form .btn-primary {
    margin-top: 6px;
  }
  .lbl {
    font-size: 13px;
    font-weight: 600;
    margin-top: 4px;
  }
  .unit {
    font-size: 13px;
    color: var(--muted);
  }
  .white {
    background: var(--surface);
  }
  .product {
    border-radius: 18px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .product-name {
    font-size: 16px;
    font-weight: 700;
  }
  .product-brand {
    font-size: 13px;
    color: var(--muted);
  }
  .product-per100 {
    font-size: 12px;
    color: var(--muted);
    margin-top: 6px;
  }
  .product-per100 b {
    color: var(--ink);
  }
  .cta-inline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
  }
  .two,
  .three {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .three {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
</style>
