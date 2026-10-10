// Modellliste von OpenRouter (öffentlich, kein Key nötig, CORS erlaubt).

export interface ModelInfo {
  id: string;
  name: string;
  created: number; // Unix-Sekunden
  free: boolean;
  /** USD pro Token; null = variabler Preis (z. B. Router wie openrouter/auto) */
  prompt: number | null;
  completion: number | null;
  /** Geschätzte Kosten eines Eintrags in US-Cent; null wenn unbekannt */
  centsPerEntry: number | null;
}

// Grobe Größe eines Aufrufs: System-Prompt + Eingabe bzw. JSON-Antwort mit ein paar Lebensmitteln.
const TOKENS_IN = 800;
const TOKENS_OUT = 250;

let cache: Promise<ModelInfo[]> | null = null;

export function fetchModels(): Promise<ModelInfo[]> {
  cache ??= load().catch((e) => {
    cache = null; // beim nächsten Öffnen neu versuchen
    throw e;
  });
  return cache;
}

async function load(): Promise<ModelInfo[]> {
  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/models');
  } catch {
    throw new Error('Keine Verbindung zu OpenRouter. Bist du online?');
  }
  if (!res.ok) throw new Error(`OpenRouter antwortet nicht (${res.status}).`);
  const data = (await res.json())?.data;
  if (!Array.isArray(data)) throw new Error('Unerwartete Antwort von OpenRouter.');

  return data
    .filter((m) => (m.architecture?.output_modalities ?? ['text']).includes('text'))
    .map((m): ModelInfo => {
      const p = parseFloat(m.pricing?.prompt);
      const c = parseFloat(m.pricing?.completion);
      const known = Number.isFinite(p) && Number.isFinite(c) && p >= 0 && c >= 0;
      return {
        id: m.id,
        name: m.name || m.id,
        created: m.created ?? 0,
        free: known && p === 0 && c === 0,
        prompt: known ? p : null,
        completion: known ? c : null,
        centsPerEntry: known ? (p * TOKENS_IN + c * TOKENS_OUT) * 100 : null,
      };
    });
}

/** "kostenlos", "< 0,01 ct", "≈ 0,12 ct" – pro Eintrag */
export function formatEntryCost(m: ModelInfo): string {
  if (m.free) return 'kostenlos';
  if (m.centsPerEntry == null) return 'Preis variabel';
  if (m.centsPerEntry < 0.01) return '< 0,01 ct / Eintrag';
  const digits = m.centsPerEntry < 1 ? 2 : 1;
  return `≈ ${m.centsPerEntry.toLocaleString('de-DE', { maximumFractionDigits: digits })} ct / Eintrag`;
}

/** "$0,15 / $0,60 pro 1 Mio. Tokens" (Eingabe / Ausgabe) */
export function formatTokenPrice(m: ModelInfo): string {
  if (m.prompt == null || m.completion == null) return '';
  const f = (v: number) => '$' + (v * 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  return `${f(m.prompt)} / ${f(m.completion)} pro 1 Mio. Tokens`;
}
