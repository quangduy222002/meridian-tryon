import { Image, Money } from '@shopify/hydrogen-react';
import { Link } from 'react-router-dom';
import type { Img, Money as M, ProductCard } from './lib/shopify';
import { useCart } from './cart';

// Shopify CDN images go through Hydrogen's <Image> (responsive srcset); sample SVGs render as-is.
export function Pic({ img, sizes, className }: { img?: Img | null; sizes: string; className?: string }) {
  if (!img) return <div className={'pic-empty ' + (className ?? '')} />;
  if (img.url.startsWith('data:')) return <img src={img.url} alt={img.altText ?? ''} className={className} loading="lazy" />;
  return <Image data={img as never} sizes={sizes} className={className} loading="lazy" />;
}

export const Price = ({ m }: { m: M }) => <Money data={m as never} />;

export function ProductGrid({ products }: { products: ProductCard[] }) {
  return (
    <div className="grid">
      {products.map(p => (
        <Link key={p.id} to={`/products/${p.handle}`} className="card">
          <div className="card-img"><Pic img={p.featuredImage} sizes="(min-width: 900px) 25vw, 50vw" /></div>
          <div className="card-meta"><span>{p.title}</span><span className="muted"><Price m={p.priceRange.minVariantPrice} /></span></div>
        </Link>
      ))}
    </div>
  );
}

export function Header() {
  const { count, setOpen } = useCart();
  return (
    <header className="header">
      <Link to="/" className="logo">North <i>&amp;</i> Co.</Link>
      <nav className="nav">
        <Link to="/collections/all">Shop all</Link>
        <Link to="/collections/all" className="hide-sm">New in</Link>
      </nav>
      <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Open cart, ${count} items`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 7h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
        {count > 0 && <span className="badge">{count}</span>}
      </button>
    </header>
  );
}

export function CartDrawer() {
  const { cart, open, setOpen, subtotal, currency, setQty, remove, busy, checkoutUrl } = useCart();
  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open}>
        <div className="drawer-head"><h2>Your cart</h2><button className="x" onClick={() => setOpen(false)} aria-label="Close cart">✕</button></div>
        {cart.lines.length === 0 ? (
          <div className="empty"><p>Your cart is empty.</p><Link to="/collections/all" className="btn" onClick={() => setOpen(false)}>Start shopping</Link></div>
        ) : (
          <>
            <ul className="lines">
              {cart.lines.map(l => (
                <li key={l.id} className="line">
                  <Link to={`/products/${l.merchandise.product.handle}`} onClick={() => setOpen(false)} className="line-img"><Pic img={l.merchandise.image} sizes="80px" /></Link>
                  <div className="line-info">
                    <div className="line-top"><b>{l.merchandise.product.title}</b><Price m={{ amount: (l.quantity * parseFloat(l.merchandise.price.amount)).toFixed(2), currencyCode: l.merchandise.price.currencyCode }} /></div>
                    {l.merchandise.title !== 'Default Title' && <span className="muted small">{l.merchandise.title}</span>}
                    <div className="line-actions">
                      <div className="qty">
                        <button onClick={() => setQty(l.id, l.quantity - 1)} disabled={busy} aria-label="Decrease">−</button>
                        <span>{l.quantity}</span>
                        <button onClick={() => setQty(l.id, l.quantity + 1)} disabled={busy} aria-label="Increase">+</button>
                      </div>
                      <button className="link" onClick={() => remove(l.id)} disabled={busy}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <div className="row"><span>Subtotal</span><b><Price m={{ amount: subtotal.toFixed(2), currencyCode: currency }} /></b></div>
              <p className="muted small">Shipping and taxes calculated at checkout.</p>
              {checkoutUrl
                ? <a className="btn full" href={checkoutUrl}>Checkout</a>
                : <button className="btn full" onClick={() => alert('Demo mode: checkout needs the live Shopify Storefront API.')}>Checkout</button>}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
