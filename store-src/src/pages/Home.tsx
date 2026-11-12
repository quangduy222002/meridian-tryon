import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCollections, getProducts, type Collection, type ProductCard } from '../lib/shopify';
import { Pic, ProductGrid } from '../ui';

export default function Home() {
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  useEffect(() => { getProducts(8).then(setProducts); getCollections().then(setCollections); }, []);
  const hero = products?.[0];

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Autumn / Winter</span>
          <h1>Made to be <em>worn in.</em></h1>
          <p>Heavyweight basics in honest fabrics — built for every day, not one season.</p>
          <div className="hero-cta">
            <Link to="/collections/all" className="btn">Shop the collection</Link>
            {hero && <Link to={`/products/${hero.handle}`} className="btn ghost">View {hero.title}</Link>}
          </div>
        </div>
        <div className="hero-img">{hero ? <Pic img={hero.featuredImage} sizes="(min-width: 900px) 50vw, 100vw" /> : <div className="pic-empty" />}</div>
      </section>

      {collections.length > 0 && (
        <section className="wrap chips-row">
          {collections.slice(0, 6).map(c => <Link key={c.id} to={`/collections/${c.handle}`} className="chip">{c.title}</Link>)}
        </section>
      )}

      <section className="wrap">
        <div className="sec-head"><h2>Featured</h2><Link to="/collections/all" className="link">View all →</Link></div>
        {products ? <ProductGrid products={products} /> : <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton" />)}</div>}
      </section>
    </main>
  );
}
