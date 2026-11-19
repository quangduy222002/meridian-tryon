/**
 * Objects the catalogue doesn't have (a spiral staircase, a grand piano, an aquarium, a built-in bench seat): Claude
 * describes them as a small kit of primitives, and the planner registers them as furniture types of the plan.
 *
 * A definition is plain JSON kept in the plan (plan.customs), so it saves, shares and undoes with it. Parts are
 * boxes, cylinders, cones, spheres and tori with a position, rotation, material and colour; a part can repeat with
 * a step and a turn about a vertical axis (treads of a spiral stair, slats, chair legs). Everything is sanitised:
 * sizes are clamped and the number of meshes is capped, so a bad answer can't break the scene.
 */
import { FURNITURE, type FurnitureDef } from './catalog';

export type PartShape = 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus';
export type PartMaterial = 'wood' | 'metal' | 'fabric' | 'glass' | 'stone' | 'ceramic' | 'plastic' | 'plant' | 'light';

export interface CustomPart {
  shape: PartShape;
  /** Box size, metres. */
  w?: number;
  h?: number;
  d?: number;
  /** Radius (cylinder, cone base, sphere, torus ring) and top radius of a cylinder, metres. */
  r?: number;
  rTop?: number;
  /** Torus tube radius. */
  tube?: number;
  /** Centre, metres from the middle of the footprint on the floor (y up). */
  x: number;
  y: number;
  z: number;
  /** Rotation in degrees about x, y, z. */
  rx?: number;
  ry?: number;
  rz?: number;
  material?: PartMaterial;
  color?: string;
  /** Copies: each one moved by (dx, dy, dz) and turned by ry degrees about the vertical axis through pivot [x, z]. */
  repeat?: { count: number; dx?: number; dy?: number; dz?: number; ry?: number; pivot?: [number, number] };
}

export interface CustomDef {
  name: string;
  /** Footprint (w along x, d along z, front faces +z) and height, metres. */
  w: number;
  d: number;
  h: number;
  /** Rooms this belongs to, for naming ('Living', 'Bedroom'…), optional. */
  room?: FurnitureDef['room'];
  /** A stair or lift that rises to the floor above: the floor above opens over it. */
  opensAbove?: boolean;
  /** Fixed to the ceiling (a ceiling fan, a skylight). */
  mount?: 'ceiling' | 'wall';
  parts: CustomPart[];
}

/** Parts of each registered custom type, for the 3D builder. */
export const CUSTOM_PARTS = new Map<string, CustomPart[]>();

const num = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
const HEX = /^#[0-9a-f]{6}$/i;
const SHAPES: PartShape[] = ['box', 'cylinder', 'cone', 'sphere', 'torus'];
const MATERIALS: PartMaterial[] = ['wood', 'metal', 'fabric', 'glass', 'stone', 'ceramic', 'plastic', 'plant', 'light'];
const MAX_MESHES = 600;

/** A definition made safe to build: known shapes and materials, sizes within reason, a capped mesh count. */
export function sanitizeCustom(raw: unknown): CustomDef | null {
  const o = raw as Partial<CustomDef> | null;
  if (!o || typeof o !== 'object' || !Array.isArray(o.parts)) return null;
  const w = num(o.w, 0.05, 12, 1);
  const d = num(o.d, 0.05, 12, 1);
  const h = num(o.h, 0.01, 8, 1);
  let meshes = 0;
  const parts: CustomPart[] = [];
  for (const p of o.parts.slice(0, 80)) {
    if (!p || typeof p !== 'object' || !SHAPES.includes(p.shape)) continue;
    const count = Math.round(num(p.repeat?.count, 1, 120, 1));
    if (meshes + count > MAX_MESHES) break;
    meshes += count;
    parts.push({
      shape: p.shape,
      w: num(p.w, 0.002, 12, 0.1),
      h: num(p.h, 0.002, 8, 0.1),
      d: num(p.d, 0.002, 12, 0.1),
      r: num(p.r, 0.002, 6, 0.1),
      rTop: p.rTop === undefined ? undefined : num(p.rTop, 0, 6, 0.1),
      tube: num(p.tube, 0.002, 1, 0.02),
      x: num(p.x, -12, 12, 0),
      y: num(p.y, -1, 8, 0),
      z: num(p.z, -12, 12, 0),
      rx: num(p.rx, -360, 360, 0),
      ry: num(p.ry, -360, 360, 0),
      rz: num(p.rz, -360, 360, 0),
      material: MATERIALS.includes(p.material as PartMaterial) ? p.material : 'plastic',
      color: HEX.test(p.color ?? '') ? p.color : '#d9d6cf',
      ...(count > 1
        ? {
            repeat: {
              count,
              dx: num(p.repeat?.dx, -6, 6, 0),
              dy: num(p.repeat?.dy, -6, 6, 0),
              dz: num(p.repeat?.dz, -6, 6, 0),
              ry: num(p.repeat?.ry, -360, 360, 0),
              pivot: [num(p.repeat?.pivot?.[0], -12, 12, 0), num(p.repeat?.pivot?.[1], -12, 12, 0)],
            },
          }
        : {}),
    });
  }
  if (!parts.length) return null;
  return {
    name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 60) : 'Custom object',
    w,
    d,
    h,
    ...(o.room ? { room: o.room } : {}),
    ...(o.opensAbove ? { opensAbove: true } : {}),
    ...(o.mount === 'ceiling' || o.mount === 'wall' ? { mount: o.mount } : {}),
    parts,
  };
}

/** Makes a plan's custom objects available as furniture types (`custom:<id>`), wherever FURNITURE is read. */
export function registerCustoms(customs: Record<string, CustomDef> | undefined) {
  for (const [id, def] of Object.entries(customs ?? {})) {
    const type = `custom:${id}`;
    CUSTOM_PARTS.set(type, def.parts);
    const colors = [...new Set(def.parts.map((p) => p.color ?? '#d9d6cf'))].slice(0, 4);
    FURNITURE[type] = {
      name: def.name,
      w: def.w,
      d: def.d,
      h: def.h,
      colors,
      group: 'Custom',
      role: 'fixed',
      ...(def.room ? { room: def.room } : {}),
      ...(def.mount ? { mount: def.mount } : {}),
      ...(def.opensAbove ? { opensAbove: true } : {}),
      custom: true,
    };
  }
}

/** A short id for a new custom object, from its name. */
export function customId(name: string, taken: Record<string, unknown> = {}) {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'object';
  let id = base;
  for (let i = 2; taken[id]; i++) id = `${base}-${i}`;
  return id;
}

/** How Claude should describe a new object: the format, with a worked example (a spiral staircase). */
export const CUSTOM_FORMAT = `A new object is JSON: {"name": string, "w": number, "d": number, "h": number, "opensAbove"?: true, "mount"?: "ceiling" | "wall", "parts": Part[]}.
w × d is the footprint in metres (x across, z depth, the front faces +z), h the height. "opensAbove": true for a stair or lift that rises to the floor above (the floor above is opened over it).
A Part is {"shape": "box" | "cylinder" | "cone" | "sphere" | "torus", "x", "y", "z": centre in metres from the middle of the footprint on the floor (y up), "w","h","d" (box size) or "r" (radius; "rTop" for a tapered cylinder; "tube" for a torus), "rx","ry","rz" (rotation in degrees, optional), "material": "wood" | "metal" | "fabric" | "glass" | "stone" | "ceramic" | "plastic" | "plant" | "light", "color": "#rrggbb", "repeat"?: {"count", "dx","dy","dz" (step per copy), "ry" (degrees turned per copy about the vertical axis through "pivot": [x, z])}}.
Model the object faithfully at real size with 3–40 parts; use "repeat" for treads, slats, balusters and legs. Keep every part inside the footprint and between 0 and h.
Example, a spiral staircase 1.6 m across rising 3.3 m: {"name": "Spiral staircase", "w": 1.6, "d": 1.6, "h": 3.3, "opensAbove": true, "parts": [{"shape": "cylinder", "r": 0.06, "h": 3.3, "x": 0, "y": 1.65, "z": 0, "material": "metal", "color": "#2b2d31"}, {"shape": "box", "w": 0.68, "h": 0.04, "d": 0.3, "x": 0.4, "y": 0.18, "z": 0, "material": "wood", "color": "#b58a5a", "repeat": {"count": 18, "dy": 0.183, "ry": 22, "pivot": [0, 0]}}, {"shape": "cylinder", "r": 0.012, "h": 0.9, "x": 0.72, "y": 0.63, "z": 0, "material": "metal", "color": "#2b2d31", "repeat": {"count": 18, "dy": 0.183, "ry": 22, "pivot": [0, 0]}}]}`;
