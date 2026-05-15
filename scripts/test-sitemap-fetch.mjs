/**
 * Fetch backend GET /sitemap.xml the same way Next `src/app/sitemap.ts` does.
 *
 * Usage (from website root):
 *   npm run test:sitemap
 *   node scripts/test-sitemap-fetch.mjs
 *
 * Overrides:
 *   SITEMAP_TEST_API_URL=https://api.example.com
 *   SITEMAP_TEST_STORE_DOMAIN=www.aromadesire.com
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = join(__dirname, "..");
const envPath = join(websiteRoot, ".env.local");

function loadDotEnvLocal() {
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
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

function parseHostFromUrl(raw) {
  const value = String(raw || "").trim().replace(/\/$/, "");
  if (!value) return "";
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).host;
  } catch {
    return "";
  }
}

const env = loadDotEnvLocal();
const apiBase = (
  process.env.SITEMAP_TEST_API_URL ||
  env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");
const storeDomain =
  process.env.SITEMAP_TEST_STORE_DOMAIN ||
  env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN ||
  env.NEXT_PUBLIC_SITEMAP_HOST ||
  "www.aromadesire.com";

const frontendUrl = (env.FRONTEND_URL || env.NEXT_PUBLIC_SITE_URL || "").trim();
const publicHost =
  parseHostFromUrl(frontendUrl) || parseHostFromUrl(`https://${storeDomain}`) || storeDomain;

const url = `${apiBase}/sitemap.xml`;
const headers = {
  "x-store-domain": storeDomain,
  "x-forwarded-host": publicHost,
  "x-forwarded-proto": "https",
  "x-sitemap-public-host": publicHost,
};

console.log("--- Sitemap fetch diagnostic ---");
console.log("GET", url);
console.log("Headers:", JSON.stringify(headers, null, 2));
console.log("");

let res;
try {
  res = await fetch(url, { headers, cache: "no-store" });
} catch (e) {
  console.error("FETCH FAILED (is the API running and reachable?)", e?.message || e);
  process.exit(1);
}

const text = await res.text();
console.log("HTTP", res.status, res.statusText);
console.log("Response Cache-Control:", res.headers.get("cache-control") || "(none)");
console.log("Body length:", text.length);

if (!res.ok) {
  console.log("Body (first 800 chars):\n", text.slice(0, 800));
  process.exit(1);
}

const urlBlocks = text.match(/<url>[\s\S]*?<\/url>/g) || [];
console.log("<url> count:", urlBlocks.length);

const locs = [];
for (const block of urlBlocks) {
  const m = block.match(/<loc>([\s\S]*?)<\/loc>/);
  if (m) locs.push(m[1].trim());
}

const blogLocs = locs.filter((l) => /\/blogs\//i.test(l));
console.log("Blog <loc> count:", blogLocs.length);
console.log("Last 10 blog URLs:");
for (const b of blogLocs.slice(-10)) console.log(" ", b);

const slugNeedle = process.env.SITEMAP_TEST_SLUG_NEEDLE || "best-car-air-freshener-for-uber-drivers-uk";
const hasNeedle = blogLocs.some((l) => l.toLowerCase().includes(slugNeedle.toLowerCase()));
console.log("");
console.log(
  hasNeedle
    ? `OK: sitemap includes a blog loc matching "${slugNeedle}"`
    : `MISSING: no blog <loc> contains "${slugNeedle}" (check publishStatus, storeId in DB, or x-store-domain vs Store record)`
);

const bareSub = locs.some((l) => {
  try {
    const p = new URL(l).pathname.replace(/\/+$/, "") || "/";
    return p === "/subcategory";
  } catch {
    return false;
  }
});
console.log(
  bareSub
    ? "NOTE: bare /subcategory URL present (hardcoded in storefrontSitemapController.js)"
    : "NOTE: no bare /subcategory in this response"
);
