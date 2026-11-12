import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ShopifyProvider } from '@shopify/hydrogen-react';
import { CartProvider } from './cart';
import { CartDrawer, Header } from './ui';
import { usingSampleData } from './lib/shopify';
import Home from './pages/Home';
import Collection from './pages/Collection';
import Product from './pages/Product';
import Customize from './pages/Customize';
import './styles.css';

function ScrollTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }

function Footer() {
  const [sample, setSample] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSample(usingSampleData), 2500); return () => clearTimeout(t); }, []);
  return (
    <footer className="footer">
      <div className="wrap foot">
        <span className="logo small-logo">HALDE</span>
        <span>A fictional brand. Headless Shopify storefront built with React, Hydrogen React and the Storefront API.</span>
        <span className="muted">Data: {sample ? 'bundled sample catalogue' : 'mock.shop (live Storefront API)'}</span>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShopifyProvider storeDomain="https://mock.shop" storefrontToken="mock-shop-public" storefrontApiVersion="2026-04" countryIsoCode="US" languageIsoCode="EN">
      <CartProvider>
        <HashRouter>
          <ScrollTop />
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collections/:handle" element={<Collection />} />
            <Route path="/products/:handle" element={<Product />} />
            <Route path="/customize" element={<Customize />} />
            <Route path="*" element={<Home />} />
          </Routes>
          <CartDrawer />
          <Footer />
        </HashRouter>
      </CartProvider>
    </ShopifyProvider>
  </StrictMode>
);
