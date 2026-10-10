# Roadmap & Ideen

## Status (10.10.2026) – v0.1

Fertig und getestet (Headless-Browser, APIs gemockt):
- Alle 4 Screens aus dem Claude-Design: Heute, Essen hinzufügen, Tagebuch, Einstellungen
- KI-Erkennung über OpenRouter, Barcode → Open Food Facts, manuelle Eingabe, „Zuletzt gegessen“
- Lokale Speicherung (IndexedDB), Export/Import, PWA/offline

Noch **nicht** auf echtem Gerät getestet: Kamera-Scan, Installation als App, echte OpenRouter-Antworten.

## Ergänzungen gegenüber dem Design

Im Design nicht vorgesehen, aber für die Funktion nötig – hier bewusst ergänzt:
- **Einträge löschen:** Im Essen-Screen Abschnitt „Schon in …“ mit Mülleimer-Button (nur heute)
- **Verbrannt eintragen:** Tipp auf „Verbrannt“ im Heute-Screen öffnet ein Sheet
- **Ergebnisse anpassen:** Haken links = an/abwählen, Rest der Zeile antippen = Bearbeiten-Sheet
- **Mehrere KI-Nachrichten:** Jede Eingabe wird ein eigener Chat-Block; „Neu eingeben“ verwirft nur diesen
- **Monatsnavigation** im Tagebuch (Pfeile neben dem Monat)
- **Daten-Sektion** in den Einstellungen (Export/Import)
- **Leere vergangene Tage** im Tagebuch sind neutral statt „zu wenig“
- **Modellauswahl** in den Einstellungen statt nur Freitextfeld
- **+-Button** in der Navigation wählt die Mahlzeit nach Uhrzeit

## Ideen für später

- [x] KI-/Scan-Ergebnisse anpassen: antippen → Sheet mit Mengen-Faktor (½ … 2×), kcal −/+ 10, Name/Portion/Makros (v0.2)
- [x] Modellauswahl aus OpenRouter-Liste mit Suche, „Nur kostenlos“-Filter und Kosten pro Eintrag (v0.3)
- [ ] Eigene Lebensmittel/Rezepte als Favoriten speichern
- [ ] Gewicht tracken + Verlaufskurve
- [ ] Foto vom Essen → KI schätzt (OpenRouter-Modelle mit Bildeingabe)
- [ ] Spracheingabe (Web Speech API)
- [ ] Dark Mode
- [ ] Wochen-/Monatsstatistik (Durchschnitt kcal, Makros)
- [ ] Vergangene Tage optional doch bearbeitbar (z. B. „gestern nachtragen“)
- [ ] Erinnerung ans Backup (z. B. Hinweis, wenn letzter Export > 2 Wochen her)
