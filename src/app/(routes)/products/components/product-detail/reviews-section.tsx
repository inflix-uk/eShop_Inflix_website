import React from "react";
import ProductReviewsList from "./ProductReviewsList";
import type { ProductReviewRow } from "../../lib/productReviewsClient";

interface ReviewsSectionProps {
  productName?: string;
  averageRating: number;
  totalReviews: number;
  customerReviews: ProductReviewRow[];
  reviewsLoading?: boolean;
}

export default function ReviewsSection({
  productName = "iPhone 11",
  averageRating,
  totalReviews,
  customerReviews,
  reviewsLoading = false,
}: ReviewsSectionProps) {
  return (
    <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="md:text-2xl sm:text-xl text-lg font-bold text-gray-900 mb-4">
            {productName} <span className="text-primary">Customer Reviews</span>
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed max-w-4xl">
            We value the opinions of all of our customers, and we&apos;re sure
            that you do too! If you&apos;re still unsure about buying the{" "}
            {productName}, take a look at the reviews our customers have left for
            us.
          </p>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="w-6 h-6"
                style={{
                  fill:
                    i < Math.round(averageRating) ? "var(--primary)" : "#e5e7eb",
                }}
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span className="text-2xl font-bold text-gray-900 ml-2">
              {(Number(averageRating) || 0).toFixed(1)}/5
            </span>
          </div>
          <p className="text-gray-600">Based on {totalReviews} customer reviews</p>
        </div>

        {reviewsLoading ? (
          <p className="text-center text-gray-500">Loading reviews...</p>
        ) : (
          <ProductReviewsList reviews={customerReviews} limit={5} />
        )}
      </div>
    </section>
  );
}
