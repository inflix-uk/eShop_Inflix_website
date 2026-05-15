/**
 * Verify product URLs from sitemap.xml return non-404 on the storefront.
 * Does not modify application code — diagnostic only.
 *
 * Usage (from eShop_Inflix_website):
 *   node scripts/test-sitemap-product-urls.mjs
 *   npm run test:sitemap-products
 *
 * Env / .env.local:
 *   NEXT_PUBLIC_API_URL, FRONTEND_URL, NEXT_PUBLIC_SITEMAP_STORE_DOMAIN
 *
 * Overrides:
 *   SITEMAP_TEST_URL=https://aromadesire.com/sitemap.xml   (default: FRONTEND_URL/sitemap.xml)
 *   SITEMAP_TEST_API_URL=http://localhost:4000             (for API product lookup)
 *   SITEMAP_TEST_CONCURRENCY=8
 *   SITEMAP_TEST_LIMIT=50                                  (cap URLs for quick run)
 *   SITEMAP_TEST_ONLY_FAIL=1                              (print failures only)
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = join(__dirname, "..");
const envPath = join(websiteRoot, ".env.local");

function loadDotEnvLocal() {
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function canonicalOrigin(input) {
  const value = String(input || "").trim().replace(/\/$/, "");
  if (!value) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (u.hostname.toLowerCase().startsWith("www.")) u.hostname = u.hostname.slice(4);
    return u.origin;
  } catch {
    return value;
  }
}

function parseProductPath(loc) {
  try {
    const p = new URL(loc).pathname.replace(/\/+$/, "") || "/";
    const m = p.match(/^\/products\/(.+)$/i);
    if (!m) return null;
    const rest = m[1];
    const segments = rest.split("/").filter(Boolean);
    return { loc, segments, hyphenSlug: segments.length === 1 ? segments[0] : null };
  } catch {
    return null;
  }
}

/** If sitemap uses /products/base-variant/ (one segment), site may expect /products/base/variant/ */
function buildSlashVariantCandidate(origin, baseSlug, hyphenSlug) {
  if (!baseSlug || !hyphenSlug || hyphenSlug === baseSlug) return null;
  if (!hyphenSlug.startsWith(`${baseSlug}-`)) return null;
  const variantPart = hyphenSlug.slice(baseSlug.length + 1);
  if (!variantPart) return null;
  return `${origin}/products/${baseSlug}/${variantPart}/`;
}

async function fetchSitemapXml(env) {
  const explicitUrl = process.env.SITEMAP_TEST_URL?.trim();
  if (explicitUrl) {
    const res = await fetch(explicitUrl, { redirect: "follow", cache: "no-store" });
    const text = await res.text();
    const source = explicitUrl.includes("/sitemap.xml") ? "storefront" : "explicit";
    return { sitemapUrl: explicitUrl, text, status: res.status, source };
  }

  const frontend = canonicalOrigin(
    env.FRONTEND_URL || env.NEXT_PUBLIC_SITE_URL || "https://aromadesire.com"
  );
  const storefrontUrl = `${frontend}/sitemap.xml`;
  {
    const res = await fetch(storefrontUrl, { redirect: "follow", cache: "no-store" });
    const text = await res.text();
    if (res.status === 200 && text.includes("<loc>")) {
      return { sitemapUrl: storefrontUrl, text, status: res.status, source: "storefront" };
    }
  }

  const apiBase = (
    process.env.SITEMAP_TEST_API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");
  const storeDomain =
    process.env.SITEMAP_TEST_STORE_DOMAIN ||
    env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN ||
    "aromadesire.com";
  const publicHost = canonicalOrigin(env.FRONTEND_URL || `https://${storeDomain}`).replace(
    /^https?:\/\//,
    ""
  );
  const headers = {
    "x-store-domain": storeDomain.replace(/^www\./i, ""),
    "x-forwarded-host": publicHost || storeDomain,
    "x-forwarded-proto": "https",
    "x-sitemap-public-host": publicHost || storeDomain,
  };
  const apiUrl = `${apiBase}/sitemap.xml`;
  const res = await fetch(apiUrl, { headers, cache: "no-store" });
  const text = await res.text();
  return { sitemapUrl: apiUrl, text, status: res.status, source: "api" };
}

async function checkStorefrontUrl(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "text/html" },
    });
    return { status: res.status, ok: res.ok, finalUrl: res.url };
  } catch (e) {
    return { status: 0, ok: false, error: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}

async function checkApiProduct(apiBase, producturl) {
  if (!apiBase) return { skipped: true };
  try {
    const res = await fetch(`${apiBase}/get/product/by/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producturl }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    const found = Boolean(data?.product) && data?.status !== 404;
    return { found, status: res.status, apiStatus: data?.status };
  } catch (e) {
    return { found: false, error: e?.message || String(e) };
  }
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const env = loadDotEnvLocal();
const concurrency = Number(process.env.SITEMAP_TEST_CONCURRENCY || 8);
const limit = Number(process.env.SITEMAP_TEST_LIMIT || 0);
const onlyFail = process.env.SITEMAP_TEST_ONLY_FAIL === "1";
const apiBase = (process.env.SITEMAP_TEST_API_URL || env.NEXT_PUBLIC_API_URL || "").replace(
  /\/+$/,
  ""
);

console.log("=== Sitemap product URL checker (read-only) ===\n");

const { sitemapUrl, text, status, source } = await fetchSitemapXml(env);
console.log("Sitemap source:", source);
console.log("Sitemap URL:", sitemapUrl);
console.log("HTTP:", status);
if (status !== 200) {
  console.error("Sitemap fetch failed. Body preview:\n", text.slice(0, 500));
  process.exit(1);
}

const locs = [];
for (const block of text.match(/<url>[\s\S]*?<\/url>/g) || []) {
  const m = block.match(/<loc>([\s\S]*?)<\/loc>/);
  if (m) locs.push(m[1].trim());
}

const productLocs = locs.filter((l) => {
  try {
    return new URL(l).pathname.includes("/products/");
  } catch {
    return l.includes("/products/");
  }
});

const origin = canonicalOrigin(
  productLocs[0] ? new URL(productLocs[0]).origin : env.FRONTEND_URL || "https://aromadesire.com"
);

const parsed = productLocs.map(parseProductPath).filter(Boolean);
const hyphenSlugs = parsed.map((p) => p.hyphenSlug).filter(Boolean);
const baseSlugs = [...hyphenSlugs].sort((a, b) => a.length - b.length);

console.log("Total <loc>:", locs.length);
console.log("Product URLs:", productLocs.length);
console.log("Storefront origin:", origin);
console.log("");

let toTest = productLocs;
if (limit > 0) toTest = toTest.slice(0, limit);

const results = await mapPool(toTest, concurrency, async (loc) => {
  const info = parseProductPath(loc);
  const hyphenSlug = info?.hyphenSlug || "";
  const storefront = await checkStorefrontUrl(loc);
  const apiFirstSeg =
    hyphenSlug && apiBase
      ? await checkApiProduct(apiBase, hyphenSlug)
      : { skipped: true };

  let slashCandidate = null;
  let slashResult = null;
  for (const base of baseSlugs) {
    if (base.length >= hyphenSlug.length) continue;
    slashCandidate = buildSlashVariantCandidate(origin, base, hyphenSlug);
    if (slashCandidate && slashCandidate !== loc) {
      slashResult = await checkStorefrontUrl(slashCandidate);
      if (slashResult.ok) break;
    }
  }

  return {
    loc,
    hyphenSlug,
    storefront,
    apiFirstSeg,
    slashCandidate,
    slashResult,
  };
});

const failed = results.filter((r) => !r.storefront.ok || r.storefront.status === 404);
const fixedBySlash = failed.filter(
  (r) => r.slashCandidate && r.slashResult?.ok && r.slashResult.status < 400
);
const apiMissing = results.filter((r) => !r.apiFirstSeg.skipped && !r.apiFirstSeg.found);

console.log("--- Summary ---");
console.log("Checked:", results.length);
console.log("Storefront OK (2xx/3xx):", results.length - failed.length);
console.log("Storefront 404/fail:", failed.length);
console.log("  → Would work as /products/{base}/{variant}/:", fixedBySlash.length);
console.log("API: product not found for full path slug:", apiMissing.length);
console.log("");

const printRow = (r) => {
  const st = r.storefront.status || r.storefront.error || "?";
  const api = r.apiFirstSeg.skipped
    ? "api:n/a"
    : r.apiFirstSeg.found
      ? "api:found"
      : "api:MISSING";
  console.log(`FAIL ${st}  ${api}  ${r.loc}`);
  if (r.slashCandidate && r.slashResult) {
    const altSt = r.slashResult.ok ? `OK ${r.slashResult.status}` : `fail ${r.slashResult.status || r.slashResult.error}`;
    console.log(`     try: ${r.slashCandidate}  → ${altSt}`);
  }
};

if (failed.length === 0) {
  console.log("All checked product URLs returned non-404 on the storefront.");
} else {
  console.log("--- Failed storefront URLs ---");
  const list = onlyFail ? failed : failed;
  for (const r of list) printRow(r);

  if (fixedBySlash.length > 0) {
    console.log("\n--- Likely root cause ---");
    console.log(
      "Sitemap emits variant URLs as ONE path segment: /products/{base}-{variant}/"
    );
    console.log(
      "The live site expects TWO segments:     /products/{base}/{variant}/"
    );
    console.log(
      "Fix (in sitemap generator): change variant <loc> from hyphen-join to slash-separated paths."
    );
  }
}

if (!onlyFail && failed.length > 0 && failed.length < results.length) {
  console.log("\n--- Sample OK URLs ---");
  for (const r of results.filter((x) => x.storefront.ok).slice(0, 5)) {
    console.log(`OK ${r.storefront.status}  ${r.loc}`);
  }
}

process.exit(failed.length > 0 ? 1 : 0);
