"use client";

import type { ProductReviewRow } from "../../lib/productReviewsClient";

function formatReviewDate(dateString?: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type ProductReviewsListProps = {
  reviews: ProductReviewRow[];
  limit?: number;
  className?: string;
};

export default function ProductReviewsList({
  reviews,
  limit,
  className = "",
}: ProductReviewsListProps) {
  const visible =
    typeof limit === "number" && limit > 0 ? reviews.slice(0, limit) : reviews;

  if (!visible.length) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500 text-lg">No reviews available yet.</p>
        <p className="text-gray-400 text-sm mt-2">Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {visible.map((review, index) => (
        <article
          key={review._id || `review-${index}`}
          className="border-b border-gray-100 pb-8 last:border-0"
        >
          <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold text-lg">
                {review.name ? review.name.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{review.name || "Anonymous"}</h3>
              <p className="text-gray-500 text-sm">
                {formatReviewDate(
                  review.DateTime || review.createdAt || undefined
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="w-5 h-5"
                style={{
                  fill:
                    i < (Number(review.rating) || 0)
                      ? "var(--primary)"
                      : "#e5e7eb",
                }}
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>

          <p className="text-gray-700 leading-relaxed">
            {review.comment || review.review || "No comment provided."}
          </p>
        </article>
      ))}
    </div>
  );
}
