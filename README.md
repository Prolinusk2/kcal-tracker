# Kcal Tracker

Eigener Kalorien-Tracker als **PWA** (Web-App, die sich wie eine native App aufs Handy installieren lässt).
Ohne Backend, ohne Account, ohne Werbung – alle Daten bleiben auf dem Gerät.

## Features

- **KI-Eingabe:** einfach tippen „2 Brötchen mit Käse und Kaffee“ → die KI (über [OpenRouter](https://openrouter.ai)) zerlegt das in einzelne Lebensmittel mit kcal & Makros; Einträge per Tipp abwählbar
- **Barcode-Scanner:** Produkt scannen → Nährwerte von [Open Food Facts](https://world.openfoodfacts.org) → Menge in g/ml eintragen
- **Manuelle Eingabe:** Name + kcal (+ optional Eiweiß / KH / Fett)
- **Zuletzt gegessen:** Häufiges mit einem Tipp erneut eintragen
- **Heute-Dashboard:** kcal-Ring, Makro-Balken, 4 Mahlzeiten, Wochenleiste, „Verbrannt“ (Sport) erhöht das Tagesziel
- **Tagebuch:** Monatskalender, Tage farbig nach *zu wenig / im Ziel / zu viel* (Ziel ± Spielraum)
- **Einstellungen:** OpenRouter-Key & Modell, Ziele, **Export/Import als JSON** (Backup)
- Offline-fähig (außer KI und Barcode-Lookup, die brauchen Internet)

## Schnellstart (Entwicklung)

```bash
cd ~/kcal-tracker
npm install        # nur beim ersten Mal
npm run dev        # → http://localhost:5173
```

Weitere Befehle:

| Befehl | Was es macht |
|---|---|
| `npm run dev` | Dev-Server mit Hot Reload (auch im LAN erreichbar, siehe unten) |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run preview` | Den Build lokal ansehen |
| `npm run check` | TypeScript- und Svelte-Prüfung |

> **Handy im WLAN testen:** `npm run dev` zeigt auch eine `192.168.x.x`-Adresse. Die App läuft dort, **aber die Kamera nicht** – Browser erlauben die Kamera nur über HTTPS. Zum Scannen also deployen (siehe unten).

## Einrichtung in der App

1. **Einstellungen** öffnen
2. OpenRouter-API-Key eintragen (gibt's unter <https://openrouter.ai/keys>, Guthaben aufladen)
3. Modell-ID eintragen, genau wie auf <https://openrouter.ai/models> (z. B. ein günstiges, schnelles Modell – ein Aufruf kostet meist Bruchteile eines Cents)
4. Ziele anpassen → **Speichern**

## Deployment

Läuft über **GitHub Pages**: jeder Push auf `main` baut und veröffentlicht automatisch (`.github/workflows/deploy.yml`). Details & Alternativen: [docs/DEPLOY.md](docs/DEPLOY.md). Danach auf dem Handy öffnen → „Zum Home-Bildschirm“.

## Daten & Datenschutz

- Alle Einträge liegen in **IndexedDB im Browser** des jeweiligen Geräts. Kein Server sieht sie.
- Der API-Key liegt ebenfalls nur lokal und geht ausschließlich an OpenRouter.
- An OpenRouter geht nur der Text, den du eintippst. An Open Food Facts nur die Barcode-Nummer.
- **Backup:** Einstellungen → Daten → Exportieren. Browserdaten löschen = Einträge weg!
- Daten wandern nicht automatisch zwischen Geräten – per Export/Import übertragen.

## Projektstruktur

```
src/
  App.svelte              Screen-Umschaltung
  app.css                 Design-Tokens + gemeinsame Klassen
  components/
    Home.svelte           "Heute"-Dashboard
    AddFood.svelte        Essen hinzufügen (KI, Scanner, manuell, zuletzt gegessen)
    Diary.svelte          Tagebuch / Kalender
    Settings.svelte       Einstellungen + Export/Import
    Scanner.svelte        Kamera-Overlay für Barcodes
    Sheet.svelte          Bottom-Sheet für kleine Formulare
    TabBar.svelte         Untere Navigation
    Icon.svelte           Alle Icons
  lib/
    types.ts              Datentypen, Mahlzeiten, Default-Ziele
    db.ts                 IndexedDB (Einträge, Tage, Einstellungen, Export/Import)
    ai.ts                 OpenRouter-Aufruf + Prompt + JSON-Parsing
    off.ts                Open-Food-Facts-Lookup
    scanner.ts            BarcodeDetector (nativ oder ZXing-WASM)
    dates.ts              Datums-Helfer (lokale "YYYY-MM-DD"-Keys)
    state.svelte.ts       Globaler UI-Zustand (Svelte 5 Runes)
design/                   Original-Mockups aus Claude Design (Referenz)
docs/                     Weitere Doku
```

Mehr zu Architektur & Konventionen: [CLAUDE.md](CLAUDE.md) · Ideen & offene Punkte: [docs/ROADMAP.md](docs/ROADMAP.md)

## Tech-Stack

Svelte 5 · TypeScript · Vite · vite-plugin-pwa · idb · barcode-detector (ZXing-WASM)
