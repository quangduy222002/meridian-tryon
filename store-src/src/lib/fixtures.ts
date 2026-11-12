// Sample catalogue used only when the live Storefront API (mock.shop) can't be reached.
import type { Product } from './shopify';

const COLORS: Record<string, string> = { Black: '#1d1d1f', Sand: '#d8c7a8', Olive: '#6b7150', Navy: '#26324d', Ash: '#b9bcbf', Clay: '#b7684a' };

function garment(kind: string, color: string) {
  const c = COLORS[color] ?? '#999';
  const shapes: Record<string, string> = {
    hoodie: `<path d="M150 110 Q200 80 250 110 L310 140 L345 250 L305 262 L290 205 L290 330 L110 330 L110 205 L95 262 L55 250 L90 140 Z" fill="${c}"/><path d="M165 112 Q200 170 235 112" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="6"/><rect x="150" y="250" width="100" height="40" rx="8" fill="#000" opacity=".12"/>`,
    tee: `<path d="M150 110 Q200 135 250 110 L320 140 L300 195 L270 185 L270 330 L130 330 L130 185 L100 195 L80 140 Z" fill="${c}"/><path d="M165 112 Q200 140 235 112" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="5"/>`,
    cap: `<path d="M110 240 Q110 140 200 140 Q290 140 290 240 Z" fill="${c}"/><path d="M110 240 Q220 230 330 262 Q240 280 110 250 Z" fill="${c}" opacity=".85"/><circle cx="200" cy="140" r="9" fill="#000" opacity=".2"/>`,
    tote: `<path d="M160 160 Q160 95 200 95 Q240 95 240 160" fill="none" stroke="${c}" stroke-width="12"/><rect x="120" y="150" width="160" height="190" rx="6" fill="${c}"/>`,
    beanie: `<path d="M120 270 Q120 140 200 140 Q280 140 280 270 Z" fill="${c}"/><rect x="112" y="250" width="176" height="50" rx="10" fill="${c}" opacity=".85"/><circle cx="200" cy="132" r="22" fill="${c}"/>`,
    pants: `<path d="M140 100 L260 100 L280 340 L215 340 L200 170 L185 340 L120 340 Z" fill="${c}"/><rect x="140" y="100" width="120" height="18" fill="#000" opacity=".15"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#efede8"/><ellipse cx="200" cy="350" rx="120" ry="12" fill="#000" opacity=".07"/>${shapes[kind]}</svg>`;
  return { url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), altText: `${color} ${kind}`, width: 400, height: 400 };
}

function make(handle: string, title: string, kind: string, price: number, colors: string[], sizes: string[] | null, description: string): Product {
  const images = colors.map(col => garment(kind, col));
  const variants = colors.flatMap((col, ci) => (sizes ?? ['One Size']).map(s => ({
    id: `gid://shopify/ProductVariant/${handle}-${col}-${s}`.toLowerCase(),
    title: sizes ? `${col} / ${s}` : col,
    availableForSale: !(s === 'XL' && ci === 1),
    price: { amount: (price + (s === 'XL' ? 5 : 0)).toFixed(2), currencyCode: 'USD' },
    image: images[ci],
    selectedOptions: sizes ? [{ name: 'Color', value: col }, { name: 'Size', value: s }] : [{ name: 'Color', value: col }],
  })));
  return {
    id: `gid://shopify/Product/${handle}`, handle, title, description,
    featuredImage: images[0], images: { nodes: images },
    priceRange: { minVariantPrice: { amount: price.toFixed(2), currencyCode: 'USD' } },
    variants: { nodes: variants },
  };
}

const S = ['S', 'M', 'L', 'XL'];
export const FIXTURE_PRODUCTS: Product[] = [
  make('heavyweight-hoodie', 'Heavyweight Hoodie', 'hoodie', 89, ['Black', 'Sand', 'Olive'], S, 'A 450gsm brushed-back fleece hoodie with a double-layer hood and a relaxed, dropped shoulder.'),
  make('everyday-tee', 'Everyday Tee', 'tee', 32, ['Ash', 'Black', 'Clay'], S, 'Mid-weight organic cotton jersey that holds its shape wash after wash.'),
  make('field-cap', 'Field Cap', 'cap', 38, ['Navy', 'Sand', 'Olive'], null, 'Six-panel washed twill cap with an adjustable brass buckle.'),
  make('market-tote', 'Market Tote', 'tote', 45, ['Sand', 'Black'], null, 'Heavy canvas tote with reinforced handles and an inner zip pocket.'),
  make('rib-beanie', 'Rib Beanie', 'beanie', 28, ['Clay', 'Ash', 'Navy'], null, 'Soft merino-blend rib knit with a deep fold-over cuff.'),
  make('relaxed-trouser', 'Relaxed Trouser', 'pants', 98, ['Olive', 'Black', 'Sand'], S, 'Wide, easy trousers in a crisp cotton twill with a drawcord waist.'),
  make('pocket-tee', 'Pocket Tee', 'tee', 36, ['Navy', 'Sand'], S, 'Our everyday tee with a chest pocket and a slightly boxier cut.'),
  make('zip-hoodie', 'Zip Hoodie', 'hoodie', 96, ['Ash', 'Navy'], S, 'Full-zip version of our heavyweight hoodie, with metal hardware.'),
];

export const FIXTURE_COLLECTIONS = [
  { id: 'c1', handle: 'tops', title: 'Tops', products: ['heavyweight-hoodie', 'everyday-tee', 'pocket-tee', 'zip-hoodie'] },
  { id: 'c2', handle: 'accessories', title: 'Accessories', products: ['field-cap', 'market-tote', 'rib-beanie'] },
  { id: 'c3', handle: 'bottoms', title: 'Bottoms', products: ['relaxed-trouser'] },
];
