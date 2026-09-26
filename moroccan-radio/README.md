# Radio Maroc 📻

Een lichte webapp (PWA) om live naar Marokkaanse radiozenders te luisteren.

## Functies

- **Live zenderlijst** van alle Marokkaanse zenders uit de open
  [Radio Browser](https://www.radio-browser.info/)-database, zodat stream-URL's actueel blijven
  (met meerdere API-mirrors als fallback en een lokale cache)
- **Zoeken** op naam, stad of genre, plus **genrefilters**
- Tabbladen **Populair** (Hit Radio, Medi 1, Radio Mars, Chada FM, 2M, Aswat, MFM, Luxe Radio, …),
  **Favorieten** en **Recent beluisterd** (bewaard in je browser)
- Speler met play/pauze, vorige/volgende, volume en favoriet-knop
- HLS-streams (`.m3u8`) via hls.js
- Bediening vanaf het vergrendelscherm / mediatoetsen (Media Session API)
- Sneltoetsen: `spatie` = play/pauze, `←` / `→` = vorige/volgende zender
- Licht/donker thema, werkt op mobiel en is installeerbaar als app

## Starten

Het zijn alleen statische bestanden, dus elke webserver werkt:

```bash
cd moroccan-radio
python3 -m http.server 8000
# open http://localhost:8000
```

Of zet de map op GitHub Pages, Netlify, enz. Installeren als app op je telefoon:
open de site en kies "Toevoegen aan beginscherm".

## Bestanden

| Bestand | Doel |
| --- | --- |
| `index.html` | Opmaak van de app |
| `styles.css` | Styling (Marokkaans rood/groen, licht & donker) |
| `app.js` | Zenders ophalen, filteren, afspelen, favorieten |
| `sw.js` | Service worker die de app-shell cachet |
| `manifest.webmanifest`, `icon.svg` | PWA-manifest en icoon |
