/** Furniture and finish catalogues: plain data shared by the 2D plan, the 3D builder, the estimate and the AI. */

export interface FurnitureDef {
  name: string;
  /** Footprint in metres: w along the item's x, d along its z (front faces +z), h height. */
  w: number;
  d: number;
  h: number;
  /** Swatches for the main material; the first is the default. */
  colors: string[];
  /** Hint for naming rooms automatically. */
  room?: 'Living' | 'Bedroom' | 'Kitchen' | 'Bathroom' | 'Dining' | 'Study';
  /** Sits on the floor under other things (rugs): drawn first, never collides. */
  flat?: boolean;
}

export const FURNITURE: Record<string, FurnitureDef> = {
  sofa: {
    name: 'Sofa',
    w: 2.2,
    d: 0.95,
    h: 0.85,
    colors: ['#8a9a8c', '#c9b8a3', '#5c6b80', '#b0674c', '#3b3a38'],
    room: 'Living',
  },
  armchair: {
    name: 'Armchair',
    w: 0.9,
    d: 0.9,
    h: 0.85,
    colors: ['#c9b8a3', '#8a9a8c', '#b0674c', '#5c6b80', '#e7dfd2'],
    room: 'Living',
  },
  coffee: { name: 'Coffee table', w: 1.1, d: 0.6, h: 0.42, colors: ['#a87a4c', '#3b3a38', '#e7dfd2'] },
  rug: { name: 'Rug', w: 2.4, d: 1.7, h: 0.012, colors: ['#d8cbb6', '#9aa7a0', '#b58a6e', '#e9e3d8'], flat: true },
  tv: { name: 'TV unit', w: 1.8, d: 0.45, h: 0.5, colors: ['#a87a4c', '#e7dfd2', '#3b3a38'], room: 'Living' },
  dining: { name: 'Dining set', w: 1.6, d: 1.6, h: 0.75, colors: ['#a87a4c', '#e7dfd2', '#3b3a38'], room: 'Dining' },
  kitchen: {
    name: 'Kitchen counter',
    w: 2.4,
    d: 0.62,
    h: 0.9,
    colors: ['#eae6df', '#5d6b5f', '#2f3135', '#c8a77e'],
    room: 'Kitchen',
  },
  fridge: { name: 'Fridge', w: 0.7, d: 0.7, h: 1.85, colors: ['#e9e9e6', '#b9bcc0', '#2f3135'], room: 'Kitchen' },
  bed: {
    name: 'Double bed',
    w: 1.7,
    d: 2.1,
    h: 0.95,
    colors: ['#e7dfd2', '#8a9a8c', '#5c6b80', '#c9b8a3'],
    room: 'Bedroom',
  },
  nightstand: { name: 'Nightstand', w: 0.5, d: 0.4, h: 0.5, colors: ['#a87a4c', '#e7dfd2', '#3b3a38'] },
  wardrobe: { name: 'Wardrobe', w: 1.8, d: 0.6, h: 2.1, colors: ['#e7dfd2', '#a87a4c', '#5d6b5f'], room: 'Bedroom' },
  desk: { name: 'Desk', w: 1.2, d: 0.6, h: 0.75, colors: ['#a87a4c', '#e7dfd2', '#3b3a38'], room: 'Study' },
  chair: { name: 'Chair', w: 0.5, d: 0.5, h: 0.85, colors: ['#3b3a38', '#a87a4c', '#b0674c', '#e7dfd2'] },
  bookshelf: { name: 'Bookshelf', w: 1.0, d: 0.32, h: 1.9, colors: ['#a87a4c', '#e7dfd2', '#3b3a38'], room: 'Study' },
  bathtub: { name: 'Bathtub', w: 1.7, d: 0.75, h: 0.55, colors: ['#f4f3f0'], room: 'Bathroom' },
  toilet: { name: 'Toilet', w: 0.4, d: 0.68, h: 0.78, colors: ['#f4f3f0'], room: 'Bathroom' },
  sink: { name: 'Vanity', w: 0.8, d: 0.48, h: 0.85, colors: ['#a87a4c', '#e7dfd2', '#5d6b5f'], room: 'Bathroom' },
  plant: { name: 'Plant', w: 0.5, d: 0.5, h: 1.25, colors: ['#c9b8a3', '#3b3a38', '#e7dfd2'] },
  lamp: { name: 'Floor lamp', w: 0.4, d: 0.4, h: 1.6, colors: ['#3b3a38', '#c8a77e', '#e7dfd2'] },
};

export interface Finish {
  name: string;
  /** Texture painted in the worker (none for plain paint). */
  tex?: string;
  /** Tint applied to the texture, or the paint colour. */
  color: string;
  roughness: number;
  /** Supply + fit, USD per m². */
  price: number;
}

export const FLOORS: Record<string, Finish> = {
  oak: { name: 'Oak planks', tex: 'planks', color: '#d9b48a', roughness: 0.6, price: 42 },
  walnut: { name: 'Walnut planks', tex: 'planks', color: '#8a5f3f', roughness: 0.55, price: 64 },
  tile: { name: 'Porcelain tile', tex: 'tile', color: '#e6e2db', roughness: 0.35, price: 34 },
  terrazzo: { name: 'Terrazzo', tex: 'terrazzo', color: '#ebe6dd', roughness: 0.4, price: 78 },
  concrete: { name: 'Polished concrete', tex: 'concrete', color: '#bdb7ad', roughness: 0.5, price: 28 },
  carpet: { name: 'Wool carpet', tex: 'carpet', color: '#c7bba8', roughness: 0.95, price: 24 },
};

export const WALLS: Record<string, Finish> = {
  chalk: { name: 'Chalk white', color: '#f1ede6', roughness: 0.9, price: 6 },
  sand: { name: 'Warm sand', color: '#e4d3bb', roughness: 0.9, price: 6 },
  sage: { name: 'Sage', color: '#b9c4b1', roughness: 0.9, price: 6 },
  clay: { name: 'Terracotta', color: '#cf9a7e', roughness: 0.9, price: 6 },
  ink: { name: 'Ink blue', color: '#4f5d70', roughness: 0.85, price: 7 },
  brick: { name: 'Brick slips', tex: 'brick', color: '#c98f74', roughness: 0.85, price: 58 },
  plaster: { name: 'Lime plaster', tex: 'concrete', color: '#e2dbd0', roughness: 0.95, price: 22 },
  zellige: { name: 'Zellige tile', tex: 'tile', color: '#9fbfb9', roughness: 0.3, price: 95 },
};

export const DEFAULT_STYLE = { floor: 'oak', wall: 'chalk' };
export const ROOM_DEFAULTS: Record<string, { floor: string; wall: string }> = {
  Bathroom: { floor: 'tile', wall: 'zellige' },
  Kitchen: { floor: 'terrazzo', wall: 'chalk' },
  Bedroom: { floor: 'oak', wall: 'sand' },
};

/** Furniture rough price, for the estimate. */
export const FURNITURE_PRICE: Record<string, number> = {
  sofa: 1450,
  armchair: 620,
  coffee: 280,
  rug: 390,
  tv: 540,
  dining: 1250,
  kitchen: 4200,
  fridge: 1100,
  bed: 1300,
  nightstand: 160,
  wardrobe: 980,
  desk: 420,
  chair: 140,
  bookshelf: 360,
  bathtub: 1150,
  toilet: 420,
  sink: 690,
  plant: 85,
  lamp: 190,
};

/** Doors and windows, per piece, for the estimate. */
export const OPENING_PRICE = { door: 480, window: 620 };
