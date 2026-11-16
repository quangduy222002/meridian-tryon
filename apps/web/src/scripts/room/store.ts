/**
 * Saving and sharing plans without a server: the plan is autosaved in this browser, and a share link carries the
 * whole plan in the URL hash, deflate-compressed and base64url-encoded (a furnished flat fits in ~2 kB).
 */
import { samplePlan, type Plan } from './plan';

const KEY = 'roomcraft.plan';
const HASH = 'p=';

const toB64 = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Shrinks coordinates to centimetres before compressing, so links stay short. */
const compact = (p: Plan) =>
  JSON.stringify(p, (_k, v: unknown) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v));

export async function shareUrl(p: Plan) {
  const data = new TextEncoder().encode(compact(p));
  const packed = await pipe(data, new CompressionStream('deflate-raw'));
  const url = new URL(location.href);
  url.hash = HASH + toB64(packed);
  return url.toString();
}

/** A loose shape check: anything that isn't a plan falls back to the sample instead of breaking the page. */
const isPlan = (v: unknown): v is Plan => {
  const p = v as Plan;
  return !!p && Array.isArray(p.nodes) && Array.isArray(p.walls) && Array.isArray(p.openings) && Array.isArray(p.items);
};

const normalise = (p: Plan): Plan => ({ ...p, rooms: p.rooms ?? {}, north: p.north ?? 0 });

/** Plan to open with: a shared link first, then this browser's last plan, then the sample flat. */
export async function loadInitial(): Promise<{ plan: Plan; from: 'link' | 'saved' | 'sample' }> {
  const hash = location.hash.slice(1);
  if (hash.startsWith(HASH)) {
    try {
      const bytes = await pipe(fromB64(hash.slice(HASH.length)), new DecompressionStream('deflate-raw'));
      const p: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (isPlan(p)) return { plan: normalise(p), from: 'link' };
    } catch {
      // A damaged link: ignore it.
    }
  }
  try {
    const raw = localStorage.getItem(KEY);
    const p: unknown = raw ? JSON.parse(raw) : null;
    if (isPlan(p)) return { plan: normalise(p), from: 'saved' };
  } catch {
    // Storage blocked or corrupt.
  }
  return { plan: samplePlan(), from: 'sample' };
}

let timer = 0;
/** Saves shortly after the last edit. */
export function autosave(p: Plan) {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Private mode or full storage: the plan still works for this visit.
    }
  }, 400);
}

/** Drops the link hash once it has been loaded, so later autosaves aren't shadowed by an old link on reload. */
export function clearLinkHash() {
  if (location.hash.startsWith(`#${HASH}`)) history.replaceState(null, '', location.pathname + location.search);
}
