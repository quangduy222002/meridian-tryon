export const FRAMES = {
  oak: {
    label: 'Oak',
    color: '#d2ab7c',
    metalness: 0,
    roughness: 0.55,
    grain: true,
    price: 0,
    note: 'Solid European oak, hand-oiled',
  },
  walnut: {
    label: 'Walnut',
    color: '#6a432d',
    metalness: 0,
    roughness: 0.48,
    grain: true,
    price: 40,
    note: 'Solid American walnut, hand-oiled',
  },
  black: {
    label: 'Black Metal',
    color: '#1f1f21',
    metalness: 0.85,
    roughness: 0.38,
    grain: false,
    price: 25,
    note: 'Powder-coated steel, satin black',
  },
  brass: {
    label: 'Brass',
    color: '#c39a4a',
    metalness: 1,
    roughness: 0.24,
    grain: false,
    price: 60,
    note: 'Brushed brass, lacquered',
  },
};
export const FABRICS = {
  linen: {
    label: 'Linen',
    roughness: 0.92,
    sheen: 0,
    normal: 'weave',
    normalScale: 0.6,
    clearcoat: 0,
    price: 0,
    note: 'Washed Belgian linen, removable cover',
  },
  velvet: {
    label: 'Velvet',
    roughness: 0.8,
    sheen: 1,
    normal: 'weave',
    normalScale: 0.15,
    clearcoat: 0,
    price: 30,
    note: 'Cotton velvet with a soft sheen',
  },
  leather: {
    label: 'Leather',
    roughness: 0.42,
    sheen: 0,
    normal: 'leather',
    normalScale: 0.55,
    clearcoat: 0.25,
    price: 80,
    note: 'Full-grain aniline leather',
  },
} as const;
export const COLORS = [
  { name: 'Sand', hex: '#d6c4a8' },
  { name: 'Sage', hex: '#8a9a7b' },
  { name: 'Terracotta', hex: '#b85c3c' },
  { name: 'Navy', hex: '#2b3a55' },
  { name: 'Charcoal', hex: '#3a3a3c' },
];
export const LEGS = {
  straight: { label: 'Straight', price: 0, note: 'Straight legs, 4° splay' },
  tapered: { label: 'Turned', price: 15, note: 'Hand-turned tapered legs with a collar' },
};
export const BASE_PRICE = 249;
export const ARMREST_PRICE = 35;

export type FrameKey = keyof typeof FRAMES;
export type FabricKey = keyof typeof FABRICS;
export type LegKey = keyof typeof LEGS;

export interface ChairConfig {
  frame: FrameKey;
  fabric: FabricKey;
  color: string;
  legs: LegKey;
  arms: boolean;
}

export const priceOf = (s: ChairConfig) =>
  BASE_PRICE + FRAMES[s.frame].price + FABRICS[s.fabric].price + LEGS[s.legs].price + (s.arms ? ARMREST_PRICE : 0);
