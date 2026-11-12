import { useState } from 'react';
import { Image, Money } from '@shopify/hydrogen-react';
import { Link, NavLink } from 'react-router-dom';
import type { Img, Money as M, ProductCard } from './lib/shopify';
import { COLORS } from './lib/fixtures';
import { useCart } from './cart';

export const FREE_SHIPPING = 100;

// Shopify CDN images go through Hydrogen's <Image> (responsive srcset); sample SVGs render as-is.
export function Pic({ img, sizes, className }: { img?: Img | null; sizes: string; className?: string }) {
  if (!img) return <div className={'pic-empty ' + (className ?? '')} />;
  if (img.url.startsWith('data:')) return <img src={img.url} alt={img.altText ?? ''} className={className} loading="lazy" />;
  return <Image data={img as never} sizes={sizes} className={className} loading="lazy" />;
}

export const Price = ({ m }: { m: M }) => <Money data={m as never} />;

// A colour name → swatch colour. Known names use the brand palette, others fall back to the CSS colour of that name.
export const swatch = (name: string) => COLORS[name] ?? name.toLowerCase().replace(/\s+/g, '');
const COLOR_OPT = /^(colou?r)$/i;

export function colorsOf(p: ProductCard) {
  const seen = new Map<string, Img | null | undefined>();
  p.variants?.nodes.forEach(v => v.selectedOptions.forEach(o => { if (COLOR_OPT.test(o.name) && !seen.has(o.value)) seen.set(o.value, v.image); }));
  return [...seen.entries()];
}

function ProductTile({ p }: { p: ProductCard }) {
  const colors = colorsOf(p);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const second = p.images?.nodes[1];
  const colorImg = hoverColor ? colors.find(([c]) => c === hoverColor)?.[1] : null;
  return (
    <Link to={`/products/${p.handle}`} className="tile">
      <div className={'tile-img' + (second && !colorImg ? ' has-alt' : '')}>
        <Pic img={colorImg ?? p.featuredImage} sizes="(min-width: 900px) 25vw, 50vw" className="main" />
        {second && !colorImg && <Pic img={second} sizes="(min-width: 900px) 25vw, 50vw" className="alt" />}
      </div>
      <div className="tile-meta">
        <span className="tile-title">{p.title}</span>
        <span className="tile-price"><Price m={p.priceRange.minVariantPrice} /></span>
      </div>
      {colors.length > 1 && (
        <div className="swatches" onMouseLeave={() => setHoverColor(null)}>
          {colors.slice(0, 6).map(([c]) => <span key={c} className="sw" title={c} style={{ background: swatch(c) }} onMouseEnter={() => setHoverColor(c)} />)}
          <span className="sw-count">{colors.length} colours</span>
        </div>
      )}
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCard[] }) {
  return <div className="grid">{products.map(p => <ProductTile key={p.id} p={p} />)}</div>;
}

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return <div className="grid">{Array.from({ length: n }, (_, i) => <div key={i} className="tile"><div className="tile-img skeleton" /></div>)}</div>;
}

export function Header() {
  const { count, setOpen } = useCart();
  return (
    <>
      <div className="announce"><span>Free shipping on orders over ${FREE_SHIPPING}</span><span className="hide-sm">Free returns within 30 days</span></div>
      <header className="header">
        <Link to="/" className="logo" aria-label="Halde home">HALDE</Link>
        <nav className="nav">
          <NavLink to="/collections/all" end>Shop all</NavLink>
          <NavLink to="/collections/all?sort=price-asc" className="hide-sm">Under $50</NavLink>
        </nav>
        <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Open cart, ${count} items`}>
          <span className="hide-sm">Cart</span>
          <span className="cart-count">{count}</span>
        </button>
      </header>
    </>
  );
}

export function CartDrawer() {
  const { cart, open, setOpen, subtotal, currency, setQty, remove, busy, checkoutUrl } = useCart();
  const left = Math.max(0, FREE_SHIPPING - subtotal);
  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open} aria-label="Cart">
        <div className="drawer-head"><h2>Cart</h2><button className="x" onClick={() => setOpen(false)} aria-label="Close cart">Close</button></div>
        {cart.lines.length === 0 ? (
          <div className="empty"><p>Nothing here yet. Start with our heaviest hoodie or browse everything.</p><Link to="/collections/all" className="btn" onClick={() => setOpen(false)}>Shop all</Link></div>
        ) : (
          <>
            <div className="ship">
              <p>{left > 0 ? <>Add <b><Price m={{ amount: left.toFixed(2), currencyCode: currency }} /></b> for free shipping</> : <b>Free shipping unlocked</b>}</p>
              <div className="ship-bar"><span style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }} /></div>
            </div>
            <ul className="lines">
              {cart.lines.map(l => (
                <li key={l.id} className="line">
                  <Link to={`/products/${l.merchandise.product.handle}`} onClick={() => setOpen(false)} className="line-img"><Pic img={l.merchandise.image} sizes="90px" /></Link>
                  <div className="line-info">
                    <div className="line-top"><b>{l.merchandise.product.title}</b><Price m={{ amount: (l.quantity * parseFloat(l.merchandise.price.amount)).toFixed(2), currencyCode: l.merchandise.price.currencyCode }} /></div>
                    {l.merchandise.title !== 'Default Title' && <span className="muted small">{l.merchandise.title}</span>}
                    <div className="line-actions">
                      <div className="qty">
                        <button onClick={() => setQty(l.id, l.quantity - 1)} disabled={busy} aria-label="Decrease quantity">−</button>
                        <span>{l.quantity}</span>
                        <button onClick={() => setQty(l.id, l.quantity + 1)} disabled={busy} aria-label="Increase quantity">+</button>
                      </div>
                      <button className="text-btn" onClick={() => remove(l.id)} disabled={busy}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <div className="row"><span>Subtotal</span><b><Price m={{ amount: subtotal.toFixed(2), currencyCode: currency }} /></b></div>
              <p className="muted small">Taxes and shipping are calculated at checkout.</p>
              {checkoutUrl
                ? <a className="btn full" href={checkoutUrl}>Check out</a>
                : <button className="btn full" onClick={() => alert('Demo mode: checkout needs the live Shopify Storefront API.')}>Check out</button>}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
