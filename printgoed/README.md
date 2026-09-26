# Printgoed – website

Statische showcase-website voor de Printgoed print-on-demand shop. Bezoekers bekijken de producten
op de site en kopen via de Etsy-shop (Tamazirtinoe). Betalen, productie en verzending lopen via
Etsy en mydesigns.io; de website zelf heeft geen afrekenfunctie nodig.

Geen build-stap nodig: host de map op Netlify, Vercel, GitHub Pages of je eigen hosting.

## Functies
- Talen: Engels (standaard), Nederlands, Duits, Frans en Spaans, met een taalkeuze in de header en
  de footer. De taal van de browser wordt automatisch gekozen en de keuze wordt onthouden.
- Alle Etsy-listings met foto's, prijs, maten en kleuren; zoeken, filteren per categorie en
  collectie (Halloween, kerst, familie, huisdieren, sport, grappig) en sorteren.
- Productvenster met fotogalerij en een knop **Buy on Etsy**.
- Echte Etsy-reviews met gemiddelde score.
- Secties: zo werkt het, over ons, maatwerk, FAQ.
- Deep links naar producten (`#p=<product-id>`), handig voor social media.

## Producten bijwerken
1. Download je gegevens in Etsy: *Shop Manager → Settings → Options → Download Data*
   (listings-CSV en eventueel reviews-JSON).
2. Draai:
   ```
   python3 tools/build_catalog.py EtsyListingsDownload.csv reviews.json
   ```
   Dit maakt `js/catalog-data.js`. Alleen titel, beschrijving, prijs, foto's, maten en kleuren
   van de listings komen erin. Van de reviews alleen naam, datum, score en tekst.
3. Upload de map opnieuw naar je hosting.

**Directe productlinks:** de Etsy-export bevat geen listing-URL's, daarom opent **Buy on Etsy** een
zoekopdracht in je shop. Voeg een kolom `URL` of `LISTING_ID` toe aan de CSV om rechtstreeks naar
de listing te linken.

## Aanpassen
- Shopnaam, kortingscode, valuta en talen: `js/config.js`
- Teksten en vertalingen: `js/i18n.js`
- Kleuren en huisstijl: variabelen bovenaan `css/styles.css`
- Indeling in categorieën en collecties: `CATEGORY_RULES` en `THEME_RULES` in `tools/build_catalog.py`
