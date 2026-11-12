// Horizontal lookbook: on desktop the page scroll drives the row sideways (each photo also
// drifts inside its frame); on phones it's a native swipe row with snap points.
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ProductCard } from './lib/shopify';
import { Pic, Price } from './ui';
import { useStickyProgress } from './scroll';

export default function Lookbook({ products }: { products: ProductCard[] }) {
  const section = useRef<HTMLElement>(null);
  const p = useStickyProgress(section);
  const looks = products.slice(0, 6);
  // the track is ~ (n × 38vw); move it so the last frame ends at the right edge
  const shift = `calc(${-p} * (${looks.length} * (38vw + 24px) + 46vw - 100vw))`;
  return (
    <section className="look" ref={section} style={{ ['--n' as string]: looks.length }}>
      <div className="look-sticky">
        <div className="look-head wrap">
          <h2>The winter edit</h2>
          <p>Pieces we reach for when the mornings turn sharp.</p>
        </div>
        <div className="look-track" style={{ transform: `translate3d(${shift}, 0, 0)` }}>
          <div className="look-intro">Worn<br />in, not<br />worn out.</div>
          {looks.map((pr, i) => (
            <Link key={pr.id} to={`/products/${pr.handle}`} className="look-card" style={{ ['--i' as string]: i }}>
              <div className="look-img"><div className="look-drift" style={{ transform: `translate3d(${(p * looks.length - i) * -4}%, 0, 0) scale(1.15)` }}><Pic img={pr.images?.nodes[1] ?? pr.featuredImage} sizes="40vw" /></div></div>
              <div className="look-meta"><b>{pr.title}</b><Price m={pr.priceRange.minVariantPrice} /></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
