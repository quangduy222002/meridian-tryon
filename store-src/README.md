# Halde — headless Shopify storefront

React + Shopify Hydrogen React + Storefront API (mock.shop demo data).

- Home: 3D lookbook hero (Three.js — products hang like fabric on a ring you drag to spin, tap to open), category tiles, featured grid with colour swatches
- Collection: product grid, sort by price, collection filters
- Product: tilting photo with light sweep, variant selector (updates price + image), add-to-cart fly animation
- Cart drawer: change quantity, remove, subtotal, Shopify checkout

Falls back to bundled sample data if the Storefront API is unreachable (add `?sample=1` to force it).

```
npm install
npm run dev
npm run build
```
