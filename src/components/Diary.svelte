<script lang="ts">
  import { app, openAdd, dataChanged } from '../lib/state.svelte';
  import { entriesInRange, burnedInRange, setBurned } from '../lib/db';
  import { toKey, fromKey, daysInMonth, weekdayIndex, formatLong, MONTHS } from '../lib/dates';
  import { MEALS, sumNutrition, fmt, type Entry, type MealIndex } from '../lib/types';
  import Icon from './Icon.svelte';
  import TabBar from './TabBar.svelte';
  import Sheet from './Sheet.svelte';

  type Status = 'low' | 'ok' | 'high' | 'today' | 'future' | 'empty';

  const now = fromKey(app.today);
  const start = fromKey(app.diaryDay);
  let year = $state(start.getFullYear());
  let month = $state(start.getMonth());
  // Ausgewählter Tag liegt global, damit man nach dem Nachtragen wieder hier landet.
  const selected = $derived(app.diaryDay);

  let entries = $state<Entry[]>([]);
  let burned = $state(new Map<string, number>());

  const first = $derived(toKey(new Date(year, month, 1)));
  const last = $derived(toKey(new Date(year, month, daysInMonth(year, month))));

  $effect(() => {
    const [from, to] = [first, last];
    void app.dataVersion;
    Promise.all([entriesInRange(from, to), burnedInRange(from, to)]).then(([e, b]) => {
      if (from !== first) return;
      entries = e;
      burned = b;
    });
  });

  const totals = $derived.by(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.date, (m.get(e.date) ?? 0) + e.kcal);
    return m;
  });

  const goals = $derived(app.settings.goals);

  function status(key: string): Status {
    if (key === app.today) return 'today';
    if (key > app.today) return 'future';
    const t = totals.get(key);
    if (!t) return 'empty';
    const budget = goals.kcal + (burned.get(key) ?? 0);
    return t < budget - goals.tol ? 'low' : t > budget + goals.tol ? 'high' : 'ok';
  }

  const LABEL: Record<Status, string> = { low: 'Zu wenig', ok: 'Im Ziel', high: 'Zu viel', today: 'Heute', future: '', empty: 'Nichts eingetragen' };

  const cells = $derived.by(() => {
    const out: ({ blank: true } | { blank: false; key: string; day: number; kcal: string; status: Status; aria: string })[] = [];
    for (let i = 0; i < weekdayIndex(first); i++) out.push({ blank: true });
    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const key = toKey(new Date(year, month, d));
      const st = status(key);
      const t = totals.get(key) ?? 0;
      out.push({
        blank: false,
        key,
        day: d,
        status: st,
        kcal: st === 'future' || (st === 'empty' && !t) ? '' : fmt(t),
        aria: formatLong(key) + (st === 'future' ? '' : `: ${fmt(t)} kcal, ${LABEL[st]}`),
      });
    }
    while (out.length % 7) out.push({ blank: true });
    return out;
  });

  const isCurrentMonth = $derived(year === now.getFullYear() && month === now.getMonth());

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    year = d.getFullYear();
    month = d.getMonth();
  }

  const selStatus = $derived(status(selected));
  const selTotal = $derived(totals.get(selected) ?? 0);
  const selMeals = $derived(
    MEALS.map((m, i) => {
      const list = entries.filter((e) => e.date === selected && e.meal === i);
      return {
        index: i as MealIndex,
        name: m.name,
        foods: list.length ? list.map((e) => e.name).join(', ') : 'Nichts eingetragen',
        kcal: list.length ? fmt(sumNutrition(list).kcal) + ' kcal' : '–',
        empty: !list.length,
      };
    }),
  );

  const PILL: Partial<Record<Status, { bg: string; fg: string; label: string }>> = {
    low: { bg: '#CFE0F5', fg: '#173E6B', label: 'Zu wenig' },
    ok: { bg: '#D3EBDB', fg: '#154A2C', label: 'Im Ziel' },
    high: { bg: '#F8D9BD', fg: '#6E3409', label: 'Zu viel' },
    today: { bg: 'var(--bg)', fg: 'var(--muted-strong)', label: 'Läuft noch' },
    empty: { bg: 'var(--bg)', fg: 'var(--muted-strong)', label: 'Leer' },
  };
  const pill = $derived(PILL[selStatus]);
  const selBurned = $derived(burned.get(selected) ?? 0);

  // "Verbrannt" für den ausgewählten Tag bearbeiten
  let burnedOpen = $state(false);
  let burnedInput = $state('');
  function openBurned() {
    burnedInput = selBurned ? String(selBurned) : '';
    burnedOpen = true;
  }
  async function saveBurned(e: SubmitEvent) {
    e.preventDefault();
    await setBurned(selected, parseInt(burnedInput, 10) || 0);
    burnedOpen = false;
    dataChanged();
  }
</script>

<main class="screen diary">
  <header class="head">
    <div class="head-text">
      <div class="month-nav">
        <button class="chev" aria-label="Vorheriger Monat" onclick={() => shiftMonth(-1)}><Icon name="chev-left" size={16} stroke={2.4} /></button>
        <span class="eyebrow">{MONTHS[month]} {year}</span>
        <button class="chev" aria-label="Nächster Monat" disabled={isCurrentMonth} onclick={() => shiftMonth(1)}><Icon name="chev-right" size={16} stroke={2.4} /></button>
      </div>
      <h1 class="title">Tagebuch</h1>
    </div>
  </header>

  <section aria-label="Kalender {MONTHS[month]} {year}" class="card cal">
    <div aria-hidden="true" class="cal-grid weekdays">
      <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
    </div>
    <div class="cal-grid">
      {#each cells as c, i (i)}
        {#if c.blank}
          <div aria-hidden="true" class="cell-blank"></div>
        {:else}
          <button
            class="cell {c.status}"
            class:selected={c.key === selected}
            aria-label={c.aria}
            aria-pressed={c.key === selected}
            disabled={c.status === 'future'}
            onclick={() => (app.diaryDay = c.key)}
          >
            <span class="cell-day">{c.day}</span>
            <span class="cell-kcal">{c.kcal}</span>
          </button>
        {/if}
      {/each}
    </div>
  </section>

  <div class="legend">
    <div><span class="sw low"></span>Zu wenig</div>
    <div><span class="sw ok"></span>Im Ziel</div>
    <div><span class="sw high"></span>Zu viel</div>
    <div><span class="sw today"></span>Heute</div>
  </div>

  <section aria-label="Tagesdetails" class="card details">
    <div class="details-head">
      <div class="details-title">
        <h2>{formatLong(selected)}{selected === app.today ? ' · Heute' : ''}</h2>
        <div class="details-total"><b>{fmt(selTotal)} kcal</b> von {fmt(goals.kcal + selBurned)}</div>
      </div>
      {#if pill}
        <span class="pill" style="background: {pill.bg}; color: {pill.fg}">{pill.label}</span>
      {/if}
    </div>
    {#each selMeals as m (m.index)}
      <button class="meal-row" aria-label="{m.name} bearbeiten" onclick={() => openAdd(m.index, selected)}>
        <div class="meal-text">
          <div class="meal-name">{m.name}</div>
          <div class="meal-foods">{m.foods}</div>
        </div>
        <div class="meal-kcal" class:empty={m.empty}>{m.kcal}</div>
        <span class="row-icon"><Icon name="pencil" size={14} /></span>
      </button>
    {/each}
    <button class="meal-row" aria-label="Verbrannte kcal bearbeiten" onclick={openBurned}>
      <div class="meal-text"><div class="meal-name">Verbrannt</div></div>
      <div class="meal-kcal" class:empty={!selBurned}>{selBurned ? '+' + fmt(selBurned) + ' kcal' : '–'}</div>
      <span class="row-icon"><Icon name="pencil" size={14} /></span>
    </button>
    <div class="lock-note foot">
      <Icon name="pencil" size={14} />
      Zeile antippen zum Nachtragen oder Löschen.
    </div>
  </section>
</main>

<TabBar active="diary" />

{#if burnedOpen}
  <Sheet title="Verbrannte kcal" onclose={() => (burnedOpen = false)}>
    <form class="sheet-form" onsubmit={saveBurned}>
      <label class="lbl" for="burned">Am {formatLong(selected)} verbrannt</label>
      <div class="field">
        <Icon name="flame" size={18} />
        <!-- svelte-ignore a11y_autofocus -->
        <input id="burned" type="number" inputmode="numeric" min="0" placeholder="0" bind:value={burnedInput} autofocus />
        <span class="unit">kcal</span>
      </div>
      <p class="hint">Wird zum Tagesziel addiert.</p>
      <button class="btn-primary" type="submit">Speichern</button>
    </form>
  </Sheet>
{/if}

<style>
  .diary {
    gap: 10px;
  }
  .head-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .month-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: -8px;
  }
  .chev {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chev:disabled {
    opacity: 0.3;
  }

  .cal {
    border-radius: 24px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
  }
  .weekdays {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    text-align: center;
  }
  .cell-blank {
    height: 50px;
  }
  .cell {
    height: 50px;
    border-radius: 12px;
    border: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: transparent;
    color: var(--ink);
  }
  .cell-day {
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }
  .cell-kcal {
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    min-height: 10px;
  }
  .cell.low {
    background: #cfe0f5;
    color: #173e6b;
  }
  .cell.ok {
    background: #d3ebdb;
    color: #154a2c;
  }
  .cell.high {
    background: #f8d9bd;
    color: #6e3409;
  }
  .cell.today {
    background: #fff;
    border: 1.5px dashed var(--muted);
  }
  .cell.future {
    color: var(--disabled);
  }
  .cell.empty {
    color: var(--muted);
  }
  .cell.selected {
    border: 2.5px solid var(--ink);
  }

  .legend {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    padding: 0 2px;
    font-size: 12px;
    color: var(--muted-strong);
  }
  .legend div {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .sw {
    width: 12px;
    height: 12px;
    border-radius: 4px;
  }
  .sw.low {
    background: #cfe0f5;
    border: 1.5px solid #2f6db0;
  }
  .sw.ok {
    background: #d3ebdb;
    border: 1.5px solid #1f7a4a;
  }
  .sw.high {
    background: #f8d9bd;
    border: 1.5px solid #b4621f;
  }
  .sw.today {
    background: #fff;
    border: 1.5px dashed var(--muted);
  }

  .details {
    padding: 14px 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .details-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    padding-bottom: 6px;
  }
  .details-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }
  .details-total {
    font-size: 13px;
    color: var(--muted);
  }
  .details-total b {
    font-size: 17px;
    color: var(--ink);
  }
  .pill {
    flex-shrink: 0;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }
  .meal-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    padding: 6px 0;
    min-height: 44px;
    text-align: left;
    color: inherit;
  }
  .row-icon {
    color: var(--disabled);
    display: flex;
    flex-shrink: 0;
  }
  .meal-text {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .meal-name {
    font-size: 14px;
    font-weight: 600;
  }
  .meal-foods {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meal-kcal {
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }
  .meal-kcal.empty {
    color: var(--disabled);
  }
  .sheet-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lbl {
    font-size: 13px;
    font-weight: 600;
  }
  .unit {
    font-size: 13px;
    color: var(--muted);
  }
  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
  .field {
    background: var(--surface);
  }
  .foot {
    border-top: 1px solid var(--line);
    padding: 8px 0 4px;
  }
</style>
