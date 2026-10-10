import { openDB, type DBSchema } from 'idb';
import {
  DEFAULT_SETTINGS,
  type DayMeta,
  type Entry,
  type EntrySource,
  type FoodItem,
  type MealIndex,
  type Settings,
} from './types';

// Alles liegt lokal im Browser (IndexedDB). Es gibt kein Backend.

interface KcalDB extends DBSchema {
  entries: { key: string; value: Entry; indexes: { 'by-date': string; 'by-created': number } };
  days: { key: string; value: DayMeta };
  kv: { key: string; value: unknown };
}

const db = openDB<KcalDB>('kcal-tracker', 1, {
  upgrade(db) {
    const entries = db.createObjectStore('entries', { keyPath: 'id' });
    entries.createIndex('by-date', 'date');
    entries.createIndex('by-created', 'createdAt');
    db.createObjectStore('days', { keyPath: 'date' });
    db.createObjectStore('kv');
  },
});

// crypto.randomUUID gibt es nur in sicheren Kontexten (https/localhost).
const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

const byCreated = (a: Entry, b: Entry) => a.createdAt - b.createdAt;

// ---------- Einträge ----------

export async function entriesForDate(date: string): Promise<Entry[]> {
  return (await (await db).getAllFromIndex('entries', 'by-date', date)).sort(byCreated);
}

export async function entriesInRange(from: string, to: string): Promise<Entry[]> {
  return (await (await db).getAllFromIndex('entries', 'by-date', IDBKeyRange.bound(from, to))).sort(byCreated);
}

export async function addEntries(
  date: string,
  meal: MealIndex,
  items: (FoodItem & { source: EntrySource })[],
): Promise<void> {
  const tx = (await db).transaction('entries', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...items.map((item, i) =>
      tx.store.put({
        id: newId(),
        date,
        meal,
        name: item.name,
        portion: item.portion,
        kcal: Math.round(item.kcal),
        protein: round1(item.protein),
        carbs: round1(item.carbs),
        fat: round1(item.fat),
        source: item.source,
        createdAt: now + i,
      }),
    ),
    tx.done,
  ]);
}

export async function deleteEntry(id: string): Promise<void> {
  await (await db).delete('entries', id);
}

// ---------- Verbrannte kcal ----------

export async function burnedFor(date: string): Promise<number> {
  return (await (await db).get('days', date))?.burned ?? 0;
}

export async function burnedInRange(from: string, to: string): Promise<Map<string, number>> {
  const days = await (await db).getAll('days', IDBKeyRange.bound(from, to));
  return new Map(days.map((d) => [d.date, d.burned]));
}

export async function setBurned(date: string, burned: number): Promise<void> {
  await (await db).put('days', { date, burned: Math.max(0, Math.round(burned)) });
}

// ---------- Einstellungen ----------

export async function loadSettings(): Promise<Settings> {
  const s = ((await (await db).get('kv', 'settings')) ?? {}) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...s, goals: { ...DEFAULT_SETTINGS.goals, ...s.goals } };
}

export async function saveSettings(s: Settings): Promise<void> {
  await (await db).put('kv', plain(s), 'settings');
}

// Svelte-Proxies lassen sich nicht in IndexedDB speichern → einfache Kopie.
function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// ---------- Export / Import ----------

export interface ExportFile {
  app: 'kcal-tracker';
  version: 1;
  exportedAt: string;
  entries: Entry[];
  days: DayMeta[];
  settings: Omit<Settings, 'apiKey'>; // API-Key wird bewusst NICHT exportiert
}

export async function exportData(): Promise<ExportFile> {
  const d = await db;
  const { apiKey: _omit, ...settings } = await loadSettings();
  return {
    app: 'kcal-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: await d.getAll('entries'),
    days: await d.getAll('days'),
    settings,
  };
}

/** Führt einen Export mit den vorhandenen Daten zusammen (gleiche IDs werden überschrieben). */
export async function importData(raw: unknown): Promise<number> {
  const file = raw as Partial<ExportFile>;
  if (!file || file.app !== 'kcal-tracker' || !Array.isArray(file.entries)) {
    throw new Error('Das ist keine Kcal-Tracker-Exportdatei.');
  }
  const d = await db;
  const tx = d.transaction(['entries', 'days'], 'readwrite');
  for (const e of file.entries) tx.objectStore('entries').put(e);
  for (const day of file.days ?? []) tx.objectStore('days').put(day);
  await tx.done;
  if (file.settings) {
    const current = await loadSettings();
    await saveSettings({ ...current, model: file.settings.model || current.model, goals: { ...current.goals, ...file.settings.goals } });
  }
  return file.entries.length;
}

function round1(n: number) {
  return Math.round((Number(n) || 0) * 10) / 10;
}
