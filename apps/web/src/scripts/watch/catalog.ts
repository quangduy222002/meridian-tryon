export interface CaseOption {
  label: string;
  color: string;
  rough: number;
  price: number;
  swatch: string;
}
export interface DialOption {
  label: string;
  color: string;
  ink: string;
}
export interface StrapOption {
  label: string;
  color: string;
  rough: number;
  bump: number;
  stitch: boolean;
  sheen: number;
  price: number;
}

export const CASES = {
  titanium: { label: 'Brushed Titanium', color: '#aeb1b5', rough: 0.34, price: 0, swatch: '#b9bcc0' },
  gold: { label: 'Champagne Gold', color: '#dcb575', rough: 0.26, price: 150, swatch: '#d6aa62' },
  black: { label: 'Black DLC', color: '#2b2c30', rough: 0.36, price: 60, swatch: '#2a2b2f' },
} satisfies Record<string, CaseOption>;

export const DIALS = {
  midnight: { label: 'Midnight', color: '#1d3260', ink: '#efe9dd' },
  forest: { label: 'Forest', color: '#1f4a3a', ink: '#efe9dd' },
  ivory: { label: 'Ivory', color: '#efe7d6', ink: '#2a2620' },
  salmon: { label: 'Salmon', color: '#e3a58b', ink: '#2a2620' },
} satisfies Record<string, DialOption>;

export const STRAPS = {
  rubber: { label: 'Black Rubber', color: '#151516', rough: 0.82, bump: 0.15, stitch: false, sheen: 0, price: 0 },
  leather: { label: 'Tan Leather', color: '#8b5a35', rough: 0.55, bump: 1.2, stitch: true, sheen: 0, price: 40 },
  ocean: { label: 'Ocean Rubber', color: '#2b5873', rough: 0.82, bump: 0.15, stitch: false, sheen: 0, price: 0 },
  sand: { label: 'Sand Suede', color: '#c2ab86', rough: 1.0, bump: 0.8, stitch: true, sheen: 1, price: 40 },
} satisfies Record<string, StrapOption>;

export type CaseKey = keyof typeof CASES;
export type DialKey = keyof typeof DIALS;
export type StrapKey = keyof typeof STRAPS;

export interface Config {
  case: CaseKey;
  dial: DialKey;
  strap: StrapKey;
}

export const BASE_PRICE = 349;
export const priceOf = (c: Config) => BASE_PRICE + CASES[c.case].price + STRAPS[c.strap].price;
