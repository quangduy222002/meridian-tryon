import { smoothstep } from './math';

export interface ScrollSample {
  /** Shot key of the section the camera is leaving. */
  from: string;
  /** Shot key of the section the camera is heading to. */
  to: string;
  /** 0 → 1 blend between them, eased so the camera holds while a section is centred. */
  t: number;
  /** Index of the section that currently owns the screen. */
  active: number;
}

/**
 * Maps the scroll position to a pair of sections and a blend factor. Section centres are cached and
 * only re-measured on resize, so sampling every frame costs no layout work.
 */
export class ScrollDirector {
  private centers: number[] = [];
  readonly keys: string[];

  constructor(
    readonly sections: HTMLElement[],
    attr = 'data-shot',
  ) {
    this.keys = sections.map((s) => s.getAttribute(attr) ?? '');
    this.measure();
    new ResizeObserver(() => this.measure()).observe(document.documentElement);
    document.fonts?.ready.then(() => this.measure());
  }

  measure() {
    const y = window.scrollY;
    this.centers = this.sections.map((s) => {
      const r = s.getBoundingClientRect();
      return y + r.top + r.height / 2;
    });
  }

  sample(): ScrollSample {
    const probe = window.scrollY + window.innerHeight / 2;
    const c = this.centers;
    let i = 0;
    while (i < c.length - 1 && probe > c[i + 1]!) i++;
    const j = Math.min(i + 1, c.length - 1);
    const raw = j === i || probe <= c[0]! ? 0 : (probe - c[i]!) / (c[j]! - c[i]!);
    const t = smoothstep(0.18, 0.82, raw);
    return { from: this.keys[i]!, to: this.keys[j]!, t, active: t < 0.5 ? i : j };
  }
}
