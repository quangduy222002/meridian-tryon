/**
 * Interior design styles. A style is a set of decisions an interior architect makes once for the whole home: which
 * timber and metal, how furniture stands (tapered legs, a plinth, turned legs, rattan), how soft its edges are, the
 * palette for upholstery, cabinetry and accents, the floor and wall finish of each kind of room, and which pieces
 * suit it. The 3D builder, the "Style" dialog and the AI brief all read from here.
 */

export type Legs = 'tapered' | 'metal' | 'plinth' | 'turned' | 'rattan';

export interface DesignStyle {
  name: string;
  /** Vietnamese name, as clients ask for it. */
  vi: string;
  /** One line for the style card. */
  blurb: string;
  /** Timber of frames, legs and wooden tops. */
  wood: string;
  /** Metal of handles, legs and frames. */
  metal: string;
  legs: Legs;
  /** Edge softness: 0.4 crisp … 1.6 pillowy. */
  round: number;
  /** Upholstery and textiles, first is the main one. */
  fabric: string[];
  /** Cabinet fronts and painted case goods. */
  cases: string[];
  /** One or two accent colours (a cushion, a vase, a rug). */
  accent: string[];
  /** Floor and wall finish per room kind ('*' for any other room). */
  finishes: Record<string, { floor: string; wall: string }>;
  /** Pieces that make the style read, for the AI to reach for first. */
  signature: string[];
  /** What the AI should know: materials, forms, decor, what to avoid. */
  brief: string;
}

export const STYLES: Record<string, DesignStyle> = {
  modern: {
    name: 'Modern',
    vi: 'Hiện đại',
    blurb: 'Clean lines, warm greys, walnut and matt black metal.',
    wood: '#7a5638',
    metal: '#2b2d31',
    legs: 'metal',
    round: 0.8,
    fabric: ['#8d8f91', '#5c6b80', '#c9c3b8', '#3b3a38'],
    cases: ['#ecebe8', '#3b3a38', '#7a5638'],
    accent: ['#b0674c', '#c8a77e'],
    finishes: {
      '*': { floor: 'walnut', wall: 'chalk' },
      Bedroom: { floor: 'oak', wall: 'greige' },
      Bathroom: { floor: 'marble', wall: 'marble' },
      Kitchen: { floor: 'tile', wall: 'chalk' },
      Balcony: { floor: 'tile', wall: 'plaster' },
    },
    signature: ['sofaL', 'coffeeRound', 'sideboard', 'bedKing', 'art'],
    brief:
      'Modern: low, linear pieces on slim black metal legs, a large L-shaped sofa as the anchor, walnut and stone, a restrained grey-and-earth palette with one terracotta or brass accent, a few large framed artworks; no ornament, no clutter.',
  },
  minimalist: {
    name: 'Minimalist',
    vi: 'Tối giản',
    blurb: 'White, calm and empty; furniture on plinths, nothing extra.',
    wood: '#d8c3a1',
    metal: '#c9ccd1',
    legs: 'plinth',
    round: 0.5,
    fabric: ['#ecebe7', '#d9d6cf', '#bdb8ae'],
    cases: ['#f4f3f0', '#e9e7e2'],
    accent: ['#9a9590'],
    finishes: {
      '*': { floor: 'concrete', wall: 'chalk' },
      Bedroom: { floor: 'oak', wall: 'chalk' },
      Bathroom: { floor: 'concrete', wall: 'plaster' },
      Kitchen: { floor: 'concrete', wall: 'chalk' },
      Balcony: { floor: 'concrete', wall: 'plaster' },
    },
    signature: ['sofa', 'bench', 'wardrobe', 'bed'],
    brief:
      'Minimalist: as few pieces as the function needs, set on plinths so they seem to float, flush handle-less fronts, white and pale neutrals only, generous empty floor; one plant at most; avoid rugs with pattern, avoid decorative items.',
  },
  scandinavian: {
    name: 'Scandinavian',
    vi: 'Bắc Âu',
    blurb: 'Light oak, white walls, soft textiles and tapered legs.',
    wood: '#d9b48a',
    metal: '#3b3a38',
    legs: 'tapered',
    round: 1.2,
    fabric: ['#d9d6cf', '#9aa7a0', '#c9b8a3', '#5c6b80'],
    cases: ['#f4f3f0', '#d9b48a'],
    accent: ['#e4b363', '#9aa7a0'],
    finishes: {
      '*': { floor: 'oak', wall: 'chalk' },
      Bedroom: { floor: 'oak', wall: 'chalk' },
      Bathroom: { floor: 'tile', wall: 'tile' },
      Kitchen: { floor: 'oak', wall: 'chalk' },
      Balcony: { floor: 'tile', wall: 'plaster' },
    },
    signature: ['sofa', 'armchair', 'coffeeRound', 'bookshelfLow', 'plant', 'rugRound'],
    brief:
      'Scandinavian: light oak on tapered legs, white walls, soft rounded upholstery in pale grey, sage or oat, wool rugs, a reading chair with a floor lamp, a few plants; cosy (hygge) but uncluttered.',
  },
  japandi: {
    name: 'Japandi',
    vi: 'Japandi',
    blurb: 'Low, quiet and natural: pale timber, slats, linen and stone.',
    wood: '#c9a77c',
    metal: '#3b3a38',
    legs: 'plinth',
    round: 1,
    fabric: ['#d8cbb6', '#b7ad9c', '#8f8678'],
    cases: ['#c9a77c', '#e9e3d8'],
    accent: ['#5d6b5f', '#3b3a38'],
    finishes: {
      '*': { floor: 'oak', wall: 'slats' },
      Bedroom: { floor: 'oak', wall: 'limewash' },
      Bathroom: { floor: 'concrete', wall: 'limewash' },
      Kitchen: { floor: 'oak', wall: 'limewash' },
      Balcony: { floor: 'concrete', wall: 'plaster' },
    },
    signature: ['bedKing', 'bench', 'sideboard', 'plant', 'rug'],
    brief:
      'Japandi: low-slung furniture close to the floor, pale timber and wood slats, linen in oat and stone, a low platform bed, a long low sideboard or bench, one sculptural plant; balanced asymmetry and plenty of empty space.',
  },
  indochine: {
    name: 'Indochine',
    vi: 'Đông Dương',
    blurb: 'Dark teak, rattan, patterned cement tiles and a touch of jade.',
    wood: '#4a2e1f',
    metal: '#b08d57',
    legs: 'turned',
    round: 0.7,
    fabric: ['#e9e1d0', '#5d6b5f', '#b0674c'],
    cases: ['#4a2e1f', '#e9e1d0'],
    accent: ['#2f6b5e', '#d9b06a'],
    finishes: {
      '*': { floor: 'encaustic', wall: 'limewash' },
      Bedroom: { floor: 'walnut', wall: 'limewash' },
      Bathroom: { floor: 'encaustic', wall: 'tile' },
      Kitchen: { floor: 'encaustic', wall: 'limewash' },
      Balcony: { floor: 'terracotta', wall: 'limewash' },
    },
    signature: ['altar', 'teaTable', 'armchairRattan', 'sideboard', 'plantPalm', 'art'],
    brief:
      'Indochine (Đông Dương): French colonial meets Vietnam — dark teak frames, rattan and cane, patterned cement tiles (gạch bông), cream lime walls, brass, jade-green and lacquer accents; a family altar cabinet and a tea table with stools are typical; palms in large pots.',
  },
  classic: {
    name: 'Classic',
    vi: 'Cổ điển',
    blurb: 'Panelled walls, turned legs, wing chairs and warm cream.',
    wood: '#6b4630',
    metal: '#c2a15e',
    legs: 'turned',
    round: 1.3,
    fabric: ['#e7dcc7', '#8a6f4e', '#5c3b33', '#2f4a5a'],
    cases: ['#efe7d8', '#6b4630'],
    accent: ['#c2a15e', '#7a2e2e'],
    finishes: {
      '*': { floor: 'herringbone', wall: 'panel' },
      Bedroom: { floor: 'herringbone', wall: 'panel' },
      Bathroom: { floor: 'marble', wall: 'marble' },
      Kitchen: { floor: 'marble', wall: 'panel' },
      Balcony: { floor: 'marble', wall: 'plaster' },
    },
    signature: ['sofa', 'armchairWing', 'coffee', 'sideboard', 'dresser', 'art', 'rug'],
    brief:
      'Classic (Cổ điển / tân cổ điển): symmetry around a focal point, panelled walls and herringbone floors, turned and carved legs, a pair of wing chairs facing the sofa, cream and taupe with gold and one deep colour, large framed art and a patterned rug.',
  },
  tropical: {
    name: 'Tropical',
    vi: 'Nhiệt đới',
    blurb: 'Rattan, terracotta, bright linen and big leafy plants.',
    wood: '#a8794e',
    metal: '#3b3a38',
    legs: 'rattan',
    round: 1.2,
    fabric: ['#f1ece2', '#8fae8a', '#e2b56b', '#c9785a'],
    cases: ['#c9a26b', '#f1ece2'],
    accent: ['#3f7a4f', '#e2b56b'],
    finishes: {
      '*': { floor: 'terracotta', wall: 'chalk' },
      Bedroom: { floor: 'oak', wall: 'chalk' },
      Bathroom: { floor: 'terracotta', wall: 'tile' },
      Kitchen: { floor: 'terracotta', wall: 'chalk' },
      Balcony: { floor: 'terracotta', wall: 'plaster' },
    },
    signature: ['armchairRattan', 'sofa', 'plantPalm', 'plant', 'bench', 'rugRound'],
    brief:
      'Tropical (Nhiệt đới): breezy and open to the outside — rattan and woven furniture, terracotta floors, white walls, linen in sand, leaf green and mustard, many large plants (palms, monstera) near windows and on the balcony, light curtains; keep air flowing between windows.',
  },
  eco: {
    name: 'Eco / Biophilic',
    vi: 'Sinh thái',
    blurb: 'Natural timber, bamboo, stone and plants in every room.',
    wood: '#b58a5a',
    metal: '#5d6b5f',
    legs: 'tapered',
    round: 1.1,
    fabric: ['#cfc4ae', '#8a9a7a', '#a9967a'],
    cases: ['#b58a5a', '#e9e3d8'],
    accent: ['#5d7a4f', '#c98f74'],
    finishes: {
      '*': { floor: 'bamboo', wall: 'limewash' },
      Bedroom: { floor: 'bamboo', wall: 'limewash' },
      Bathroom: { floor: 'concrete', wall: 'limewash' },
      Kitchen: { floor: 'bamboo', wall: 'limewash' },
      Balcony: { floor: 'terracotta', wall: 'plaster' },
    },
    signature: ['plant', 'plantPalm', 'bench', 'bookshelfLow', 'rug'],
    brief:
      'Eco / biophilic (Sinh thái): natural, unfinished materials (solid timber, bamboo, stone, lime), earthy greens and clay, plants in every room grouped by windows, daylight kept free, furniture of natural fibres; nothing glossy or synthetic-looking.',
  },
};

export const DEFAULT_STYLE_ID = 'scandinavian';

export const styleOf = (id?: string): DesignStyle => STYLES[id ?? ''] ?? STYLES[DEFAULT_STYLE_ID]!;

/** Floor and wall finish a style gives a room of this kind. */
export function styleFinish(style: DesignStyle, room: string) {
  return style.finishes[room] ?? style.finishes['*']!;
}

/** The colour a style gives a piece, from its role in the palette (sanitary ware and appliances keep theirs). */
export function styleColor(style: DesignStyle, type: string, role: string, fallback: string): string {
  switch (role) {
    case 'fabric':
      return (type.startsWith('armchair') || type === 'ottoman' ? style.fabric[1] : style.fabric[0]) ?? fallback;
    case 'case':
      return style.cases[0] ?? fallback;
    case 'wood':
      return type === 'armchairRattan' ? '#c9a26b' : style.wood;
    case 'accent':
      if (type.startsWith('rug')) return style.fabric[2] ?? style.fabric[0] ?? fallback;
      if (type === 'lamp') return style.metal;
      if (type === 'art') return style.wood;
      return style.cases[1] ?? fallback;
    default:
      return fallback;
  }
}

/** Swatches a style offers for a role, so the inspector can keep a piece within the palette. */
export function styleSwatches(style: DesignStyle, role: string): string[] {
  if (role === 'fabric') return [...style.fabric, ...style.accent];
  if (role === 'case') return [...style.cases, style.wood];
  if (role === 'wood') return [style.wood, ...style.cases];
  if (role === 'accent') return [...style.accent, ...style.cases];
  return [];
}
