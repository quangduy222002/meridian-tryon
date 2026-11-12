// Giant type that drifts sideways; scrolling pushes it faster and flips its direction.
import { useEffect, useRef } from 'react';
import { reducedMotion } from './scroll';

const WORDS = ['Heavyweight fleece', 'Organic cotton', 'Garment dyed', 'Repairs for life', 'Small runs'];

export default function Marquee() {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current; if (!el || reducedMotion()) return;
    let x = 0, dir = -1, boost = 0, lastY = scrollY, raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const dy = scrollY - lastY; lastY = scrollY;
      if (dy) { dir = dy > 0 ? -1 : 1; boost = Math.min(14, boost + Math.abs(dy) * 0.08); }
      boost *= Math.pow(0.08, dt);
      x += dir * (40 + boost * 60) * dt;
      const half = el.scrollWidth / 2;
      if (x <= -half) x += half; if (x > 0) x -= half;
      el.style.transform = `translate3d(${x}px,0,0) skewX(${dir * -boost * 0.6}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const row = WORDS.flatMap((w, i) => [<span key={w} className={i % 2 ? 'mq-word outline' : 'mq-word'}>{w}</span>, <Star key={w + '*'} />]);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track" ref={track}>{row}{row.map((n, i) => <span key={'b' + i} style={{ display: 'contents' }}>{n}</span>)}</div>
    </div>
  );
}

const Star = () => <svg className="mq-star" viewBox="0 0 40 40"><path d="M20 0v40M0 20h40M6 6l28 28M34 6L6 34" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>;
