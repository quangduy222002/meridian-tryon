/**
 * Procedural texture painters. They only use the 2D canvas API, so the same code runs inside a
 * Web Worker (OffscreenCanvas) or on the main thread as a fallback.
 */
import { TAU, rand32 } from '../../lib/math';

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface TextureSpec {
  width: number;
  height: number;
  paint: (c: Ctx2D, w: number, h: number) => void;
}

/** Radial brushing: streaks run along U, so on a lathe they follow the circumference. */
export const brush: TextureSpec = {
  width: 16,
  height: 1024,
  paint(c, w, h) {
    const r = rand32(7);
    for (let y = 0; y < h; y++) {
      const v = Math.round(170 + r() * 85);
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(0, y, w, 1);
    }
  },
};

/** Guilloché rosette dial in greyscale; the dial colour tints it so colour changes can ease smoothly. */
export const dial = (size: number): TextureSpec => ({
  width: size,
  height: size,
  paint(c, S) {
    const C = S / 2;
    const R = S / 2;
    c.fillStyle = '#9d9d9d';
    c.fillRect(0, 0, S, S);
    for (let i = 0; i < 720; i++) {
      const a = (i / 720) * TAU;
      c.strokeStyle = `rgba(255,255,255,${0.05 + (i % 2) * 0.05})`;
      c.lineWidth = S / 900;
      c.beginPath();
      c.moveTo(C, C);
      c.lineTo(C + Math.cos(a) * R, C + Math.sin(a) * R);
      c.stroke();
    }
    // Epitrochoid family, phase-shifted: x = a·cos t + d·cos(m·t + φ), y = a·sin t − d·sin(m·t + φ)
    const rosette = (A: number, d: number, m: number, n: number, style: string, lw: number, phase = 0) => {
      c.strokeStyle = style;
      c.lineWidth = lw;
      c.beginPath();
      for (let k = 0; k < n; k++) {
        const phi = (k / n) * TAU + phase;
        const a = A * (1 - (0.04 * k) / n);
        for (let i = 0; i <= 900; i++) {
          const t = (i / 900) * TAU;
          const x = C + (a * Math.cos(t) + d * Math.cos(m * t + phi)) * R;
          const y = C + (a * Math.sin(t) - d * Math.sin(m * t + phi)) * R;
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
      }
      c.stroke();
    };
    rosette(0.38, 0.05, 24, 96, 'rgba(255,255,255,.62)', S / 900);
    rosette(0.2, 0.035, 12, 48, 'rgba(255,255,255,.55)', S / 900);
    // Shadowed counter-pass gives the engraved relief
    c.globalCompositeOperation = 'multiply';
    rosette(0.38, 0.05, 24, 96, 'rgba(0,0,0,.32)', S / 1200, 0.02);
    c.globalCompositeOperation = 'source-over';
    // Smooth outer chapter ring with fine azurage circles
    c.fillStyle = '#b4b4b4';
    c.beginPath();
    c.arc(C, C, R * 0.97, 0, TAU);
    c.arc(C, C, R * 0.6, 0, TAU, true);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.12)';
    c.lineWidth = S / 1600;
    for (let r = 0.61; r < 0.97; r += 0.006) {
      c.beginPath();
      c.arc(C, C, R * r, 0, TAU);
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = S / 500;
    for (const r of [0.6, 0.97]) {
      c.beginPath();
      c.arc(C, C, R * r, 0, TAU);
      c.stroke();
    }
  },
});

/** Perlage (circular graining) for the mainplate. */
export const perlage: TextureSpec = {
  width: 512,
  height: 512,
  paint(c) {
    c.fillStyle = '#9a9a9a';
    c.fillRect(0, 0, 512, 512);
    const r = rand32(3);
    for (let y = -20; y < 540; y += 22)
      for (let x = -20; x < 540; x += 22) {
        const g = c.createRadialGradient(x + 4, y + 4, 1, x, y, 17);
        g.addColorStop(0, 'rgba(255,255,255,.55)');
        g.addColorStop(0.6, 'rgba(120,120,120,.2)');
        g.addColorStop(1, 'rgba(60,60,60,.35)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3, 17, 0, TAU);
        c.fill();
      }
  },
};

/** Côtes de Genève stripes for the rotor and bridges. */
export const cotes: TextureSpec = {
  width: 256,
  height: 512,
  paint(c, w) {
    for (let i = 0; i < 12; i++) {
      const g = c.createLinearGradient(0, i * 43, 0, i * 43 + 43);
      g.addColorStop(0, '#8a8a8a');
      g.addColorStop(0.45, '#f2f2f2');
      g.addColorStop(1, '#7a7a7a');
      c.fillStyle = g;
      c.fillRect(0, i * 43, w, 43);
    }
  },
};

/** Leather / suede grain used as a bump map. */
export const grain: TextureSpec = {
  width: 256,
  height: 256,
  paint(c, w, h) {
    const r = rand32(11);
    const d = c.createImageData(w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 120 + r() * 100;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    c.putImageData(d, 0, 0);
  },
};

/** Engraved caseback ring text. */
export const engrave: TextureSpec = {
  width: 1024,
  height: 1024,
  paint(c) {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 1024, 1024);
    c.translate(512, 512);
    c.fillStyle = '#7d7d7d';
    c.font = '500 30px ui-monospace, Menlo, monospace';
    const text = 'MERIDIAN · CALIBRE M-01 · 26 JEWELS · 28,800 VPH · GRADE 5 TITANIUM · ';
    for (let i = 0; i < text.length; i++) {
      c.save();
      c.rotate((i / text.length) * TAU);
      c.fillText(text[i]!, 0, -455);
      c.restore();
    }
  },
};

/** Printed seconds track on the inner flange (rehaut). */
export const rehaut: TextureSpec = {
  width: 2048,
  height: 64,
  paint(c, w, h) {
    c.fillStyle = '#d8d8d8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#444';
    for (let i = 0; i < 240; i++) {
      const big = i % 20 === 0;
      c.fillRect((i / 240) * w, big ? 10 : 26, big ? 6 : 3, h);
    }
  },
};

export const specs = (dialSize: number) => ({ brush, dial: dial(dialSize), perlage, cotes, grain, engrave, rehaut });
export type TextureName = keyof ReturnType<typeof specs>;

/**
 * Paints a spec upside down, so the result can be uploaded with `flipY = false`
 * (ImageBitmaps ignore WebGL's flip flag, and this keeps worker and fallback identical).
 */
export function paintFlipped(c: Ctx2D, spec: TextureSpec) {
  c.setTransform(1, 0, 0, -1, 0, spec.height);
  spec.paint(c, spec.width, spec.height);
}
