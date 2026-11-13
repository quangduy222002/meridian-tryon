import { $, toast, usd } from '../../lib/dom/chrome';
import { easeOutCubic } from '@meridian/three-core/math';
import { CASES, DIALS, STRAPS, priceOf, type Config } from './catalog';

/** Configurator panel. Works before the 3D has loaded; `onChange` drives the model once it is ready. */
export function initConfigurator(onChange: (c: Config) => void) {
  const state: Config = { case: 'titanium', dial: 'midnight', strap: 'leather' };
  let shown = 0;

  const tweenPrice = (to: number) => {
    const from = shown;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 500);
      $('price').textContent = usd(Math.round(from + (to - from) * easeOutCubic(k)));
      if (k < 1) requestAnimationFrame(step);
      else shown = to;
    };
    requestAnimationFrame(step);
  };

  const groups = [
    ['caseOpts', 'case', CASES, (o: (typeof CASES)[keyof typeof CASES]) => o.swatch],
    ['dialOpts', 'dial', DIALS, (o: (typeof DIALS)[keyof typeof DIALS]) => o.color],
    ['strapOpts', 'strap', STRAPS, (o: (typeof STRAPS)[keyof typeof STRAPS]) => o.color],
  ] as const;

  const refresh = () => {
    for (const [id, key] of groups)
      for (const b of $(id).children) {
        const on = (b as HTMLElement).dataset.value === state[key];
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      }
    $('caseLabel').textContent = CASES[state.case].label;
    $('dialLabel').textContent = DIALS[state.dial].label;
    $('strapLabel').textContent = STRAPS[state.strap].label;
    const price = priceOf(state);
    tweenPrice(price);
    $('finalPrice').textContent = usd(price);
    $('summary').textContent = `${CASES[state.case].label.split(' ').pop()} · ${DIALS[state.dial].label}`;
    onChange(state);
  };

  for (const [id, key, options, color] of groups) {
    for (const [value, o] of Object.entries(options)) {
      const b = document.createElement('button');
      b.className = 'sw';
      b.type = 'button';
      b.style.background = (color as (x: typeof o) => string)(o);
      b.dataset.value = value;
      b.setAttribute('aria-label', o.label);
      b.title = o.label;
      b.addEventListener('click', () => {
        (state as unknown as Record<string, string>)[key] = value;
        refresh();
      });
      $(id).appendChild(b);
    }
  }
  refresh();

  $('preorder').addEventListener('click', () =>
    toast(
      `Reserved: Halo 01 · ${CASES[state.case].label} · ${DIALS[state.dial].label} · ${STRAPS[state.strap].label}`,
      2800,
    ),
  );
  return { get: () => state, refresh };
}

/** Polar instruments: needle sweep and counter run once, when they scroll into view. */
export function initGauges(root: HTMLElement | null) {
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      root.querySelectorAll<HTMLElement>('.gauge').forEach((g, i) => {
        const v = Number(g.dataset.v);
        const ang = (270 * v) / Number(g.dataset.max);
        setTimeout(
          () => {
            g.querySelector<HTMLElement>('.g-needle')!.style.rotate = `${-135 + ang}deg`;
            g.querySelector<HTMLElement>('.g-face')!.style.setProperty('--fill', `${ang}deg`);
            const cnt = g.querySelector('.cnt')!;
            const t0 = performance.now();
            const step = (now: number) => {
              const k = reduce ? 1 : Math.min(1, (now - t0) / 1600);
              cnt.textContent = String(Math.round(v * easeOutCubic(k)));
              if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          },
          reduce ? 0 : 200 + i * 160,
        );
      });
    },
    { threshold: 0.4 },
  );
  io.observe(root);
}

/** Brushed-metal buttons: the highlight follows the pointer and a press leaves a ripple. */
export function initMetalButtons() {
  document.querySelectorAll<HTMLElement>('[data-metal]').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${e.clientX - r.left}px`);
      b.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
    b.addEventListener('pointerdown', (e) => {
      const r = b.getBoundingClientRect();
      const s = document.createElement('span');
      s.className = 'rip';
      s.style.left = `${e.clientX - r.left}px`;
      s.style.top = `${e.clientY - r.top}px`;
      b.appendChild(s);
      setTimeout(() => s.remove(), 900);
    });
  });
}
