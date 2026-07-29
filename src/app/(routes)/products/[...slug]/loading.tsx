import FullPageLoading from "@/app/components/FullPageLoading";

/**
 * Route-level loading UI for the product detail page.
 * Full-screen overlay so the footer slot never shows as a white gap underneath.
 */
export default function ProductLoading() {
  return <FullPageLoading message="Loading product…" />;
}
