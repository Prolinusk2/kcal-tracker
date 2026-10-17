<script lang="ts">
  import { app, openAdd } from '../lib/state.svelte';
  import { entriesForDate } from '../lib/db';
  import { weekOf, formatLong, fromKey, WEEKDAYS_SHORT, WEEKDAYS_LONG, MONTHS, weekdayIndex } from '../lib/dates';
  import { MEALS, sumNutrition, fmt, type Entry, type MealIndex } from '../lib/types';
  import Icon, { type IconName } from './Icon.svelte';
  import TabBar from './TabBar.svelte';

  let entries = $state<Entry[]>([]);

  $effect(() => {
    const day = app.homeDay;
    void app.dataVersion;
    entriesForDate(day).then((e) => {
      if (day === app.homeDay) entries = e;
    });
  });

  const isToday = $derived(app.homeDay === app.today);
  const goals = $derived(app.settings.goals);
  const totals = $derived(sumNutrition(entries));
  const budget = $derived(goals.kcal);
  const rem = $derived(budget - totals.kcal);
  const RING = 364.4; // Umfang bei r = 58
  const frac = $derived(budget > 0 ? Math.min(1, totals.kcal / budget) : 0);

  const week = $derived(
    weekOf(app.today).map((key) => {
      const d = fromKey(key);
      return {
        key,
        short: WEEKDAYS_SHORT[weekdayIndex(key)],
        date: d.getDate(),
        future: key > app.today,
        today: key === app.today,
        selected: key === app.homeDay,
        aria: `${WEEKDAYS_LONG[weekdayIndex(key)]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}${key === app.today ? ' (heute)' : ''}`,
      };
    }),
  );

  const macros = $derived([
    { label: 'Eiweiß', value: totals.protein, goal: goals.protein, color: 'var(--protein)' },
    { label: 'Kohlenhydrate', value: totals.carbs, goal: goals.carbs, color: 'var(--carbs)' },
    { label: 'Fett', value: totals.fat, goal: goals.fat, color: 'var(--fat)' },
  ]);

  const MEAL_STYLE: { icon: IconName; bg: string; fg: string }[] = [
    { icon: 'sun', bg: '#FCEBD8', fg: '#9A5412' },
    { icon: 'bowl', bg: '#DCEFE2', fg: '#1F5E3A' },
    { icon: 'moon', bg: '#E4E2F4', fg: '#4A3E8F' },
    { icon: 'apple', bg: '#F7E1E4', fg: '#9B2C3D' },
  ];

  const meals = $derived(
    MEALS.map((m, i) => {
      const list = entries.filter((e) => e.meal === i);
      return {
        index: i as MealIndex,
        name: m.name,
        kcal: list.length ? fmt(sumNutrition(list).kcal) + ' kcal' : '',
        summary: list.length ? ' · ' + list.map((e) => e.name).join(', ') : isToday ? 'Noch leer' : 'Nichts eingetragen',
        ...MEAL_STYLE[i],
      };
    }),
  );
</script>

<main class="screen">
  <header class="head">
    <div class="head-text">
      <div class="eyebrow">{formatLong(app.homeDay)}</div>
      <h1 class="title">{isToday ? 'Heute' : WEEKDAYS_LONG[weekdayIndex(app.homeDay)]}</h1>
    </div>
    {#if !isToday}
      <button class="pill-btn" onclick={() => (app.homeDay = app.today)}>Zu heute</button>
    {/if}
  </header>

  <nav aria-label="Woche" class="week">
    {#each week as d (d.key)}
      <button
        class="day"
        class:selected={d.selected}
        class:today={d.today && !d.selected}
        aria-label={d.aria}
        aria-pressed={d.selected}
        disabled={d.future}
        onclick={() => (app.homeDay = d.key)}
      >
        <span class="day-short">{d.short}</span><span class="day-num">{d.date}</span>
      </button>
    {/each}
  </nav>

  <section aria-label="Kalorien" class="card kcal-card">
    <div class="kcal-row">
      <div class="ring">
        <svg role="img" aria-label="{fmt(totals.kcal)} von {fmt(budget)} kcal gegessen" width="136" height="136" viewBox="0 0 136 136">
          <circle cx="68" cy="68" r="58" fill="none" stroke="var(--line)" stroke-width="13" />
          <circle
            cx="68" cy="68" r="58" fill="none"
            stroke={rem >= 0 ? 'var(--accent)' : 'var(--over)'}
            stroke-width="13" stroke-linecap="round"
            stroke-dasharray="{(frac * RING).toFixed(1)} {RING}"
            transform="rotate(-90 68 68)"
            style="transition: stroke-dasharray 0.4s ease"
          />
        </svg>
        <div class="ring-label">
          <div class="ring-value">{fmt(Math.abs(rem))}</div>
          <div class="ring-sub">{rem >= 0 ? 'kcal übrig' : 'kcal drüber'}</div>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><span>Ziel</span><b>{fmt(goals.kcal)}</b></div>
        <div class="stat"><span>Gegessen</span><b>{fmt(totals.kcal)}</b></div>
      </div>
    </div>

    <div class="macros">
      {#each macros as m (m.label)}
        <div class="macro">
          <div class="macro-label">{m.label}</div>
          <div class="bar"><div style="width: {Math.min(100, m.goal ? (m.value / m.goal) * 100 : 0)}%; background: {m.color}"></div></div>
          <div class="macro-txt">{Math.round(m.value)} / {m.goal} g</div>
        </div>
      {/each}
    </div>
  </section>

  <section aria-label="Mahlzeiten" class="meals">
    {#each meals as m (m.index)}
      <div class="meal card">
        <div class="meal-top">
          <div class="icon-tile" style="background: {m.bg}; color: {m.fg}"><Icon name={m.icon} size={18} /></div>
          {#if isToday}
            <button class="meal-add" aria-label="Zu {m.name} hinzufügen" onclick={() => openAdd(m.index)}>
              <Icon name="plus" size={16} stroke={2.6} />
            </button>
          {/if}
        </div>
        <svelte:element
          this={isToday ? 'button' : 'div'}
          class="meal-text"
          role={isToday ? undefined : 'group'}
          onclick={isToday ? () => openAdd(m.index) : undefined}
        >
          <div class="meal-name">{m.name}</div>
          <div class="meal-sum"><b>{m.kcal}</b>{m.summary}</div>
        </svelte:element>
      </div>
    {/each}
  </section>

  {#if !isToday}
    <div class="lock-note center"><Icon name="lock" size={14} />Abgeschlossen – nicht mehr bearbeitbar</div>
  {/if}
</main>

<TabBar active="home" />

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
  }
  .head-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pill-btn {
    height: 40px;
    padding: 0 14px;
    border-radius: 20px;
    border: 0;
    background: var(--surface);
    font-size: 13px;
    font-weight: 600;
  }

  .week {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }
  .day {
    height: 52px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 0;
  }
  .day-short {
    font-size: 12px;
    font-weight: 500;
  }
  .day-num {
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
  }
  .day:disabled .day-num {
    color: var(--disabled);
  }
  .day.today {
    border: 1.5px dashed var(--muted);
  }
  .day.selected {
    background: var(--ink);
    color: #c9d3cc;
  }
  .day.selected .day-num {
    color: #fff;
  }

  .kcal-card {
    border-radius: 26px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .kcal-row {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .ring {
    position: relative;
    width: 136px;
    height: 136px;
    flex-shrink: 0;
  }
  .ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .ring-value {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .ring-sub {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    margin-top: 3px;
  }
  .stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-grow: 1;
  }
  .stat {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .stat span {
    font-size: 13px;
    color: var(--muted);
  }
  .stat b {
    font-size: 16px;
    font-weight: 700;
  }

  .macros {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .macro {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .macro-label {
    font-size: 12px;
    font-weight: 600;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
  }
  .bar div {
    height: 6px;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .macro-txt {
    font-size: 12px;
    color: var(--muted);
  }

  .meals {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .meal {
    border-radius: 20px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .meal-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 36px;
  }
  .meal-add {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    border: 0;
    background: var(--ink);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .meal-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
  }
  .meal-name {
    font-size: 15px;
    font-weight: 600;
  }
  .meal-sum {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meal-sum b {
    font-weight: 700;
    color: var(--ink);
  }
  .center {
    justify-content: center;
  }

</style>
