/**
 * Finish textures for the room planner, painted in a worker. They are near-white so one texture serves many colours
 * (the material's colour tints it). Each tile covers 2 × 2 m of floor or wall.
 */
import { rand32, type Ctx2D, type SpecMap } from '@meridian/three-core';

export const TILE_METRES = 2;

const noise = (c: Ctx2D, w: number, h: number, seed: number, n: number, alpha: number, size = 2) => {
  const r = rand32(seed);
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? 0 : 255;
    c.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    c.fillRect(r() * w, r() * h, size, size);
  }
};

export const roomSpecs = (size: number): SpecMap => ({
  /** Floor planks: 8 boards across 2 m, staggered joints and grain. */
  planks: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      const r = rand32(3);
      const rows = 10;
      const bh = h / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * w * 0.6;
        while (x < w) {
          const bw = w * (0.35 + r() * 0.45);
          const v = 205 + Math.floor(r() * 40);
          c.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
          c.fillRect(x, i * bh, bw, bh);
          // grain
          for (let g = 0; g < 14; g++) {
            const y = i * bh + r() * bh;
            c.strokeStyle = `rgba(90,70,50,${0.05 + r() * 0.08})`;
            c.lineWidth = 0.6 + r();
            c.beginPath();
            c.moveTo(x, y);
            c.bezierCurveTo(x + bw * 0.3, y + (r() - 0.5) * 4, x + bw * 0.7, y + (r() - 0.5) * 4, x + bw, y);
            c.stroke();
          }
          c.fillStyle = 'rgba(60,45,30,0.45)';
          c.fillRect(x, i * bh, 1.5, bh);
          x += bw;
        }
        c.fillStyle = 'rgba(60,45,30,0.35)';
        c.fillRect(0, i * bh, w, 1.5);
      }
    },
  },
  /** 60 cm tiles with grout (also used, tinted, for zellige walls). */
  tile: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      const n = 4;
      const r = rand32(5);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const v = 232 + Math.floor(r() * 18);
          c.fillStyle = `rgb(${v},${v},${v})`;
          c.fillRect((i * w) / n, (j * h) / n, w / n, h / n);
        }
      noise(c, w, h, 9, 3000, 0.05);
      c.fillStyle = 'rgba(120,115,108,0.55)';
      for (let i = 0; i <= n; i++) {
        c.fillRect((i * w) / n - 1.5, 0, 3, h);
        c.fillRect(0, (i * h) / n - 1.5, w, 3);
      }
    },
  },
  terrazzo: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      c.fillStyle = '#f2f0ec';
      c.fillRect(0, 0, w, h);
      const r = rand32(11);
      const chips = ['#9a8f86', '#c46f4f', '#6f7d72', '#d9c7a8', '#4f4a46'];
      for (let i = 0; i < 1400; i++) {
        c.fillStyle = chips[Math.floor(r() * chips.length)]!;
        const x = r() * w;
        const y = r() * h;
        const s = 1.5 + r() * 6;
        c.beginPath();
        c.moveTo(x, y);
        for (let k = 0; k < 5; k++) c.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
        c.fill();
      }
    },
  },
  concrete: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      c.fillStyle = '#ededed';
      c.fillRect(0, 0, w, h);
      const r = rand32(17);
      for (let i = 0; i < 160; i++) {
        const x = r() * w;
        const y = r() * h;
        const rad = 20 + r() * 90;
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        const v = r() < 0.5 ? '255,255,255' : '170,170,170';
        g.addColorStop(0, `rgba(${v},0.18)`);
        g.addColorStop(1, `rgba(${v},0)`);
        c.fillStyle = g;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      noise(c, w, h, 19, 9000, 0.12, 1.5);
    },
  },
  carpet: {
    width: 256,
    height: 256,
    srgb: true,
    repeat: [1, 1],
    paint(c, w, h) {
      c.fillStyle = '#ececec';
      c.fillRect(0, 0, w, h);
      noise(c, w, h, 23, 26000, 0.2, 1);
    },
  },
  /** Brick slips in stretcher bond. */
  brick: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      c.fillStyle = '#d8d2c8';
      c.fillRect(0, 0, w, h);
      const r = rand32(29);
      const rows = 30; // 2 m / ~6.7 cm courses
      const bh = h / rows;
      const bw = w / 9;
      for (let i = 0; i < rows; i++) {
        const off = i % 2 ? bw / 2 : 0;
        for (let x = -off; x < w; x += bw) {
          const v = 205 + Math.floor(r() * 50);
          c.fillStyle = `rgb(${v},${v - 6},${v - 12})`;
          c.fillRect(x + 1.5, i * bh + 1.5, bw - 3, bh - 3);
        }
      }
      noise(c, w, h, 31, 6000, 0.12);
    },
  },
  /** Oak in a herringbone pattern: 7 × 42 cm blades at 45°. */
  herringbone: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      const r = rand32(37);
      const bw = w / 28; // blade width (7 cm on a 2 m tile)
      const bl = bw * 6;
      c.fillStyle = '#d8c6a8';
      c.fillRect(0, 0, w, h);
      for (let col = -2; col < w / bl + 2; col++)
        for (let row = -4; row < h / bw + 4; row++)
          for (const side of [0, 1]) {
            c.save();
            const x = col * bl * Math.SQRT1_2 * 2 + (side ? bl * Math.SQRT1_2 : 0);
            const y = row * bw * Math.SQRT2;
            c.translate(x, y);
            c.rotate(side ? -Math.PI / 4 : Math.PI / 4);
            const v = 200 + Math.floor(r() * 45);
            c.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
            c.fillRect(0, 0, bl, bw);
            c.fillStyle = 'rgba(60,45,30,0.35)';
            c.fillRect(0, 0, bl, 1.2);
            c.fillRect(0, 0, 1.2, bw);
            for (let g = 0; g < 3; g++) {
              c.fillStyle = `rgba(90,70,50,${0.05 + r() * 0.06})`;
              c.fillRect(0, r() * bw, bl, 0.8);
            }
            c.restore();
          }
    },
  },
  /** Honed white marble with soft grey veins. */
  marble: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      c.fillStyle = '#f4f2ee';
      c.fillRect(0, 0, w, h);
      const r = rand32(41);
      for (let v = 0; v < 18; v++) {
        let x = r() * w;
        let y = r() * h;
        c.strokeStyle = `rgba(110,110,115,${0.08 + r() * 0.18})`;
        c.lineWidth = 0.6 + r() * 2.2;
        c.beginPath();
        c.moveTo(x, y);
        for (let k = 0; k < 14; k++) {
          x += (r() - 0.3) * w * 0.08;
          y += (r() - 0.5) * h * 0.08;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      noise(c, w, h, 43, 6000, 0.04, 2);
      // 60 × 120 cm slabs
      c.fillStyle = 'rgba(150,150,150,0.35)';
      for (let i = 0; i <= 2; i++) c.fillRect(0, (i * h) / 2 - 1, w, 2);
      for (let i = 0; i <= 4; i++) c.fillRect((i * w) / 4 - 1, 0, 2, h);
    },
  },
  /** Vietnamese cement tiles (gạch bông): 20 cm tiles with a four-petal motif in indigo, jade and cream. */
  encaustic: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      const n = 10;
      const t = w / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = i * t;
          const y = j * t;
          c.fillStyle = '#ece4d3';
          c.fillRect(x, y, t, t);
          c.fillStyle = '#2f4f5e';
          c.fillRect(x + t * 0.04, y + t * 0.04, t * 0.92, t * 0.92);
          c.fillStyle = '#ece4d3';
          c.fillRect(x + t * 0.1, y + t * 0.1, t * 0.8, t * 0.8);
          // four petals and a centre
          c.fillStyle = '#3f7a6b';
          for (const [px, py] of [
            [0.5, 0.22],
            [0.78, 0.5],
            [0.5, 0.78],
            [0.22, 0.5],
          ] as const) {
            c.beginPath();
            c.ellipse(x + t * px, y + t * py, t * 0.12, t * 0.2, px === 0.5 ? 0 : Math.PI / 2, 0, Math.PI * 2);
            c.fill();
          }
          c.fillStyle = '#c9785a';
          c.beginPath();
          c.arc(x + t / 2, y + t / 2, t * 0.09, 0, Math.PI * 2);
          c.fill();
          // corner quarter-circles meet across tiles
          c.fillStyle = '#2f4f5e';
          for (const [cx, cy] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ] as const) {
            c.beginPath();
            c.arc(x + t * cx, y + t * cy, t * 0.16, 0, Math.PI * 2);
            c.fill();
          }
          c.fillStyle = 'rgba(80,70,60,0.5)';
          c.fillRect(x, y, t, 1);
          c.fillRect(x, y, 1, t);
        }
      noise(c, w, h, 47, 5000, 0.06, 2);
    },
  },
  /** Vertical timber slats, 4 cm wide with 2 cm shadow gaps. */
  slats: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      c.fillStyle = '#4a3a2c';
      c.fillRect(0, 0, w, h);
      const r = rand32(53);
      const n = 34;
      const p = w / n;
      for (let i = 0; i < n; i++) {
        const v = 205 + Math.floor(r() * 35);
        c.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
        c.fillRect(i * p, 0, p * 0.68, h);
        for (let g = 0; g < 4; g++) {
          c.fillStyle = `rgba(90,70,50,${0.05 + r() * 0.07})`;
          c.fillRect(i * p + r() * p * 0.6, 0, 0.8, h);
        }
      }
    },
  },
  /** Classic wall panelling: a dado rail at 90 cm, raised panels below and moulded frames above. */
  panel: {
    width: size,
    height: size,
    srgb: true,
    repeat: [1 / TILE_METRES, 1 / TILE_METRES],
    paint(c, w, h) {
      c.fillStyle = '#f2ede4';
      c.fillRect(0, 0, w, h);
      const m = w / 200; // px per cm
      const frame = (x: number, y: number, fw: number, fh: number) => {
        c.strokeStyle = 'rgba(120,105,85,0.55)';
        c.lineWidth = 2.2 * m;
        c.strokeRect(x, y, fw, fh);
        c.strokeStyle = 'rgba(255,255,255,0.8)';
        c.lineWidth = 1 * m;
        c.strokeRect(x + 1.6 * m, y + 1.6 * m, fw - 3.2 * m, fh - 3.2 * m);
      };
      // The texture runs bottom-up in v; y = h is the floor.
      const dado = h - 90 * m;
      c.fillStyle = 'rgba(120,105,85,0.5)';
      c.fillRect(0, dado - 2 * m, w, 4 * m);
      for (let i = 0; i < 2; i++) {
        frame(i * 100 * m + 10 * m, dado + 14 * m, 80 * m, 60 * m);
        frame(i * 100 * m + 10 * m, 12 * m, 80 * m, dado - 30 * m);
      }
    },
  },
  /** Soft contact shadow, as an alpha map under the building. */
  contact: {
    width: 128,
    height: 128,
    paint(c, w, h) {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(0.6, 'rgb(120,120,120)');
      g.addColorStop(1, 'rgb(0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    },
  },
});

export type RoomTexture =
  | 'planks'
  | 'tile'
  | 'terrazzo'
  | 'concrete'
  | 'carpet'
  | 'brick'
  | 'herringbone'
  | 'marble'
  | 'encaustic'
  | 'slats'
  | 'panel'
  | 'contact';
