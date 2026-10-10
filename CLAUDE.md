# CLAUDE.md – Kontext für KI-Assistenten

Diese Datei erklärt das Projekt für KI-Chats (Claude Code o. ä.). Für Nutzer-Doku siehe [README.md](README.md).

## Was ist das?

Persönlicher Kalorien-Tracker als mobile-first PWA. Nutzer ist deutschsprachig, **UI-Texte sind komplett Deutsch** (du-Form). Hauptgerät: Handy.

## Harte Rahmenbedingungen (bewusste Entscheidungen)

- **Kein Backend.** Alles läuft im Browser. Daten in IndexedDB (`src/lib/db.ts`). Hosting statisch auf GitHub Pages (Workflow `.github/workflows/deploy.yml`, Push auf `main` = Deploy).
- **KI über OpenRouter**, direkt aus dem Browser aufgerufen. Key + Modell gibt der Nutzer in den Einstellungen ein; liegt nur lokal. Kein Default-Modell hardcoden – Modell-IDs ändern sich. Auswahl über `ModelPicker.svelte`, Daten aus `GET /api/v1/models` (öffentlich, ohne Key; `src/lib/models.ts`). Negativer Preis in der API = variabel (Router-Modelle).
- **Barcodes über Open Food Facts** (`src/lib/off.ts`), Scan via `barcode-detector` (nativer BarcodeDetector, sonst ZXing-WASM-Ponyfill – wichtig für iOS). Die `.wasm` wird mitgebündelt (`src/lib/scanner.ts`), nicht vom CDN geladen.
- **Design kommt aus Claude Design** – Referenz in `design/*.dc.html` (Inline-Styles enthalten die exakten Werte). Neue UI soll sich daran halten.
- **Vergangene Tage sind gesperrt** (nur ansehen, nicht bearbeiten) – so im Design vorgegeben. Hinzufügen/Löschen nur für heute.

## Stack

Svelte 5 (Runes: `$state`, `$derived`, `$effect`, `$props`), TypeScript, Vite 8, vite-plugin-pwa, `idb`.
Keine UI-Library, kein Router (Screen-Wechsel über `app.screen` in `state.svelte.ts`).

## Architektur

- `src/lib/state.svelte.ts` – globaler UI-State `app` (aktueller Screen, heutiger Tag, ausgewählter Tag, Settings, `dataVersion`).
  Nach jeder Datenänderung `dataChanged()` aufrufen → Screens laden in ihrem `$effect` neu (sie lesen `app.dataVersion`).
- `src/lib/db.ts` – einzige Stelle, die IndexedDB anfasst. Stores:
  - `entries` (keyPath `id`, Indizes `by-date`, `by-created`) – ein Eintrag = ein Lebensmittel
  - `days` (keyPath `date`) – `{ date, burned }`
  - `kv` – `settings`
  Bei Schema-Änderungen: DB-Version in `openDB(..., 1, ...)` erhöhen und `upgrade` erweitern; Export-Format (`ExportFile.version`) mitdenken.
- App läuft auf GitHub Pages unter einem **Unterpfad** (`/<repo>/`). Keine absoluten Pfade wie `/foo.png` im Code – Vite-Imports bzw. relative Pfade nutzen. Manifest nutzt `start_url`/`scope` = `.`.
- Datum immer als **lokaler String `YYYY-MM-DD`** (`src/lib/dates.ts`), nie `toISOString()` (Zeitzonen-Bug).
- Mahlzeiten sind Index `0–3` (Frühstück, Mittag, Abend, Snacks) – siehe `MEALS` in `types.ts`.
- KI-Antwortformat: `{"items":[{name, portion, kcal, protein, carbs, fat}]}`; `parseItems` in `ai.ts` ist tolerant (Code-Fences, Text drumherum).

## Styling-Konventionen

- Design-Tokens als CSS-Variablen in `src/app.css` (`--bg`, `--surface`, `--ink`, `--muted`, `--accent` …). Keine Hex-Werte für Grundfarben in Komponenten, außer den mahlzeitspezifischen Pastell-Tiles und Status-Farben aus dem Design.
- Schriften: Bricolage Grotesque (Überschriften, `--font-display`), DM Sans (Text).
- Komponenten-Styles in `<style>` der jeweiligen `.svelte`-Datei. Gemeinsame Klassen (`.screen`, `.card`, `.field`, `.btn-primary`, …) in `app.css`.
- Layout max. 480 px breit, zentriert. Safe-Areas über `--safe-top` / `--safe-bottom`.
- Inputs mindestens 16 px Schrift (sonst zoomt iOS rein).
- Fixierte Elemente unten (TabBar, CTA) nutzen `left/right: max(12px, calc(50% - 228px))`.

## Befehle

```bash
npm run dev     # Dev-Server
npm run check   # svelte-check + tsc – vor dem Abschluss immer laufen lassen
npm run build   # Build nach dist/
```

## Testen

Keine automatisierten Tests im Repo. Bisher manuell bzw. per Puppeteer (headless Chrome, `google-chrome-stable` ist installiert) mit gemockten Antworten von OpenRouter/OFF. Kamera-Scan lässt sich nur auf einem echten Gerät über HTTPS testen.

## Doku-Regel

Bei neuen Features oder Entscheidungen: README (Features/Struktur), diese Datei (Architektur/Konventionen) und `docs/ROADMAP.md` aktuell halten.
