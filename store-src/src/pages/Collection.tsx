import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getCollection, getCollections, getProducts, type Collection as C, type ProductCard } from '../lib/shopify';
import { GridSkeleton, ProductGrid } from '../ui';

const price = (p: ProductCard) => parseFloat(p.priceRange.minVariantPrice.amount);

export default function Collection() {
  const { handle = 'all' } = useParams();
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') ?? 'featured';
  const [data, setData] = useState<{ title: string; products: ProductCard[] } | null | undefined>(undefined);
  const [collections, setCollections] = useState<C[]>([]);

  useEffect(() => {
    setData(undefined);
    (handle === 'all' ? getProducts(48).then(products => ({ title: 'All products', products })) : getCollection(handle)).then(setData);
  }, [handle]);
  useEffect(() => { getCollections().then(setCollections); }, []);

  const sorted = useMemo(() => {
    if (!data) return [];
    const list = [...data.products];
    if (sort === 'price-asc') list.sort((a, b) => price(a) - price(b));
    if (sort === 'price-desc') list.sort((a, b) => price(b) - price(a));
    return list;
  }, [data, sort]);

  if (data === null) return <main className="wrap page"><h1 className="page-title">We couldn't find that collection</h1><Link to="/collections/all" className="btn">Shop all</Link></main>;

  return (
    <main className="wrap page">
      <div className="coll-head">
        <div><h1 className="page-title">{data?.title ?? ' '}</h1>{data && <p className="muted small">{sorted.length} products</p>}</div>
        <label className="sort">
          <span className="small">Sort by</span>
          <select value={sort} onChange={e => setParams(e.target.value === 'featured' ? {} : { sort: e.target.value })}>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="chips-row">
        <Link to="/collections/all" className={'chip' + (handle === 'all' ? ' on' : '')}>All</Link>
        {collections.slice(0, 8).map(c => <Link key={c.id} to={`/collections/${c.handle}`} className={'chip' + (c.handle === handle ? ' on' : '')}>{c.title}</Link>)}
      </div>
      {data ? <ProductGrid products={sorted} /> : <GridSkeleton />}
    </main>
  );
}
