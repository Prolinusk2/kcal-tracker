import type { FoodItem } from './types';

// Erkennung von Freitext ("2 Brötchen mit Käse") über OpenRouter.
// Der Aufruf geht direkt vom Browser an OpenRouter – kein eigener Server.

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `Du bist ein Ernährungsassistent für eine Kalorien-Tracking-App in Deutschland.
Der Nutzer beschreibt, was er gegessen oder getrunken hat. Zerlege die Beschreibung in einzelne Lebensmittel.

Regeln:
- Jedes Lebensmittel bzw. Getränk ist ein eigener Eintrag (z. B. "Brötchen mit Käse" → Brötchen + Käse).
- Fehlt eine Mengenangabe, nimm eine typische deutsche Standardportion an.
- "portion" ist eine kurze, deutsche Mengenangabe, möglichst mit Gramm/ml, z. B. "2 Stück (je 60 g)" oder "1 Tasse (200 ml)".
- Nährwerte realistisch nach gängigen Nährwerttabellen (BLS, USDA). kcal als ganze Zahl, Makros in Gramm mit max. einer Nachkommastelle.
- Namen kurz und auf Deutsch, erster Buchstabe groß.
- Wenn die Eingabe kein Essen beschreibt, gib eine leere Liste zurück.

Antworte AUSSCHLIESSLICH mit JSON in genau diesem Format, ohne weiteren Text:
{"items":[{"name":"Brötchen","portion":"2 Stück (je 60 g)","kcal":300,"protein":10.2,"carbs":58.1,"fat":2.4}]}`;

export class AiError extends Error {}

export async function recognizeFood(text: string, apiKey: string, model: string): Promise<FoodItem[]> {
  if (!apiKey) throw new AiError('Kein API-Key hinterlegt. Trag ihn in den Einstellungen ein.');
  if (!model) throw new AiError('Kein Modell hinterlegt. Trag es in den Einstellungen ein.');

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Kcal Tracker',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
    });
  } catch {
    throw new AiError('Keine Verbindung zu OpenRouter. Bist du online?');
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const msg: string = detail?.error?.message ?? '';
    if (res.status === 401) throw new AiError('API-Key ungültig. Prüf ihn in den Einstellungen.');
    if (res.status === 402) throw new AiError('Kein Guthaben mehr bei OpenRouter.');
    if (res.status === 429) throw new AiError('Zu viele Anfragen – versuch es gleich nochmal.');
    if (res.status === 400 || res.status === 404) {
      throw new AiError(`Modell „${model}" nicht verfügbar. ${msg}`.trim());
    }
    throw new AiError(`OpenRouter-Fehler (${res.status}). ${msg}`.trim());
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  return parseItems(content);
}

/** Holt das JSON aus der Modellantwort – auch wenn es in ```-Blöcken oder mit Text drumherum kommt. */
export function parseItems(content: string): FoodItem[] {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) throw new AiError('Die KI hat keine verwertbare Antwort geliefert.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    throw new AiError('Die KI-Antwort war kein gültiges JSON. Versuch es nochmal.');
  }
  const items = (parsed as { items?: unknown[] }).items;
  if (!Array.isArray(items)) throw new AiError('Die KI-Antwort hatte ein unerwartetes Format.');

  const num = (v: unknown) => {
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return items
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
    .map((i) => ({
      name: String(i.name ?? '').trim() || 'Unbekannt',
      portion: String(i.portion ?? '').trim(),
      kcal: Math.round(num(i.kcal)),
      protein: num(i.protein),
      carbs: num(i.carbs),
      fat: num(i.fat),
    }));
}
