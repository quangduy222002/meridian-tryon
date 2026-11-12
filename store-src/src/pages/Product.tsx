import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, type Product as P, type Variant } from '../lib/shopify';
import { Pic, Price } from '../ui';
import { useCart } from '../cart';

export default function Product() {
  const { handle = '' } = useParams();
  const [product, setProduct] = useState<P | null | undefined>(undefined);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const { add, busy } = useCart();

  useEffect(() => {
    setProduct(undefined); setQty(1); setImgIdx(0);
    getProduct(handle).then(p => {
      setProduct(p);
      const first = p?.variants.nodes.find(v => v.availableForSale) ?? p?.variants.nodes[0];
      setSelected(Object.fromEntries((first?.selectedOptions ?? []).map(o => [o.name, o.value])));
    });
  }, [handle]);

  // Options are derived from the variants themselves (works with any Storefront API version)
  const options = useMemo(() => {
    const map = new Map<string, string[]>();
    product?.variants.nodes.forEach(v => v.selectedOptions.forEach(o => {
      const vals = map.get(o.name) ?? []; if (!vals.includes(o.value)) vals.push(o.value); map.set(o.name, vals);
    }));
    return [...map.entries()].filter(([name, vals]) => !(name === 'Title' && vals.length === 1));
  }, [product]);

  const variant: Variant | undefined = useMemo(() => product?.variants.nodes.find(v => v.selectedOptions.every(o => selected[o.name] === o.value)), [product, selected]);
  const isAvailable = (name: string, value: string) => product?.variants.nodes.some(v => v.availableForSale && v.selectedOptions.every(o => o.name === name ? o.value === value : selected[o.name] === o.value));

  // When the variant has its own image (e.g. another colour), show it
  const images = product?.images.nodes ?? [];
  useEffect(() => {
    if (!variant?.image) return;
    const i = images.findIndex(im => im.url === variant.image!.url);
    if (i >= 0) setImgIdx(i);
  }, [variant]); // eslint-disable-line

  if (product === null) return <main className="wrap page"><h1>Product not found</h1><Link to="/collections/all" className="btn">Shop all</Link></main>;
  if (!product) return <main className="wrap page pdp"><div className="pdp-gallery"><div className="pdp-main skeleton" /></div><div className="pdp-info"><div className="skeleton line-s" /></div></main>;

  const main = images[imgIdx] ?? variant?.image ?? product.featuredImage;
  return (
    <main className="wrap page pdp">
      <div className="pdp-gallery">
        <div className="pdp-main"><Pic img={main} sizes="(min-width: 900px) 55vw, 100vw" /></div>
        {images.length > 1 && (
          <div className="thumbs">
            {images.map((im, i) => <button key={im.url + i} className={'thumb' + (i === imgIdx ? ' on' : '')} onClick={() => setImgIdx(i)} aria-label={`Image ${i + 1}`}><Pic img={im} sizes="80px" /></button>)}
          </div>
        )}
      </div>
      <div className="pdp-info">
        <Link to="/collections/all" className="muted small back">← Back to shop</Link>
        <h1>{product.title}</h1>
        <div className="pdp-price">{variant ? <Price m={variant.price} /> : <Price m={product.priceRange.minVariantPrice} />}</div>
        {options.map(([name, values]) => (
          <fieldset key={name} className="opt">
            <legend>{name}: <b>{selected[name]}</b></legend>
            <div className="opt-vals">
              {values.map(val => (
                <button key={val} className={'opt-btn' + (selected[name] === val ? ' on' : '') + (isAvailable(name, val) ? '' : ' na')}
                  onClick={() => setSelected(s => ({ ...s, [name]: val }))}>{val}</button>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="buy">
          <div className="qty big">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease">−</button><span>{qty}</span><button onClick={() => setQty(q => q + 1)} aria-label="Increase">+</button>
          </div>
          <button className="btn full" disabled={!variant?.availableForSale || busy}
            onClick={() => variant && add(variant, { title: product.title, handle: product.handle }, qty)}>
            {!variant ? 'Unavailable' : variant.availableForSale ? (busy ? 'Adding…' : 'Add to cart') : 'Sold out'}
          </button>
        </div>
        <p className="desc">{product.description}</p>
        <ul className="perks muted small"><li>Free shipping over $100</li><li>30-day returns</li><li>Secure Shopify checkout</li></ul>
      </div>
    </main>
  );
}
