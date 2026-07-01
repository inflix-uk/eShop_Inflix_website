/**
 * Route-level loading UI for the product detail page.
 *
 * Next.js App Router renders this INSTANTLY when a user navigates to a product
 * (e.g. clicks any product card anywhere on the site) while the product page's
 * server component fetches its data. This gives immediate "it's loading"
 * feedback with a skeleton that mirrors the real PDP layout — no per-card
 * changes needed, works for every product link site-wide.
 */
export default function ProductLoading() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      role="status"
      aria-busy="true"
      aria-label="Loading product"
    >
      <span className="sr-only">Loading product…</span>

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 animate-pulse">
        <div className="h-3 w-12 rounded bg-gray-200" />
        <div className="h-3 w-3 rounded bg-gray-100" />
        <div className="h-3 w-16 rounded bg-gray-200" />
        <div className="h-3 w-3 rounded bg-gray-100" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: image gallery */}
        <div className="animate-pulse">
          <div className="aspect-square w-full rounded-xl bg-gray-200" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>

        {/* Right: product info */}
        <div className="animate-pulse space-y-5">
          <div className="h-6 w-24 rounded-lg bg-gray-100" /> {/* condition badge */}
          <div className="space-y-2">
            <div className="h-7 w-11/12 rounded bg-gray-200" /> {/* title */}
            <div className="h-7 w-2/3 rounded bg-gray-200" />
          </div>

          {/* Rating */}
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-4 rounded bg-gray-200" />
            ))}
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-gray-100" />
            <div className="h-9 w-32 rounded bg-gray-300" />
          </div>

          {/* Variant options */}
          <div className="space-y-3">
            <div className="h-4 w-28 rounded bg-gray-100" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-20 rounded-lg bg-gray-100" />
              ))}
            </div>
          </div>

          {/* Add to cart / buy now */}
          <div className="space-y-3 pt-2">
            <div className="h-12 w-full rounded-lg bg-gray-300" />
            <div className="h-12 w-full rounded-lg bg-gray-200" />
          </div>

          {/* Delivery / perks lines */}
          <div className="space-y-2 pt-2">
            <div className="h-3 w-3/4 rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      </div>

      {/* Description block */}
      <div className="mt-12 animate-pulse space-y-3">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-5/6 rounded bg-gray-100" />
        <div className="h-3 w-3/4 rounded bg-gray-100" />
      </div>
    </div>
  );
}
