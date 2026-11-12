# Halde — headless Shopify storefront

React + Shopify Hydrogen React + Storefront API (mock.shop demo data).

- Home: header with cart count, hero, featured grid
- Collection: product grid, sort by price, collection filters
- Product: image gallery, variant selector (updates price + image), add to cart
- Cart drawer: change quantity, remove, subtotal, Shopify checkout

Falls back to bundled sample data if the Storefront API is unreachable (add `?sample=1` to force it).

```
npm install
npm run dev
npm run build
```
