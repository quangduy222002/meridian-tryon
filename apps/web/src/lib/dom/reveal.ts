/**
 * Staggered reveal for `[data-rv]` elements and masked headline lines (`[data-rv-mask]`).
 * CSS keeps them visible when JavaScript is off or the user prefers reduced motion.
 */
export function initReveals(root: ParentNode = document) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = root.querySelectorAll<HTMLElement>('[data-rv], [data-rv-mask], [data-rv-group]');
  document.documentElement.classList.add('js-reveal');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const parent = e.target.parentElement;
        const siblings = parent ? [...parent.children].filter((c) => c.matches('[data-rv], [data-rv-mask]')) : [];
        const delay = reduce ? 0 : Math.max(0, siblings.indexOf(e.target)) * 85;
        window.setTimeout(() => e.target.classList.add('rv-in'), delay);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
  );
  items.forEach((el) => io.observe(el));
}
