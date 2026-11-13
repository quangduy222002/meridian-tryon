import { useEffect, useRef, useState, type RefObject } from 'react';

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// 0 → 1 as the element scrolls through the viewport (0 = its top reaches the top of the screen,
// 1 = its bottom reaches the bottom). Used by the sticky story and the horizontal lookbook.
export function useStickyProgress(ref: RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect(),
        span = r.height - innerHeight;
      setP(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    read();
    return () => {
      removeEventListener('scroll', on);
      removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

// true once the element has entered the viewport (for one-time reveals)
export function useInView<T extends HTMLElement>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (reducedMotion()) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return [ref, seen] as const;
}
