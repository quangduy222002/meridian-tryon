/** Area and cost estimate: floor and wall finishes per room (walls net of openings), furniture, doors and windows. */
import { FLOORS, FURNITURE, FURNITURE_PRICE, OPENING_PRICE, WALLS } from './catalog';
import {
  DOOR_HEIGHT,
  WALL_HEIGHT,
  WINDOW_SILL,
  WINDOW_TOP,
  len,
  nodeMap,
  roomAt,
  roomName,
  roomStyle,
  type Plan,
  type Room,
  type Vec2,
} from './plan';

export interface RoomCost {
  name: string;
  area: number;
  floor: { name: string; cost: number };
  wallArea: number;
  wall: { name: string; cost: number };
}

export interface Estimate {
  rooms: RoomCost[];
  totalArea: number;
  finishes: number;
  furniture: { name: string; qty: number; cost: number }[];
  furnitureTotal: number;
  openings: { doors: number; windows: number; cost: number };
  total: number;
}

export function estimate(p: Plan, rooms: Room[]): Estimate {
  const nodes = nodeMap(p);
  // Paintable wall area per room: each wall side that faces a room, minus its openings.
  const wallArea = new Map<string, number>();
  for (const w of p.walls) {
    const a = nodes.get(w.a);
    const b = nodes.get(w.b);
    if (!a || !b) continue;
    const L = len([a.x, a.z], [b.x, b.z]);
    if (L < 0.01) continue;
    const holes = p.openings
      .filter((o) => o.wall === w.id)
      .reduce((s, o) => s + o.width * (o.kind === 'door' ? DOOR_HEIGHT : WINDOW_TOP - WINDOW_SILL), 0);
    const net = Math.max(0, L * WALL_HEIGHT - holes);
    const mid: Vec2 = [(a.x + b.x) / 2, (a.z + b.z) / 2];
    const n: Vec2 = [-(b.z - a.z) / L, (b.x - a.x) / L];
    for (const s of [1, -1]) {
      const r = roomAt(rooms, [mid[0] + n[0] * s * (w.thick / 2 + 0.12), mid[1] + n[1] * s * (w.thick / 2 + 0.12)]);
      if (r) wallArea.set(r.key, (wallArea.get(r.key) ?? 0) + net);
    }
  }
  const roomRows = rooms
    .map((r): RoomCost => {
      const st = roomStyle(p, r);
      const f = FLOORS[st.floor] ?? FLOORS.oak!;
      const wf = WALLS[st.wall] ?? WALLS.chalk!;
      const wa = wallArea.get(r.key) ?? 0;
      return {
        name: roomName(p, r),
        area: r.area,
        floor: { name: f.name, cost: r.area * f.price },
        wallArea: wa,
        wall: { name: wf.name, cost: wa * wf.price },
      };
    })
    .sort((a, b) => b.area - a.area);
  const counts = new Map<string, number>();
  for (const it of p.items) counts.set(it.type, (counts.get(it.type) ?? 0) + 1);
  const furniture = [...counts]
    .map(([type, qty]) => ({ name: FURNITURE[type]?.name ?? type, qty, cost: qty * (FURNITURE_PRICE[type] ?? 0) }))
    .sort((a, b) => b.cost - a.cost);
  const doors = p.openings.filter((o) => o.kind === 'door').length;
  const windows = p.openings.length - doors;
  const openings = { doors, windows, cost: doors * OPENING_PRICE.door + windows * OPENING_PRICE.window };
  const finishes = roomRows.reduce((s, r) => s + r.floor.cost + r.wall.cost, 0);
  const furnitureTotal = furniture.reduce((s, f) => s + f.cost, 0);
  return {
    rooms: roomRows,
    totalArea: roomRows.reduce((s, r) => s + r.area, 0),
    finishes,
    furniture,
    furnitureTotal,
    openings,
    total: finishes + furnitureTotal + openings.cost,
  };
}
