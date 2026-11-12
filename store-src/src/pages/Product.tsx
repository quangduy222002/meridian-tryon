import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, type Product as P, type Variant } from '../lib/shopify';
import { FREE_SHIPPING, Pic, Price, swatch } from '../ui';
import { useCart } from '../cart';

const COLOR_OPT = /^(colou?r)$/i;

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

  const images = product?.images.nodes ?? [];
  // When the chosen variant has its own image (another colour), jump to it
  useEffect(() => {
    if (!variant?.image) return;
    const i = images.findIndex(im => im.url === variant.image!.url);
    if (i >= 0) setImgIdx(i);
  }, [variant]); // eslint-disable-line

  if (product === null) return <main className="wrap page"><h1 className="page-title">We couldn't find that product</h1><p className="muted">It may have sold out or moved.</p><Link to="/collections/all" className="btn">Shop all</Link></main>;
  if (!product) return <main className="wrap page pdp"><div className="pdp-main skeleton" /><div /></main>;

  const main = images[imgIdx] ?? variant?.image ?? product.featuredImage;
  const label = !variant ? 'Choose an option' : !variant.availableForSale ? 'Sold out' : busy ? 'Adding…' : 'Add to cart';

  return (
    <main className="wrap page pdp">
      <div className="pdp-gallery">
        <div className="pdp-main"><Pic img={main} sizes="(min-width: 900px) 55vw, 100vw" /></div>
        {images.length > 1 && (
          <div className="thumbs">
            {images.map((im, i) => <button key={im.url + i} className={'thumb' + (i === imgIdx ? ' on' : '')} onClick={() => setImgIdx(i)} aria-label={`Show image ${i + 1}`}><Pic img={im} sizes="90px" /></button>)}
          </div>
        )}
      </div>
      <div className="pdp-info">
        <nav className="crumbs small"><Link to="/">Home</Link><span>/</span><Link to="/collections/all">Shop all</Link></nav>
        <h1 className="pdp-title">{product.title}</h1>
        <div className="pdp-price">{variant ? <Price m={variant.price} /> : <Price m={product.priceRange.minVariantPrice} />}</div>

        {options.map(([name, values]) => {
          const isColor = COLOR_OPT.test(name);
          return (
            <fieldset key={name} className="opt">
              <legend>{name} <b>{selected[name]}</b></legend>
              <div className={'opt-vals' + (isColor ? ' colors' : '')}>
                {values.map(val => {
                  const cls = (isColor ? 'opt-color' : 'opt-btn') + (selected[name] === val ? ' on' : '') + (isAvailable(name, val) ? '' : ' na');
                  return isColor
                    ? <button key={val} className={cls} aria-label={val} title={val} aria-pressed={selected[name] === val} onClick={() => setSelected(s => ({ ...s, [name]: val }))}><span style={{ background: swatch(val) }} /></button>
                    : <button key={val} className={cls} aria-pressed={selected[name] === val} onClick={() => setSelected(s => ({ ...s, [name]: val }))}>{val}</button>;
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="buy">
          <div className="qty big">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button><span>{qty}</span><button onClick={() => setQty(q => q + 1)} aria-label="Increase quantity">+</button>
          </div>
          <button className="btn full" disabled={!variant?.availableForSale || busy}
            onClick={() => variant && add(variant, { title: product.title, handle: product.handle }, qty)}>{label}</button>
        </div>
        <p className="ship-note small">Free shipping over ${FREE_SHIPPING}. Ships in 2 working days.</p>

        <div className="acc">
          <details open><summary>Details</summary><p>{product.description}</p></details>
          <details><summary>Shipping and returns</summary><p>Orders over ${FREE_SHIPPING} ship free. Return unworn items within 30 days and we cover the return label.</p></details>
          <details><summary>Care</summary><p>Wash cold, inside out. Dry flat. Every piece can be sent back to us for repair.</p></details>
        </div>
      </div>
    </main>
  );
}
