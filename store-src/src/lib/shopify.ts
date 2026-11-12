// Tiny Storefront API client for mock.shop (Shopify's public demo store).
// If the network call fails (offline, blocked), we fall back to bundled sample data
// so the storefront still works end-to-end.
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from './fixtures';

const ENDPOINT = 'https://mock.shop/api';

export type Money = { amount: string; currencyCode: string };
export type Img = { url: string; altText?: string | null; width?: number | null; height?: number | null };
export type Variant = {
  id: string; title: string; availableForSale: boolean; price: Money; image?: Img | null;
  selectedOptions: { name: string; value: string }[];
};
export type ProductCard = { id: string; handle: string; title: string; featuredImage?: Img | null; priceRange: { minVariantPrice: Money };
  images?: { nodes: Img[] }; variants?: { nodes: Pick<Variant, 'selectedOptions' | 'image'>[] } };
export type Product = Omit<ProductCard, 'variants' | 'images'> & { description: string; images: { nodes: Img[] }; variants: { nodes: Variant[] } };
export type Collection = { id: string; handle: string; title: string };

export let usingSampleData = false;
const forceSample = typeof location !== 'undefined' && /[?&]sample=1/.test(location.search);

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (forceSample) throw new Error('sample mode');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Storefront API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

const CARD = `id handle title featuredImage { url altText width height } priceRange { minVariantPrice { amount currencyCode } }
  images(first:2){ nodes { url altText width height } } variants(first:30){ nodes { selectedOptions { name value } image { url altText width height } } }`;

export async function getProducts(first = 24): Promise<ProductCard[]> {
  try {
    const d = await gql<{ products: { nodes: ProductCard[] } }>(`query($first:Int!){ products(first:$first){ nodes { ${CARD} } } }`, { first });
    return d.products.nodes;
  } catch { usingSampleData = true; return FIXTURE_PRODUCTS.slice(0, first); }
}

export async function getCollections(): Promise<Collection[]> {
  try {
    const d = await gql<{ collections: { nodes: Collection[] } }>(`{ collections(first:10){ nodes { id handle title } } }`);
    return d.collections.nodes;
  } catch { usingSampleData = true; return FIXTURE_COLLECTIONS.map(c => ({ id: c.id, handle: c.handle, title: c.title })); }
}

export async function getCollection(handle: string): Promise<{ title: string; products: ProductCard[] } | null> {
  try {
    const d = await gql<{ collection: { title: string; products: { nodes: ProductCard[] } } | null }>(
      `query($h:String!){ collection(handle:$h){ title products(first:48){ nodes { ${CARD} } } } }`, { h: handle });
    return d.collection ? { title: d.collection.title, products: d.collection.products.nodes } : null;
  } catch {
    usingSampleData = true;
    const c = FIXTURE_COLLECTIONS.find(c => c.handle === handle);
    return c ? { title: c.title, products: FIXTURE_PRODUCTS.filter(p => c.products.includes(p.handle)) } : null;
  }
}

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    const d = await gql<{ product: Product | null }>(`query($h:String!){ product(handle:$h){ id handle title featuredImage { url altText width height } priceRange { minVariantPrice { amount currencyCode } } description
      images(first:10){ nodes { url altText width height } }
      variants(first:50){ nodes { id title availableForSale price { amount currencyCode } image { url altText width height } selectedOptions { name value } } } } }`, { h: handle });
    return d.product;
  } catch { usingSampleData = true; return FIXTURE_PRODUCTS.find(p => p.handle === handle) ?? null; }
}

/* ---------------- Cart (Storefront API cart, with a local fallback) ---------------- */
export type Attr = { key: string; value: string };
export type CartLine = { id: string; quantity: number; attributes?: Attr[]; merchandise: { id: string; title: string; price: Money; image?: Img | null; product: { title: string; handle: string } } };
export type Cart = { id: string | null; checkoutUrl: string | null; lines: CartLine[] };

const CART = `id checkoutUrl lines(first:50){ nodes { id quantity attributes { key value } merchandise { ... on ProductVariant { id title price { amount currencyCode } image { url altText width height } product { title handle } } } } }`;
type CartRes = { id: string; checkoutUrl: string; lines: { nodes: CartLine[] } };
const norm = (c: CartRes): Cart => ({ id: c.id, checkoutUrl: c.checkoutUrl, lines: c.lines.nodes });

export async function cartCreate(merchandiseId: string, quantity: number, attributes: Attr[] = []): Promise<Cart> {
  const d = await gql<{ cartCreate: { cart: CartRes } }>(`mutation($l:[CartLineInput!]){ cartCreate(input:{ lines:$l }){ cart { ${CART} } } }`, { l: [{ merchandiseId, quantity, attributes }] });
  return norm(d.cartCreate.cart);
}
export async function cartAdd(cartId: string, merchandiseId: string, quantity: number, attributes: Attr[] = []): Promise<Cart> {
  const d = await gql<{ cartLinesAdd: { cart: CartRes } }>(`mutation($c:ID!,$l:[CartLineInput!]!){ cartLinesAdd(cartId:$c, lines:$l){ cart { ${CART} } } }`, { c: cartId, l: [{ merchandiseId, quantity, attributes }] });
  return norm(d.cartLinesAdd.cart);
}
export async function cartUpdate(cartId: string, lineId: string, quantity: number): Promise<Cart> {
  const d = await gql<{ cartLinesUpdate: { cart: CartRes } }>(`mutation($c:ID!,$l:[CartLineUpdateInput!]!){ cartLinesUpdate(cartId:$c, lines:$l){ cart { ${CART} } } }`, { c: cartId, l: [{ id: lineId, quantity }] });
  return norm(d.cartLinesUpdate.cart);
}
export async function cartRemove(cartId: string, lineId: string): Promise<Cart> {
  const d = await gql<{ cartLinesRemove: { cart: CartRes } }>(`mutation($c:ID!,$l:[ID!]!){ cartLinesRemove(cartId:$c, lineIds:$l){ cart { ${CART} } } }`, { c: cartId, l: [lineId] });
  return norm(d.cartLinesRemove.cart);
}
export async function cartGet(cartId: string): Promise<Cart | null> {
  const d = await gql<{ cart: CartRes | null }>(`query($c:ID!){ cart(id:$c){ ${CART} } }`, { c: cartId });
  return d.cart ? norm(d.cart) : null;
}
