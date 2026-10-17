import { todayKey } from './dates';
import { loadSettings } from './db';
import { DEFAULT_SETTINGS, type MealIndex } from './types';

// Globaler UI-Zustand (Svelte 5 Runes). Daten selbst liegen in IndexedDB (siehe db.ts).

export type Screen = 'home' | 'diary' | 'settings' | 'add';

export const app = $state({
  ready: false,
  screen: 'home' as Screen,
  addMeal: 2 as MealIndex,
  /** Tag, für den der Essen-Screen speichert (vergangene Tage nur übers Tagebuch) */
  addDate: todayKey(),
  today: todayKey(),
  /** Tag, der auf "Heute" angezeigt wird (über die Wochenleiste wählbar) */
  homeDay: todayKey(),
  /** Im Tagebuch ausgewählter Tag (bleibt beim Screen-Wechsel erhalten) */
  diaryDay: todayKey(),
  settings: structuredClone(DEFAULT_SETTINGS),
  /** Wird nach jeder Datenänderung erhöht, damit Screens neu laden */
  dataVersion: 0,
});

export async function initApp() {
  app.settings = await loadSettings();
  app.ready = true;
  // Bittet den Browser, die Daten nicht automatisch zu löschen (v. a. wichtig auf iOS).
  navigator.storage?.persist?.().catch(() => {});
  // Tageswechsel erkennen, wenn die App aus dem Hintergrund zurückkommt.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const t = todayKey();
    if (t !== app.today) {
      if (app.homeDay === app.today) app.homeDay = t;
      if (app.diaryDay === app.today) app.diaryDay = t;
      if (app.addDate === app.today) app.addDate = t;
      app.today = t;
    }
  });
}

export function go(screen: Exclude<Screen, 'add'>) {
  app.screen = screen;
}

export function openAdd(meal: MealIndex, date = app.today) {
  app.addMeal = meal;
  app.addDate = date;
  if (date === app.today) app.homeDay = app.today;
  app.screen = 'add';
}

export function dataChanged() {
  app.dataVersion++;
}

/** Sinnvolle Mahlzeit nach Uhrzeit, z. B. für den großen +-Button. */
export function mealForNow(): MealIndex {
  const h = new Date().getHours();
  if (h < 11) return 0;
  if (h < 15) return 1;
  if (h < 17) return 3;
  if (h < 22) return 2;
  return 3;
}
