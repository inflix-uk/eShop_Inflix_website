"use client";

import Link from "next/link";
import CartItemsList from "./CartItemsList";
import { useCart } from "./useCart";

/**
 * The customer's cart laid out for a page: lines on the left, order summary
 * and Checkout on the right. Same cart as the navbar drawer (see useCart).
 *
 * `not-prose`: CMS pages wrap their blocks in Tailwind Typography, which would
 * otherwise restyle the list, images and links in here.
 */
export default function CartWidget({ heading }: { heading?: string }) {
  const { items, ready, stock, itemCount, subtotal, updateQuantity, remove } =
    useCart({ checkStock: true });

  return (
    <section className="not-prose my-8 max-w-none" aria-label="Shopping cart">
      {heading ? (
        <h2 className="mb-4 text-2xl font-bold text-gray-900">{heading}</h2>
      ) : null}

      {!ready ? (
        <div
          className="min-h-[160px] animate-pulse rounded-lg bg-gray-100"
          aria-hidden
        />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-lg font-medium text-gray-900">Your cart is empty</p>
          <p className="mt-1 text-sm text-gray-500">
            Products you add to your cart will show here.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-secondary"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="h-fit rounded-lg border border-gray-200 bg-white px-4 sm:px-6 lg:col-span-2">
            <CartItemsList
              items={items}
              stock={stock}
              onQuantityChange={updateQuantity}
              onRemove={remove}
            />
          </div>

          <div className="h-fit rounded-lg border border-gray-200 bg-white p-6 lg:sticky lg:top-28">
            <h3 className="text-lg font-medium text-gray-900">Order summary</h3>
            <div className="mt-4 flex justify-between text-sm text-gray-600">
              <p>Items</p>
              <p>{itemCount}</p>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-4 text-base font-medium text-gray-900">
              <p>Subtotal</p>
              <p>£ {subtotal}</p>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Shipping and taxes calculated at checkout.
            </p>
            <Link
              href="/checkout"
              prefetch={true}
              className="mt-6 flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-secondary"
            >
              Checkout
            </Link>
            <p className="mt-6 text-center text-sm text-gray-500">
              or{" "}
              <Link href="/" className="font-medium text-primary hover:text-green-500">
                Continue Shopping &rarr;
              </Link>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
