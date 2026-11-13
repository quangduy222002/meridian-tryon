/** Procedural board textures for the box studio, painted in a worker. */
import { rand32, type SpecMap } from '@meridian/three-core';

export const boxSpecs = (size: number): SpecMap => ({
  /** Paperboard surface: fine fibres and mottling in greyscale, tinted by the board colour. */
  fibre: {
    width: size,
    height: size,
    repeat: [2, 2],
    srgb: true,
    paint(c, w, h) {
      c.fillStyle = 'rgb(236,236,236)';
      c.fillRect(0, 0, w, h);
      const r = rand32(41);
      // soft mottling
      for (let i = 0; i < 260; i++) {
        const x = r() * w;
        const y = r() * h;
        const rad = 20 + r() * 80;
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        const v = r() < 0.5 ? '255,255,255' : '190,190,190';
        g.addColorStop(0, `rgba(${v},0.12)`);
        g.addColorStop(1, `rgba(${v},0)`);
        c.fillStyle = g;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      // fibres
      c.lineCap = 'round';
      for (let i = 0; i < 2600; i++) {
        const x = r() * w;
        const y = r() * h;
        const a = r() * Math.PI;
        const len = 3 + r() * 14;
        const v = r() < 0.7 ? 150 + r() * 60 : 250;
        c.strokeStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`;
        c.lineWidth = 0.5 + r() * 0.8;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(
          x + Math.cos(a + 0.6) * len * 0.5,
          y + Math.sin(a + 0.6) * len * 0.5,
          x + Math.cos(a) * len,
          y + Math.sin(a) * len,
        );
        c.stroke();
      }
    },
  },
  /** Corrugated board seen edge-on: two liners with the fluted medium between them. */
  flute: {
    width: 256,
    height: 32,
    repeat: [14, 1],
    srgb: true,
    paint(c, w, h) {
      c.fillStyle = '#6e5233';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#c9a275';
      c.fillRect(0, 0, w, h * 0.16);
      c.fillRect(0, h * 0.84, w, h * 0.16);
      c.strokeStyle = '#c9a275';
      c.lineWidth = h * 0.09;
      c.beginPath();
      const waves = 8;
      for (let x = 0; x <= w; x++) {
        const y = h / 2 + Math.sin((x / w) * waves * Math.PI * 2) * h * 0.3;
        if (x) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    },
  },
  /** Soft contact shadow used as an alpha map under the box. */
  contact: {
    width: 256,
    height: 256,
    paint(c, w, h) {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(0.5, 'rgb(140,140,140)');
      g.addColorStop(1, 'rgb(0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    },
  },
});

export type BoxTexture = 'fibre' | 'flute' | 'contact';
