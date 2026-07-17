"use client";

import Link from "next/link";
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
  const nameLower = pkg.name.toLowerCase();

  let note = "";
  if (/includes?\s+engineer/i.test(desc)) {
    note = "Includes Engineer";
  } else if (desc.includes("·")) {
    const part = desc.split("·").map((s) => s.trim()).find((s) => s.length > 0);
    if (part && !part.startsWith("£")) note = part;
  }

  const isDayHire = nameLower.includes("day") || pkg.durationMinutes >= 240;
  if (isDayHire) return { unit: "", note };

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
  const features = Array.isArray(pkg.features)
    ? pkg.features.filter((item) => item.trim().length > 0)
    : [];
  const { unit, note } = getPriceMeta(pkg);
  const highlighted = Boolean(pkg.highlightBadgeEnabled);
  const badgeText = pkg.highlightBadgeText?.trim() || "Most Popular";

  return (
    <article
      className={`psm-booking-card group flex flex-col ${highlighted ? "psm-booking-card--featured" : ""}`}
    >
      {highlighted ? (
        <HighlightBadge text={badgeText} url={pkg.highlightBadgeUrl} />
      ) : null}

      <Link href={`/booking/details/${pkg._id}`} className="psm-booking-card__title-link">
        <h3 className="psm-booking-card__name">{capitalizeWords(pkg.name)}</h3>
      </Link>

      <p className="psm-booking-card__price">
        <span className="psm-booking-card__price-amount">
          {bookingService.formatPrice(pkg.price)}
        </span>
        {unit ? <span className="psm-booking-card__price-unit">{unit}</span> : null}
        <span className="psm-booking-card__price-vat"> +VAT</span>
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

      <Link
        href={`/booking/${pkg._id}`}
        className={`psm-booking-card__cta mt-auto ${highlighted ? "psm-booking-card__cta--featured" : ""}`}
      >
        Book Now
      </Link>
    </article>
  );
}
