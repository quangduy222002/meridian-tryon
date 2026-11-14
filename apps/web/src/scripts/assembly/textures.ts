/** Procedural textures for the PC build guide, painted in a worker. */
import { rand32, type SpecMap } from '@meridian/three-core';

export const assemblySpecs = (size: number): SpecMap => ({
  /** Black motherboard PCB: copper traces at 45°, vias and silkscreen footprints. */
  pcb: {
    width: Math.round(size * 0.8),
    height: size,
    srgb: true,
    paint(c, w, h) {
      c.fillStyle = '#121416';
      c.fillRect(0, 0, w, h);
      const r = rand32(7);
      c.lineCap = c.lineJoin = 'round';
      // Traces: short runs that turn by 45° like a real router would lay them.
      for (let i = 0; i < 520; i++) {
        let x = r() * w;
        let y = r() * h;
        let dir = Math.floor(r() * 8);
        c.strokeStyle = r() < 0.12 ? 'rgba(120,128,138,0.55)' : 'rgba(58,64,72,0.75)';
        c.lineWidth = 0.6 + r() * 1.6;
        c.beginPath();
        c.moveTo(x, y);
        const segs = 2 + Math.floor(r() * 4);
        for (let s = 0; s < segs; s++) {
          const len = 8 + r() * (w * 0.08);
          const a = (dir * Math.PI) / 4;
          x += Math.cos(a) * len;
          y += Math.sin(a) * len;
          c.lineTo(x, y);
          dir = (dir + (r() < 0.5 ? 1 : 7)) % 8;
        }
        c.stroke();
      }
      // Vias
      for (let i = 0; i < 900; i++) {
        c.fillStyle = r() < 0.3 ? '#8a8f96' : '#3c4148';
        c.beginPath();
        c.arc(r() * w, r() * h, 0.8 + r() * 1.4, 0, Math.PI * 2);
        c.fill();
      }
      // Silkscreen footprints for small parts
      c.strokeStyle = 'rgba(210,214,220,0.35)';
      c.lineWidth = 1;
      for (let i = 0; i < 160; i++) {
        const fw = 4 + r() * 18;
        const fh = 3 + r() * 10;
        c.strokeRect(r() * w, r() * h, fw, fh);
      }
      // Accent stripes and board name
      c.fillStyle = 'rgba(46,230,255,0.22)';
      c.fillRect(w * 0.06, h * 0.93, w * 0.5, h * 0.006);
      c.fillStyle = 'rgba(220,224,230,0.6)';
      c.font = `700 ${Math.round(w * 0.045)}px sans-serif`;
      c.fillText('FORGE X1 · ATX', w * 0.06, h * 0.915);
      // Mounting holes
      c.fillStyle = '#b7bcc3';
      for (const [hx, hy] of [
        [0.04, 0.04],
        [0.96, 0.04],
        [0.04, 0.5],
        [0.96, 0.5],
        [0.04, 0.96],
        [0.96, 0.96],
      ] as const) {
        c.beginPath();
        c.arc(hx * w, hy * h, w * 0.016, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#111';
        c.beginPath();
        c.arc(hx * w, hy * h, w * 0.008, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#b7bcc3';
      }
    },
  },
  /** Perforated steel mesh for the front and top panels. */
  mesh: {
    width: 128,
    height: 128,
    srgb: true,
    paint(c, w, h) {
      c.fillStyle = '#24272d';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#060708';
      const step = w / 8;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          const x = col * step + (row % 2 ? step / 2 : 0);
          const y = row * step * 0.866 * 1.155;
          c.beginPath();
          c.arc(x, y, step * 0.36, 0, Math.PI * 2);
          c.fill();
        }
      }
    },
  },
  /** PSU fan grill: rings and spokes. */
  grill: {
    width: 256,
    height: 256,
    srgb: true,
    paint(c, w, h) {
      c.fillStyle = '#0a0b0d';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#5b616a';
      c.lineWidth = 3;
      for (let i = 1; i <= 9; i++) {
        c.beginPath();
        c.arc(w / 2, h / 2, (i / 9) * w * 0.47, 0, Math.PI * 2);
        c.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 4;
        c.beginPath();
        c.moveTo(w / 2 - Math.cos(a) * w * 0.47, h / 2 - Math.sin(a) * h * 0.47);
        c.lineTo(w / 2 + Math.cos(a) * w * 0.47, h / 2 + Math.sin(a) * h * 0.47);
        c.stroke();
      }
    },
  },
  /** PSU side sticker. */
  label: {
    width: 512,
    height: 256,
    srgb: true,
    paint(c, w, h) {
      c.fillStyle = '#16181c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#2ee6ff';
      c.fillRect(0, h * 0.78, w, h * 0.04);
      c.fillStyle = '#f2f4f7';
      c.font = `800 ${Math.round(h * 0.3)}px sans-serif`;
      c.fillText('FORGE', w * 0.08, h * 0.45);
      c.font = `600 ${Math.round(h * 0.14)}px sans-serif`;
      c.fillStyle = '#9aa1ab';
      c.fillText('850 W  ·  80+ GOLD  ·  MODULAR', w * 0.08, h * 0.66);
    },
  },
  /** Wordmark on a transparent background (GPU backplate, PSU shroud). */
  logo: {
    width: 512,
    height: 128,
    srgb: true,
    paint(c, w, h) {
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#e9edf2';
      c.font = `800 ${Math.round(h * 0.62)}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('F O R G E', w / 2, h / 2);
    },
  },
  /** Braided cable sleeve. */
  sleeve: {
    width: 64,
    height: 64,
    repeat: [60, 2],
    srgb: true,
    paint(c, w, h) {
      c.fillStyle = '#0b0c0e';
      c.fillRect(0, 0, w, h);
      c.lineWidth = 5;
      for (let i = -2; i < 6; i++) {
        c.strokeStyle = i % 2 ? '#2b2f36' : '#1a1d22';
        c.beginPath();
        c.moveTo(i * 16, 0);
        c.lineTo(i * 16 + 32, h);
        c.stroke();
        c.strokeStyle = 'rgba(46,230,255,0.35)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(i * 16 + 32, 0);
        c.lineTo(i * 16, h);
        c.stroke();
        c.lineWidth = 5;
      }
    },
  },
  /** Soft contact shadow under the case. */
  contact: {
    width: 256,
    height: 256,
    paint(c, w, h) {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(0.55, 'rgb(150,150,150)');
      g.addColorStop(1, 'rgb(0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    },
  },
});

export type AssemblyTexture = 'pcb' | 'mesh' | 'grill' | 'label' | 'logo' | 'sleeve' | 'contact';
