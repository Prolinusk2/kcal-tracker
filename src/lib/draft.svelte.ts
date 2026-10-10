import type { FoodItem } from './types';

// Entwurf im Essen-Screen: Bleibt erhalten, wenn man den Tab wechselt,
// und wird erst beim Speichern geleert – nichts geht verloren.

export type Pick = { item: FoodItem; on: boolean };
export type Exchange = { id: number; text: string; status: 'loading' | 'done' | 'error'; error: string; items: Pick[] };
export type Extra = Pick & { source: 'barcode' | 'manual' };

export const draft = $state({
  text: '',
  exchanges: [] as Exchange[],
  extras: [] as Extra[],
  nextId: 0,
});

/** Anzahl ausgewählter, noch nicht gespeicherter Einträge (für den Zähler am +). */
export function pendingCount(): number {
  return (
    draft.exchanges.reduce((n, x) => n + x.items.filter((p) => p.on).length, 0) +
    draft.extras.filter((p) => p.on).length
  );
}

export function clearDraft() {
  draft.text = '';
  draft.exchanges = [];
  draft.extras = [];
}
