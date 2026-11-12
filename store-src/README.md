# Halde — headless Shopify storefront

React + Shopify Hydrogen React + Storefront API (mock.shop demo data).

- Home: 3D lookbook hero (Three.js — products hang like fabric on a ring you drag to spin, tap to open), scroll-speed marquee, sticky scroll story (the garment hangs as fabric and is re-dyed as you scroll), scroll-driven horizontal lookbook, featured grid that unrolls into view
- Collection: product grid, sort by price, collection filters
- Product: tilting photo with light sweep, variant selector (updates price + image), add-to-cart fly animation
- Cap studio (/customize): 3D cap configurator — crown, front panels, brim, stitching, embroidered text with live satin texture, camera views, shareable URL, live price; adds to cart with every choice as line attributes
- Cart drawer: change quantity, remove, subtotal, Shopify checkout

Falls back to bundled sample data if the Storefront API is unreachable (add `?sample=1` to force it).

```
npm install
npm run dev
npm run build
```
