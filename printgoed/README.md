# Printgoed – webshop (herbouw)

Statische print-on-demand webshop. Geen build-stap nodig: open `index.html` of host de map op
Netlify, Vercel, GitHub Pages of je eigen server.

## Functies
- Homepage met hero, USP's, categorieën, "zo werkt het", zakelijke staffelkorting, FAQ en nieuwsbrief
- Productoverzicht met filteren per categorie, zoeken en sorteren
- Productconfigurator met live preview: kleur, maat, eigen afbeelding uploaden of tekst (lettertype + kleur)
- Winkelwagen (opgeslagen in de browser) met balk voor gratis verzending vanaf €50
- Afrekenformulier (demo) met iDEAL, Bancontact, creditcard en PayPal
- Responsive voor mobiel, tablet en desktop

## Aanpassen
- **Producten, prijzen, kleuren, maten:** `js/products.js`
- **Verzendkosten / drempel gratis verzending:** bovenaan `js/app.js`
- **Kleuren en huisstijl:** variabelen bovenaan `css/styles.css`
- **Teksten, contactgegevens, FAQ:** `index.html`
- **Productafbeeldingen:** de mockups worden als SVG getekend in `js/mockups.js`; vervang ze door echte foto's als je die hebt.

## Live gaan
Het afrekenen is nu een demo. Om echt te verkopen koppel je een betaalprovider (bijv. Mollie of
Stripe) en je POD-leverancier (bijv. Printful, Printify of Gelato) via hun API, of zet je de
producten over naar Shopify/WooCommerce met deze vormgeving als thema.
