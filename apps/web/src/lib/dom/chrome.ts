/** Sticky glass navigation: turns solid once the page scrolls. */
export function initStickyNav(nav: HTMLElement | null) {
  if (!nav) return;
  const update = () => nav.classList.toggle('stuck', window.scrollY > 40);
  addEventListener('scroll', update, { passive: true });
  update();
}

/** Highlights the chapter rail link for the section at the middle of the viewport. */
export function initRail(rail: HTMLElement | null) {
  if (!rail) return;
  const links = [...rail.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const sections = links.map((a) => document.getElementById(a.hash.slice(1)));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = sections.indexOf(e.target as HTMLElement);
        links.forEach((a, j) => a.classList.toggle('on', j === i));
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  sections.forEach((s) => s && io.observe(s));
}

/** Soft cursor ring on fine pointers; grows over anything marked `data-cursor`. */
export function initCursor(el: HTMLElement | null) {
  if (!el || matchMedia('(hover: none)').matches) return;
  let tx = innerWidth / 2;
  let ty = innerHeight / 2;
  let x = tx;
  let y = ty;
  let raf = 0;
  const loop = () => {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener(
    'pointermove',
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      el.classList.add('on');
      if (!raf) raf = requestAnimationFrame(loop);
    },
    { passive: true },
  );
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element | null;
    el.classList.toggle('act', !!t?.closest?.('[data-cursor], .pin'));
  });
}

let toastTimer = 0;
/** Small confirmation message at the bottom of the screen. */
export function toast(message: string, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = message;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), ms);
}

export const usd = (n: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
