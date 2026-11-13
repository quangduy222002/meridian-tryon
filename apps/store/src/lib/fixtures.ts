// Sample catalogue used only when the live Storefront API (mock.shop) can't be reached.
import type { Product } from './shopify';

export const COLORS: Record<string, string> = {
  Black: '#24272a',
  Sand: '#cdbb9a',
  Olive: '#5f6a4a',
  Navy: '#25324a',
  Ash: '#aeb4b6',
  Clay: '#a8644a',
  Glacier: '#9cc3d6',
  Spruce: '#2b4a40',
};

// Studio-style product shots drawn as SVG: soft backdrop, shaded garment, seams and a floor shadow.
function garment(kind: string, color: string, alt = false) {
  const c = COLORS[color] ?? '#999';
  const seam = 'stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"';
  const rib = 'stroke="#000" stroke-opacity=".22" stroke-width="5" fill="none"';
  const shapes: Record<string, string> = {
    hoodie: `<path d="M152 104 Q200 70 248 104 L318 136 Q338 200 352 268 L310 282 L294 214 L296 340 Q200 352 104 340 L106 214 L90 282 L48 268 Q62 200 82 136 Z" fill="url(#g)"/><path d="M164 108 Q200 176 236 108" ${rib}/><path d="M190 150 L188 196 M210 150 L212 196" ${seam}/><path d="M146 262 Q200 274 254 262 L250 312 Q200 320 150 312 Z" fill="#000" opacity=".1"/><path d="M106 214 L106 330 M294 214 L294 330" ${seam}/>`,
    tee: `<path d="M150 104 Q200 132 250 104 L330 140 L306 206 L274 194 L276 344 Q200 352 124 344 L126 194 L94 206 L70 140 Z" fill="url(#g)"/><path d="M160 106 Q200 140 240 106" ${rib}/><path d="M126 194 L126 340 M274 194 L274 340" ${seam}/>`,
    cap: `<path d="M104 240 Q100 132 200 128 Q300 132 296 240 Z" fill="url(#g)"/><path d="M104 240 Q230 226 344 262 Q248 290 104 254 Z" fill="${c}" /><path d="M200 128 L200 240 M150 136 Q140 190 146 240 M250 136 Q260 190 254 240" ${seam}/><circle cx="200" cy="128" r="8" fill="#000" opacity=".2"/>`,
    tote: `<path d="M158 168 Q158 88 200 88 Q242 88 242 168" fill="none" stroke="${c}" stroke-width="12"/><path d="M116 156 L284 156 L292 344 L108 344 Z" fill="url(#g)"/><path d="M116 176 L284 176" ${seam}/>`,
    beanie: `<path d="M116 262 Q114 136 200 132 Q286 136 284 262 Z" fill="url(#g)"/><rect x="106" y="242" width="188" height="60" rx="12" fill="${c}"/><path d="M130 252 L130 296 M152 250 L152 298 M174 250 L174 298 M196 250 L196 298 M218 250 L218 298 M240 250 L240 298 M262 250 L262 298" ${seam}/><circle cx="200" cy="124" r="24" fill="${c}"/>`,
    pants: `<path d="M136 92 L264 92 L290 348 L216 348 L200 176 L184 348 L110 348 Z" fill="url(#g)"/><rect x="136" y="92" width="128" height="20" fill="#000" opacity=".14"/><path d="M200 112 L200 176 M150 120 L140 340 M250 120 L260 340" ${seam}/>`,
  };
  const bg = alt ? '#dfe4e2' : '#e9edeb';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient><radialGradient id="b" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="500" fill="${bg}"/><rect width="400" height="500" fill="url(#b)"/><ellipse cx="200" cy="420" rx="130" ry="14" fill="#000" opacity=".08"/><g transform="translate(0 50) ${alt ? 'rotate(-6 200 230)' : ''}">${shapes[kind]}</g></svg>`;
  return {
    url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    altText: `${color} ${kind}`,
    width: 400,
    height: 500,
  };
}

function make(
  handle: string,
  title: string,
  kind: string,
  price: number,
  colors: string[],
  sizes: string[] | null,
  description: string,
): Product {
  const images = colors.flatMap((col) => [garment(kind, col), garment(kind, col, true)]);
  const variants = colors.flatMap((col, ci) =>
    (sizes ?? ['One Size']).map((s) => ({
      id: `gid://shopify/ProductVariant/${handle}-${col}-${s}`.toLowerCase(),
      title: sizes ? `${col} / ${s}` : col,
      availableForSale: !(s === 'XL' && ci === 1),
      price: { amount: (price + (s === 'XL' ? 5 : 0)).toFixed(2), currencyCode: 'USD' },
      image: images[ci * 2],
      selectedOptions: sizes
        ? [
            { name: 'Color', value: col },
            { name: 'Size', value: s },
          ]
        : [{ name: 'Color', value: col }],
    })),
  );
  return {
    id: `gid://shopify/Product/${handle}`,
    handle,
    title,
    description,
    featuredImage: images[0],
    images: { nodes: images },
    priceRange: { minVariantPrice: { amount: price.toFixed(2), currencyCode: 'USD' } },
    variants: { nodes: variants },
  };
}

const S = ['S', 'M', 'L', 'XL'];
export const FIXTURE_PRODUCTS: Product[] = [
  make(
    'heavyweight-hoodie',
    'Heavyweight Hoodie',
    'hoodie',
    89,
    ['Spruce', 'Sand', 'Black'],
    S,
    'A 450gsm brushed-back fleece hoodie with a double-layer hood and a relaxed, dropped shoulder.',
  ),
  make(
    'everyday-tee',
    'Everyday Tee',
    'tee',
    32,
    ['Ash', 'Black', 'Clay'],
    S,
    'Mid-weight organic cotton jersey that holds its shape wash after wash.',
  ),
  make(
    'field-cap',
    'Field Cap',
    'cap',
    38,
    ['Navy', 'Sand', 'Olive'],
    null,
    'Six-panel washed twill cap with an adjustable brass buckle.',
  ),
  make(
    'market-tote',
    'Market Tote',
    'tote',
    45,
    ['Sand', 'Black'],
    null,
    'Heavy canvas tote with reinforced handles and an inner zip pocket.',
  ),
  make(
    'rib-beanie',
    'Rib Beanie',
    'beanie',
    28,
    ['Clay', 'Ash', 'Navy'],
    null,
    'Soft merino-blend rib knit with a deep fold-over cuff.',
  ),
  make(
    'relaxed-trouser',
    'Relaxed Trouser',
    'pants',
    98,
    ['Olive', 'Black', 'Sand'],
    S,
    'Wide, easy trousers in a crisp cotton twill with a drawcord waist.',
  ),
  make(
    'pocket-tee',
    'Pocket Tee',
    'tee',
    36,
    ['Navy', 'Sand'],
    S,
    'Our everyday tee with a chest pocket and a slightly boxier cut.',
  ),
  make(
    'zip-hoodie',
    'Zip Hoodie',
    'hoodie',
    96,
    ['Glacier', 'Navy'],
    S,
    'Full-zip version of our heavyweight hoodie, with metal hardware.',
  ),
];

export const FIXTURE_COLLECTIONS = [
  {
    id: 'c1',
    handle: 'tops',
    title: 'Tops',
    products: ['heavyweight-hoodie', 'everyday-tee', 'pocket-tee', 'zip-hoodie'],
  },
  { id: 'c2', handle: 'accessories', title: 'Accessories', products: ['field-cap', 'market-tote', 'rib-beanie'] },
  { id: 'c3', handle: 'bottoms', title: 'Bottoms', products: ['relaxed-trouser'] },
];
