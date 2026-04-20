import { notFound } from "next/navigation";

/** Middleware rewrites disabled marketing URLs here so Next.js renders `not-found.tsx`. */
export default function DisabledMarketingRoutePlaceholder() {
  notFound();
}
