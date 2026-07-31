"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { bookingService, BookingPackage } from "../services/bookingService";
import { formatDuration, normalizeDurationUnit } from "../utils/formatDuration";

type BookingPackageCardProps = {
  pkg: BookingPackage;
};

function capitalizeWords(value: string): string {
  if (!value) return value;
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function getPriceMeta(pkg: BookingPackage): { unit: string; note: string } {
  const desc = (pkg.description || "").trim();

  let note = "";
  if (/includes?\s+engineer/i.test(desc)) {
    note = "Includes Engineer";
  } else if (desc.includes("·")) {
    const part = desc.split("·").map((s) => s.trim()).find((s) => s.length > 0);
    if (part && !part.startsWith("£")) note = part;
  }

  const durationLabel = formatDuration(
    pkg.durationMinutes,
    normalizeDurationUnit(pkg.durationDisplayUnit),
    { short: true }
  );
  const unit = durationLabel ? ` / ${durationLabel}` : "";

  return { unit, note };
}

function HighlightBadge({
  text,
  url,
}: {
  text: string;
  url?: string;
}) {
  const label = text.trim() || "Most Popular";
  const className = "psm-booking-card__badge";

  if (url?.trim()) {
    const isExternal = /^https?:\/\//i.test(url);
    if (isExternal) {
      return (
        <a
          href={url}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    }
    return (
      <Link href={url} className={className} onClick={(e) => e.stopPropagation()}>
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}

export default function BookingPackageCard({ pkg }: BookingPackageCardProps) {
  const router = useRouter();
  const features = Array.isArray(pkg.features)
    ? pkg.features.filter((item) => item.trim().length > 0)
    : [];
  const { unit, note } = getPriceMeta(pkg);
  const highlighted = Boolean(pkg.highlightBadgeEnabled);
  const badgeText = pkg.highlightBadgeText?.trim() || "Most Popular";

  const handleCardClick = () => {
    router.push(`/booking/details/${pkg._id}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`psm-booking-card group flex flex-col cursor-pointer ${highlighted ? "psm-booking-card--featured" : ""}`}
    >
      {highlighted ? (
        <HighlightBadge text={badgeText} url={pkg.highlightBadgeUrl} />
      ) : null}

      <div className="psm-booking-card__title-link">
        <h3 className="psm-booking-card__name">{capitalizeWords(pkg.name)}</h3>
      </div>

      <p className="psm-booking-card__price">
        <span className="psm-booking-card__price-amount">
          {bookingService.formatPrice(pkg.price)}
        </span>
        {unit ? <span className="psm-booking-card__price-unit">{unit}</span> : null}
        {note ? (
          <span className="psm-booking-card__price-note"> · {note}</span>
        ) : null}
      </p>

      {pkg.description?.trim() ? (
        <p className="psm-booking-card__description">{stripHtml(pkg.description)}</p>
      ) : null}

      {features.length > 0 ? (
        <ul className="psm-booking-card__features">
          {features.map((feature, featureIndex) => (
            <li key={`${pkg._id}-feature-${featureIndex}`}>{feature}</li>
          ))}
        </ul>
      ) : null}

      {pkg.bundleBenefits?.trim() ? (
        <div className="psm-booking-card__bundle">
          <span className="psm-booking-card__bundle-title">Bundle Benefits</span>
          <p className="psm-booking-card__bundle-text">{pkg.bundleBenefits.trim()}</p>
        </div>
      ) : null}

      <div className="psm-booking-card__cta-row mt-auto">
        <Link
          href={`/booking/details/${pkg._id}`}
          onClick={(e) => e.stopPropagation()}
          data-booking-btn-text
          className="psm-booking-card__cta psm-booking-card__cta--secondary"
        >
          View Detail
        </Link>
        <Link
          href={`/booking/${pkg._id}`}
          onClick={(e) => e.stopPropagation()}
          className={`psm-booking-card__cta ${highlighted ? "psm-booking-card__cta--featured" : ""}`}
        >
          Book Now
        </Link>
      </div>
    </article>
  );
}
