import { BufferGeometry, Group, LineBasicMaterial, LineDashedMaterial, LineSegments, Vector3 } from 'three';

/**
 * Print-ready dieline drawn over the flat blank: solid lines are cuts, dashed lines are folds.
 * Rebuilt only when the size changes; fades in while the box is unfolded.
 */
export function createDieline() {
  const group = new Group();
  const cutMat = new LineBasicMaterial({ color: '#1f1d1a', transparent: true });
  const foldMat = new LineDashedMaterial({ color: '#c2410c', dashSize: 0.05, gapSize: 0.035, transparent: true });
  let cut: LineSegments | null = null;
  let fold: LineSegments | null = null;
  const anchors = { width: new Vector3(), depth: new Vector3(), height: new Vector3() };

  const seg = (out: number[], x1: number, z1: number, x2: number, z2: number, y: number) =>
    out.push(x1, y, z1, x2, y, z2);

  function rebuild(W: number, H: number, D: number, tuck: number, th: number) {
    if (cut) {
      cut.geometry.dispose();
      fold!.geometry.dispose();
      group.remove(cut, fold!);
    }
    const y = th + 0.004;
    const c: number[] = [];
    const f: number[] = [];
    const w = W / 2;
    const d = D / 2;
    const zLid = -d - H;
    const zTuck = zLid - D;
    // folds: every edge of the base, back→lid, lid→tuck
    seg(f, -w, d, w, d, y);
    seg(f, -w, -d, w, -d, y);
    seg(f, -w, -d + th, -w, d - th, y);
    seg(f, w, -d + th, w, d - th, y);
    seg(f, -w, zLid, w, zLid, y);
    seg(f, -w + th, zTuck, w - th, zTuck, y);
    // cuts: the outline of every flap
    seg(c, -w, d, -w, d + H, y);
    seg(c, w, d, w, d + H, y);
    seg(c, -w, d + H, w, d + H, y);
    seg(c, -w, -d, -w, zTuck, y);
    seg(c, w, -d, w, zTuck, y);
    seg(c, -w + th, zTuck, -w + th, zTuck - tuck, y);
    seg(c, w - th, zTuck, w - th, zTuck - tuck, y);
    seg(c, -w + th, zTuck - tuck, w - th, zTuck - tuck, y);
    for (const s of [-1, 1]) {
      seg(c, s * (w + H), -d + th, s * (w + H), d - th, y);
      seg(c, s * w, d - th, s * (w + H), d - th, y);
      seg(c, s * w, -d + th, s * (w + H), -d + th, y);
    }
    cut = new LineSegments(new BufferGeometry().setFromPoints(toVec(c)), cutMat);
    fold = new LineSegments(new BufferGeometry().setFromPoints(toVec(f)), foldMat);
    fold.computeLineDistances();
    group.add(cut, fold);
    anchors.width.set(0, y, d + H + 0.25);
    anchors.depth.set(w + H + 0.25, y, 0);
    anchors.height.set(-w - 0.25, y, d + H / 2);
  }

  function setOpacity(o: number) {
    cutMat.opacity = foldMat.opacity = o;
    group.visible = o > 0.01;
  }

  return { group, rebuild, setOpacity, anchors };
}

function toVec(a: number[]) {
  const out: Vector3[] = [];
  for (let i = 0; i < a.length; i += 3) out.push(new Vector3(a[i], a[i + 1], a[i + 2]));
  return out;
}
