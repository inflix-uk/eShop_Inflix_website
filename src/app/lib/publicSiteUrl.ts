/** Site origin for canonicals and Open Graph URLs (no trailing slash). */
export function getPublicSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "https://zextons.co.uk"
  );
}
