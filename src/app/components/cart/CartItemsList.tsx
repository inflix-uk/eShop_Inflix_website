"use client";

import Image from "next/image";
import { useAuth } from "@/app/context/Auth";
import type { CartProduct, CartStock } from "./useCart";

/** Picture for a cart line: variant image, then gallery, then thumbnail. */
function getCartProductImage(product: CartProduct, apiBase: string): string {
  const base = String(apiBase || "").replace(/\/+$/, "");

  // Prefer `url` (hosted storage); `path` is relative to the API.
  for (const list of [product.variantImages, product.galleryImages]) {
    const img = list && list.length > 0 ? list[0] : null;
    if (img?.url) return img.url;
    if (img?.path) return `${apiBase}${img.path}`;
  }

  // Legacy carts hold only a filename here; newer ones a full url/path.
  const t = product.productthumbnail;
  if (t) {
    if (typeof t === "string") {
      const s = t.trim();
      if (!s) return "/placeholder.png";
      if (s.startsWith("http://") || s.startsWith("https://")) return s;
      if (s.startsWith("/")) return `${base}${s}`;
      return `${base}/uploads/products/${s}`;
    }
    if (t.url) return t.url;
    if (t.path) {
      const p = t.path.trim();
      if (p.startsWith("http://") || p.startsWith("https://")) return p;
      const seg = p.startsWith("/") ? p : `/${p}`;
      const withUploads =
        !seg.toLowerCase().startsWith("/uploads/") && seg.startsWith("/products/")
          ? `/uploads${seg}`
          : seg;
      return `${base}${withUploads}`;
    }
  }

  return "/placeholder.png";
}

/**
 * The lines of the customer's cart: picture, name, quantity, price, remove.
 * Shared by the navbar cart drawer and the cart page widget.
 */
export default function CartItemsList({
  items,
  stock,
  onQuantityChange,
  onRemove,
  emptyMessage = "Your cart is empty!",
}: {
  items: CartProduct[];
  stock: CartStock;
  onQuantityChange: (productId: string, quantity: string) => void;
  onRemove: (productId: string) => void;
  emptyMessage?: string;
}) {
  const auth = useAuth();

  if (items.length === 0) {
    return <p className="text-center">{emptyMessage}</p>;
  }

  // Not <ul>/<li>: CMS pages force bullets and list-item display on those
  // (globals.css, ".prose li … !important"), which broke this layout there.
  return (
    <div role="list" className="divide-y divide-gray-200">
      {items.map((product) => {
        // "(…)" in a variant name is internal detail; spaces become hyphens.
        const variantLabel = String(product.name || "")
          .replace(/\s*\([^)]+\)/, "")
          .replace(/\s+/g, "-");
        const lineStock = stock[product._id];

        return (
          <div role="listitem" className="flex py-6" key={product._id}>
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
              <Image
                loading="lazy"
                src={getCartProductImage(product, auth.ip)}
                alt={product.name}
                width={100}
                height={100}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="ml-4 flex flex-1 flex-col">
              <p>
                {product.productName} {variantLabel}{" "}
                {product.selectedSim && (
                  <span className="text-sm text-gray-700">
                    SIM: {product.selectedSim}
                  </span>
                )}
              </p>
              <div className="flex flex-1 items-end justify-between text-sm">
                <div className="flex flex-col">
                  <label className="text-gray-500">
                    Qty
                    <input
                      type="number"
                      name="quantity"
                      className="ml-2 w-16 rounded-md border border-gray-300 text-center text-sm font-medium text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                      value={product.qty}
                      min="1"
                      max={lineStock?.availableQuantity || 100}
                      onChange={(e) =>
                        onQuantityChange(product._id, e.target.value)
                      }
                    />
                  </label>
                  {lineStock && !lineStock.inStock && (
                    <span className="mt-1 text-xs text-red-600">Out of stock</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-gray-900">
                    £ {parseFloat((product.salePrice * product.qty).toFixed(2))}
                  </p>
                  <button
                    type="button"
                    className="font-medium text-primary hover:text-green-500"
                    onClick={() => onRemove(product._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
