// Alle Tage werden als lokaler Datums-String "YYYY-MM-DD" gespeichert,
// damit Zeitzonen keine Einträge auf den falschen Tag schieben.

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => toKey(new Date());

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** 0 = Montag … 6 = Sonntag */
export const weekdayIndex = (key: string) => (fromKey(key).getDay() + 6) % 7;

/** Die 7 Tage (Mo–So) der Woche, in der `key` liegt. */
export function weekOf(key: string): string[] {
  const monday = addDays(key, -weekdayIndex(key));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "Samstag, 10. Oktober" */
export function formatLong(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAYS_LONG[weekdayIndex(key)]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
