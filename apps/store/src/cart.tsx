import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  cartAdd,
  cartCreate,
  cartGet,
  cartRemove,
  cartUpdate,
  type Attr,
  type Cart,
  type CartLine,
  type Money,
  type Variant,
} from './lib/shopify';

type Ctx = {
  cart: Cart;
  count: number;
  subtotal: number;
  currency: string;
  busy: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (
    v: Variant,
    product: { title: string; handle: string },
    qty: number,
    opts?: { attributes?: Attr[]; price?: Money },
  ) => Promise<void>;
  setQty: (lineId: string, qty: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  checkoutUrl: string | null;
};
const CartCtx = createContext<Ctx | null>(null);
export const useCart = () => useContext(CartCtx)!;

const KEY = 'northco-cart';
const load = (): Cart => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '') as Cart;
  } catch {
    return { id: null, checkoutUrl: null, lines: [] };
  }
};
const save = (c: Cart) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable */
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(load);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const update = (c: Cart) => {
    setCart(c);
    save(c);
  };

  // Refresh a saved remote cart on load (it may have expired)
  useEffect(() => {
    const locals = cart.lines.filter((l) => l.id.startsWith('local-'));
    if (cart.id)
      cartGet(cart.id)
        .then((c) =>
          update(c ? { ...c, lines: [...c.lines, ...locals] } : { id: null, checkoutUrl: null, lines: locals }),
        )
        .catch(() => {});
  }, []); // eslint-disable-line

  const local = cart.id === null; // no remote cart (API unreachable) → manage lines locally

  const add = useCallback<Ctx['add']>(
    async (v, product, qty, opts = {}) => {
      setBusy(true);
      const attrs = opts.attributes ?? [];
      try {
        // a custom price (configured product) can't be set from the storefront, so keep that line local
        if (opts.price) throw new Error('custom price');
        update(cart.id ? await cartAdd(cart.id, v.id, qty, attrs) : await cartCreate(v.id, qty, attrs));
      } catch {
        const lines = [...cart.lines];
        const key = v.id + JSON.stringify(attrs);
        const hit = lines.find((l) => l.merchandise.id + JSON.stringify(l.attributes ?? []) === key);
        if (hit) hit.quantity += qty;
        else
          lines.push({
            id: 'local-' + key + Date.now(),
            quantity: qty,
            attributes: attrs,
            merchandise: { id: v.id, title: v.title, price: opts.price ?? v.price, image: v.image, product },
          } as CartLine);
        update({ ...cart, lines });
      }
      setBusy(false);
      setTimeout(() => setOpen(true), 820); // let the fly-to-cart animation land first
    },
    [cart],
  );

  const setQty = useCallback<Ctx['setQty']>(
    async (lineId, qty) => {
      if (qty < 1) return remove(lineId);
      setBusy(true);
      try {
        if (local || lineId.startsWith('local-')) throw 0;
        update(await cartUpdate(cart.id!, lineId, qty));
      } catch {
        update({ ...cart, lines: cart.lines.map((l) => (l.id === lineId ? { ...l, quantity: qty } : l)) });
      }
      setBusy(false);
    },
    // `remove` is declared below and stable for a given cart, so it is left out on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, local],
  );

  const remove = useCallback<Ctx['remove']>(
    async (lineId) => {
      setBusy(true);
      try {
        if (local || lineId.startsWith('local-')) throw 0;
        update(await cartRemove(cart.id!, lineId));
      } catch {
        update({ ...cart, lines: cart.lines.filter((l) => l.id !== lineId) });
      }
      setBusy(false);
    },
    [cart, local],
  );

  const value = useMemo<Ctx>(() => {
    const count = cart.lines.reduce((n, l) => n + l.quantity, 0);
    const subtotal = cart.lines.reduce((n, l) => n + l.quantity * parseFloat(l.merchandise.price.amount), 0);
    const currency = cart.lines[0]?.merchandise.price.currencyCode ?? 'USD';
    return { cart, count, subtotal, currency, busy, open, setOpen, add, setQty, remove, checkoutUrl: cart.checkoutUrl };
  }, [cart, busy, open, add, setQty, remove]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
