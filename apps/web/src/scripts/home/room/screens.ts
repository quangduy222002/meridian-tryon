import { CanvasTexture, SRGBColorSpace } from 'three';

type Token = readonly [color: string, text: string];

const CODE: Token[][] = [
  [
    ['#c792ea', 'import'],
    ['#e6e1d9', ' * as THREE '],
    ['#c792ea', 'from'],
    ['#c3e88d', " 'three'"],
  ],
  [],
  [
    ['#c792ea', 'const'],
    ['#82aaff', ' viewer'],
    ['#e6e1d9', ' = '],
    ['#c792ea', 'new'],
    ['#ffcb6b', ' ModelViewer'],
    ['#e6e1d9', '({'],
  ],
  [
    ['#e6e1d9', '  model: '],
    ['#c3e88d', "'hull_block_07.glb'"],
    ['#e6e1d9', ','],
  ],
  [
    ['#e6e1d9', '  sectionCut: '],
    ['#f78c6c', 'true'],
    ['#e6e1d9', ', measure: '],
    ['#f78c6c', 'true'],
  ],
  [['#e6e1d9', '})']],
  [],
  [
    ['#82aaff', 'viewer'],
    ['#e6e1d9', '.'],
    ['#82aaff', 'on'],
    ['#e6e1d9', '('],
    ['#c3e88d', "'pick'"],
    ['#e6e1d9', ', (part) => {'],
  ],
  [
    ['#e6e1d9', '  ui.'],
    ['#82aaff', 'highlight'],
    ['#e6e1d9', '(part.id)'],
  ],
  [
    ['#e6e1d9', '  ui.'],
    ['#82aaff', 'showSpecs'],
    ['#e6e1d9', '(part)'],
  ],
  [['#e6e1d9', '})']],
  [],
  [['#676e95', '// 60 fps on a mid-range phone ✓']],
];

/** Monitor that types code. Redrawn at ~14 Hz, and only while the room is on screen. */
export function createCodeScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const c = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  let typed = 0;
  let last = 0;

  const draw = () => {
    c.fillStyle = '#12151c';
    c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#1a1e28';
    c.fillRect(0, 0, 512, 26);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(16 + i * 16, 13, 5, 0, 7);
      c.fill();
    });
    c.font = '15px ui-monospace, Menlo, monospace';
    let left = typed;
    CODE.forEach((line, li) => {
      let x = 18;
      const y = 52 + li * 21;
      c.fillStyle = '#3c4256';
      c.fillText(String(li + 1).padStart(2), x - 8, y);
      x += 22;
      for (const [col, txt] of line) {
        if (left <= 0) break;
        const t = txt.slice(0, left);
        left -= txt.length;
        c.fillStyle = col;
        c.fillText(t, x, y);
        x += c.measureText(t).width;
      }
      if (left > 0 && line.length === 0) left -= 1;
    });
    if (Math.floor(performance.now() / 500) % 2) {
      c.fillStyle = '#66d3c5';
      c.fillRect(42, 52 + 13 * 21 - 14, 8, 16);
    }
    texture.needsUpdate = true;
  };
  draw();

  return {
    texture,
    update(now: number) {
      if (now - last < 70) return;
      last = now;
      typed = (typed + 1) % 420;
      draw();
    },
  };
}

/** Second monitor: a static wireframe ship drawing. */
export function createShipScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#0d1418';
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = 'rgba(102,211,197,.18)';
  g.lineWidth = 1;
  for (let x = 0; x < 512; x += 24) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 320);
    g.stroke();
  }
  for (let y = 0; y < 320; y += 24) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  g.strokeStyle = '#66d3c5';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(40, 190);
  g.lineTo(90, 236);
  g.lineTo(430, 236);
  g.lineTo(476, 180);
  g.lineTo(40, 180);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(320, 180);
  g.lineTo(320, 118);
  g.lineTo(410, 118);
  g.lineTo(410, 180);
  g.moveTo(336, 118);
  g.lineTo(336, 88);
  g.lineTo(390, 88);
  g.lineTo(390, 118);
  g.stroke();
  g.lineWidth = 1.2;
  for (let x = 110; x < 430; x += 40) {
    g.beginPath();
    g.moveTo(x, 180);
    g.lineTo(x, 236);
    g.stroke();
  }
  g.strokeStyle = '#e3a95c';
  g.setLineDash([5, 5]);
  g.beginPath();
  g.moveTo(40, 262);
  g.lineTo(476, 262);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#e3a95c';
  g.font = '15px ui-monospace, monospace';
  g.fillText('182.4 m', 226, 284);
  g.fillStyle = 'rgba(102,211,197,.85)';
  g.fillRect(150, 196, 60, 28);
  g.fillStyle = '#a7b6b8';
  g.font = '13px ui-monospace, monospace';
  g.fillText('BLOCK 07 · SECTION X-12', 20, 30);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}
