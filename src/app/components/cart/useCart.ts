"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

/** A line in the customer's cart, as the product page stores it. */
export interface CartProduct {
  _id: string;
  productId?: string;
  name: string;
  salePrice: number;
  qty: number;
  productName: string;
  variantImages?: { path?: string; url?: string }[];
  galleryImages?: { path?: string; url?: string }[];
  productthumbnail?: string | { path?: string; url?: string; filename?: string };
  selectedSim?: string;
}

export type CartStock = Record<
  string,
  { availableQuantity: number; inStock: boolean }
>;

/**
 * The cart lives in this browser's localStorage. Every place that shows it
 * (the navbar drawer, the cart page widget, the navbar total) reads the same
 * key and announces changes with this event, so they never disagree.
 */
const CART_STORAGE_KEY = "cart";
export const CART_UPDATED_EVENT = "cartUpdated";

export function readCart(): CartProduct[] {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function writeCart(cart: CartProduct[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

/**
 * The customer's cart and the actions on it.
 * @param checkStock - look up live stock for each line (limits the quantity
 *   box and flags out-of-stock lines); off while the cart is not on screen.
 */
export function useCart({ checkStock = false }: { checkStock?: boolean } = {}) {
  const [items, setItems] = useState<CartProduct[]>([]);
  const [stock, setStock] = useState<CartStock>({});
  // False until the first read: localStorage is not available on the server,
  // and showing "your cart is empty" before that read would be wrong.
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const next = readCart();
    setItems((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    );
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    // Fired when another tab changes the cart.
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!checkStock || items.length === 0) return;
    let cancelled = false;

    const checkAllStock = async () => {
      const checks: CartStock = {};
      for (const item of items) {
        try {
          const response = await fetch("/api/stock/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: item.productId || item._id,
              variantId: item._id,
            }),
          });
          const data = await response.json();
          checks[item._id] =
            data.success && data.data
              ? {
                  availableQuantity: data.data.availableQuantity,
                  inStock: data.data.inStock,
                }
              : { availableQuantity: 0, inStock: false };
        } catch (error) {
          console.error(`Error checking stock for ${item._id}:`, error);
          checks[item._id] = { availableQuantity: 0, inStock: false };
        }
      }
      if (!cancelled) setStock(checks);
    };

    checkAllStock();
    return () => {
      cancelled = true;
    };
  }, [checkStock, items]);

  const updateQuantity = useCallback(
    (productId: string, quantity: string | number) => {
      const parsed = parseInt(String(quantity), 10);
      const cart = readCart();
      const index = cart.findIndex((product) => product._id === productId);
      if (index === -1) return;

      let nextQty = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
      const lineStock = stock[productId];
      if (lineStock && nextQty > lineStock.availableQuantity) {
        const available = lineStock.availableQuantity;
        toast.warning(
          `Only ${available} item${available === 1 ? "" : "s"} available in stock.`
        );
        nextQty = available;
      }

      cart[index].qty = nextQty;
      writeCart(cart);
    },
    [stock]
  );

  const remove = useCallback((productId: string) => {
    writeCart(readCart().filter((product) => product._id !== productId));
  }, []);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + (item.qty || 1), 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items
        .reduce(
          (total, item) =>
            total + parseFloat((item.salePrice * item.qty).toFixed(2)),
          0
        )
        .toFixed(2),
    [items]
  );

  return { items, ready, stock, itemCount, subtotal, updateQuantity, remove, refresh };
}
