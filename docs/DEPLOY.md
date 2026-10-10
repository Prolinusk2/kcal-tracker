# Deployment

Die App ist nach dem Build nur statische Dateien in `dist/`. Die müssen irgendwo per **HTTPS** liegen – sonst gehen Kamera und „Zum Home-Bildschirm“ nicht. Der Host sieht deine Daten nie (die liegen im Handy-Browser).

## Aktuell: GitHub Pages (kostenlos, automatisch)

Der Workflow `.github/workflows/deploy.yml` baut die App bei **jedem Push auf `main`** und veröffentlicht sie unter
`https://<github-user>.github.io/<repo-name>/`.

Einmalige Einrichtung:
1. Repo auf GitHub anlegen (muss bei kostenlosem Account **öffentlich** sein – der Code enthält keine Geheimnisse, der API-Key liegt nur auf dem Handy)
2. Code pushen (`git push -u origin main`)
3. Auf GitHub: Repo → **Settings → Pages → Source: „GitHub Actions“**
4. Unter **Actions** den Lauf abwarten (ca. 1 Min.), danach ist die App online

**Updates:** einfach committen und pushen.

Der Basis-Pfad (`/<repo-name>/`) wird im Workflow per `vite build --base=…` gesetzt. Lokal (`npm run dev`) läuft die App weiter unter `/`.

## Alternative: Cloudflare Pages

### Per Kommandozeile

```bash
cd ~/kcal-tracker
npm run build
npx wrangler pages deploy dist --project-name kcal-tracker
```

Beim ersten Mal öffnet sich der Browser zum Einloggen bei Cloudflare (Account ist kostenlos). Danach bekommst du eine URL wie `https://kcal-tracker.pages.dev`.

**Updates:** einfach dieselben zwei Befehle (`npm run build` + `wrangler pages deploy …`) erneut ausführen. Die App auf dem Handy aktualisiert sich beim nächsten Öffnen automatisch.

### Über GitHub verbunden

1. Projekt in ein GitHub-Repo pushen
2. Cloudflare Dashboard → *Workers & Pages* → *Create* → *Pages* → *Connect to Git*
3. Build-Einstellungen:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Speichern – ab jetzt deployt jeder Push automatisch.

## Auf dem Handy installieren

- **iPhone (Safari):** URL öffnen → Teilen-Button → „Zum Home-Bildschirm“
- **Android (Chrome):** URL öffnen → Menü ⋮ → „App installieren“ / „Zum Startbildschirm hinzufügen“

Wichtig: Die installierte App hat ihren **eigenen Speicher**. Daten, die du vorher im normalen Browser-Tab eingetragen hast, sind dort nicht automatisch drin → bei Bedarf per Export/Import übertragen.

## Alternativen

Netlify o. ä. gehen genauso (statischer Ordner `dist/`). Liegt die App in einem Unterordner, beim Build `--base=/unterordner/` mitgeben.
