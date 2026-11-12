import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCollection, getCollections, getProducts, type Collection, type ProductCard } from '../lib/shopify';
import { GridSkeleton, Pic, ProductGrid } from '../ui';

type Tile = Collection & { cover?: ProductCard };

export default function Home() {
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  useEffect(() => {
    getProducts(8).then(setProducts);
    getCollections().then(async cs => {
      const picked = cs.filter(c => !/^(all|frontpage|home)/i.test(c.handle)).slice(0, 3);
      const withCovers = await Promise.all(picked.map(async c => ({ ...c, cover: (await getCollection(c.handle))?.products[0] })));
      setTiles(withCovers);
    });
  }, []);
  const hero = products?.[0];

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-type">Layers for cold mornings</h1>
          <div className="hero-foot">
            <p>Heavyweight basics cut for walking, working and waiting for the kettle. Small runs, honest fabric, built to last more than one winter.</p>
            <Link to="/collections/all" className="btn light">Shop the collection</Link>
          </div>
        </div>
        {hero && (
          <Link to={`/products/${hero.handle}`} className="hero-product">
            <Pic img={hero.featuredImage} sizes="(min-width: 900px) 34vw, 70vw" />
            <span className="hero-tag"><b>{hero.title}</b><span>View product</span></span>
          </Link>
        )}
      </section>

      {tiles.length > 0 && (
        <section className="wrap cats">
          {tiles.map(t => (
            <Link key={t.id} to={`/collections/${t.handle}`} className="cat">
              <Pic img={t.cover?.featuredImage} sizes="(min-width: 900px) 33vw, 100vw" />
              <span className="cat-name">{t.title}</span>
            </Link>
          ))}
        </section>
      )}

      <section className="wrap">
        <div className="sec-head"><h2>New this week</h2><Link to="/collections/all" className="text-link">See everything</Link></div>
        {products ? <ProductGrid products={products} /> : <GridSkeleton />}
      </section>

      <section className="promise">
        <div className="wrap promise-row">
          <div><h3>Free shipping over $100</h3><p>Orders leave our studio within two working days.</p></div>
          <div><h3>30 days to change your mind</h3><p>Return anything unworn, we cover the label.</p></div>
          <div><h3>Repairs for life</h3><p>Broken zip or worn cuff? Send it back and we fix it.</p></div>
        </div>
      </section>
    </main>
  );
}
