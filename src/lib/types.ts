export type MealIndex = 0 | 1 | 2 | 3;

export const MEALS: { name: string; short: string }[] = [
  { name: 'Frühstück', short: 'Frühstück' },
  { name: 'Mittagessen', short: 'Mittag' },
  { name: 'Abendessen', short: 'Abend' },
  { name: 'Snacks', short: 'Snack' },
];

export interface Nutrition {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

/** Ein Lebensmittel mit Portion – so liefern es KI, Barcode-Scan und manuelle Eingabe. */
export interface FoodItem extends Nutrition {
  name: string;
  portion: string; // Freitext, z. B. "2 Stück (je 60 g)"
}

export type EntrySource = 'ai' | 'barcode' | 'manual' | 'recent';

/** Ein gespeicherter Eintrag im Tagebuch. */
export interface Entry extends FoodItem {
  id: string;
  date: string; // YYYY-MM-DD (lokale Zeit)
  meal: MealIndex;
  source: EntrySource;
  createdAt: number; // ms seit Epoch
}

export interface DayMeta {
  date: string;
  burned: number; // verbrannte kcal (z. B. Sport)
}

export interface Goals {
  kcal: number;
  tol: number; // Spielraum ± für "Im Ziel" im Tagebuch
  protein: number;
  carbs: number;
  fat: number;
}

export interface Settings {
  apiKey: string;
  model: string;
  goals: Goals;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: '',
  goals: { kcal: 2200, tol: 200, protein: 140, carbs: 250, fat: 70 },
};

export function sumNutrition(items: Nutrition[]): Nutrition {
  return items.reduce(
    (s, i) => ({
      kcal: s.kcal + i.kcal,
      protein: s.protein + i.protein,
      carbs: s.carbs + i.carbs,
      fat: s.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
