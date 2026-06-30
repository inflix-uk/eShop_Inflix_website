/**
 * Server-rendered hidden content for SEO.
 * Specs, Perks, FAQs, and Reviews live inside modals/client components
 * that only mount on user interaction, so crawlers never see them.
 * This component keeps the same content always in the DOM.
 */
export default function ProductSEOContent({ product }: { product: any }) {
  const specs = product?.product_Specifications || [];
  const faqs = (product?.faqDetails || []).filter(
    (faq: any) => faq.status === "Published" && faq.question && faq.answer
  );
  const hasDynamicPerks =
    product?.perks_and_benefits?.status &&
    product?.perks_and_benefits?.description;
  const reviews = product?.reviewDetails || [];

  if (
    specs.length === 0 &&
    !hasDynamicPerks &&
    faqs.length === 0 &&
    reviews.length === 0
  ) {
    return null;
  }

  return (
    <div className="sr-only">
      {specs.length > 0 && (
        <section aria-label="Product Specifications">
          <h2>Product Specifications</h2>
          {specs.map((spec: { key: string; value: string }, i: number) => (
            <h5 key={i}>
              {spec.key}: {spec.value}
            </h5>
          ))}
        </section>
      )}

      {hasDynamicPerks && (
        <section aria-label="Perks and Benefits">
          <h2>Perks &amp; Benefits</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: product.perks_and_benefits.description,
            }}
          />
        </section>
      )}

      {faqs.length > 0 && (
        <section aria-label="Frequently Asked Questions">
          <h2>FAQs</h2>
          {faqs.map((faq: { question: string; answer: string }, i: number) => (
            <div key={i}>
              <h3>{faq.question}</h3>
              <h6 dangerouslySetInnerHTML={{ __html: faq.answer }} />
            </div>
          ))}
        </section>
      )}

      {reviews.length > 0 && (
        <section aria-label="Customer Reviews">
          <h2>Customer Reviews</h2>
          {reviews.map((review: any, i: number) => (
            <h5 key={i}>
              {review.name || "Customer"} — {review.rating || 5}/5 stars:{" "}
              {review.comment || review.review || ""}
            </h5>
          ))}
        </section>
      )}
    </div>
  );
}
