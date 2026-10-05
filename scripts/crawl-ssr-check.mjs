/**
 * Fetch storefront pages the way Googlebot's first crawl does: raw HTML only,
 * no JavaScript. Compare that HTML with the CMS page body.
 *
 * Text outside <script>/<style> is what a non-rendering crawler can read.
 * The same text only inside a script is client-rendered (CSR).
 *
 * Usage (from eShop_Inflix_website):
 *   npm run test:crawl-ssr
 *   node scripts/crawl-ssr-check.mjs /about-us/ /contact-us/
 *
 * Overrides:
 *   CRAWL_TEST_SITE_URL=http://localhost:3000
 *   CRAWL_TEST_API_URL=http://localhost:4000
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = join(__dirname, "..");

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function loadDotEnvLocal() {
  const envPath = join(websiteRoot, ".env.local");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in out)) out[k] = v;
  }
  return out;
}

const env = loadDotEnvLocal();
const siteUrl = (
  process.env.CRAWL_TEST_SITE_URL ||
  env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");
const apiUrl = (
  process.env.CRAWL_TEST_API_URL ||
  env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");

function decodeEntities(s) {
  return String(s || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"');
}

function htmlToText(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function visibleDocumentText(html) {
  const withoutScripts = String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  return htmlToText(withoutScripts);
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every visible text node in the CMS HTML, not a short sample. */
function textPieces(html) {
  const source = String(html || "");
  const pieces = [];
  const re = />([^<]+)</g;
  let match;
  while ((match = re.exec(source))) {
    const text = htmlToText(match[1]).trim();
    if (text.replace(/\s/g, "").length >= 2) pieces.push(text);
  }
  if (!pieces.length) {
    const text = htmlToText(source).trim();
    if (text.replace(/\s/g, "").length >= 2) pieces.push(text);
  }
  return pieces;
}

function walkBlocks(blocks, acc) {
  if (!Array.isArray(blocks)) return;
  for (const row of blocks) {
    for (const column of row?.columns || []) {
      for (const block of column?.blocks || []) {
        const type = block?.type;
        const content = block?.content;
        if (type === "text" && typeof content === "string") {
          acc.push({ kind: "text", samples: textPieces(content) });
        } else if (type === "widget" && content?.widgetType === "htmlCss") {
          acc.push({
            kind: "htmlCss",
            samples: textPieces(content.html || ""),
          });
        } else if (type === "widget" && content?.widgetType === "contactUs") {
          const bits = [content.title, content.description]
            .filter((v) => typeof v === "string" && v.trim())
            .join(". ");
          acc.push({
            kind: "contactUs",
            samples: textPieces(bits),
          });
        } else if (type === "widget") {
          acc.push({
            kind: content?.widgetType || "widget",
            samples: [],
          });
        }
      }
    }
  }
}

function countInVisible(samples, visibleNorm) {
  let counted = 0;
  let hit = 0;
  let chars = 0;
  let charsHit = 0;
  const missing = [];
  for (const sample of samples) {
    const key = normalize(sample);
    if (!key) continue;
    counted += 1;
    chars += key.length;
    if (visibleNorm.includes(key)) {
      hit += 1;
      charsHit += key.length;
    } else missing.push(sample);
  }
  return { counted, hit, missing, chars, charsHit };
}

async function fetchText(url, headers) {
  const res = await fetch(url, {
    headers,
    redirect: "follow",
  });
  const text = await res.text();
  return { status: res.status, url: res.url, text };
}

async function checkPath(pathname) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const slug = path.split("/").filter(Boolean).pop();
  const pageUrl = `${siteUrl}${path}`;
  const api = `${apiUrl}/footer-pages/pagesBySlug/${encodeURIComponent(slug)}`;

  const [pageRes, apiRes] = await Promise.all([
    fetchText(pageUrl, {
      "User-Agent": GOOGLEBOT_UA,
      Accept: "text/html",
    }),
    fetchText(api, { Accept: "application/json" }),
  ]);

  let cms = null;
  try {
    cms = JSON.parse(apiRes.text);
  } catch {
    cms = null;
  }

  const blocks = [];
  walkBlocks(cms?.data?.blocks, blocks);
  const visible = visibleDocumentText(pageRes.text);
  const visibleNorm = normalize(visible);
  const rawNorm = normalize(decodeEntities(pageRes.text));
  const hasWidgetInHtml = /<div[^>]*data-widget="html-css"/i.test(
    pageRes.text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  );
  const hasCsrPlaceholder = /min-h-\[40vh\]/.test(
    pageRes.text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  );

  const groups = blocks.map((block) => {
    const { counted, hit, missing, chars, charsHit } = countInVisible(block.samples, visibleNorm);
    const scriptOnly = missing.filter((sample) =>
      rawNorm.includes(normalize(sample))
    );
    return {
      kind: block.kind,
      samples: counted,
      inVisibleHtml: hit,
      chars,
      charsHit,
      onlyInScript: scriptOnly.length,
      missingEntirely: missing.length - scriptOnly.length,
      missingPreview: missing.slice(0, 2),
    };
  });

  const bodyGroups = groups.filter((g) => g.kind === "htmlCss" || g.kind === "text");
  const bodySamples = bodyGroups.reduce((n, g) => n + g.samples, 0);
  const bodyVisible = bodyGroups.reduce((n, g) => n + g.inVisibleHtml, 0);
  const bodyChars = bodyGroups.reduce((n, g) => n + g.chars, 0);
  const bodyCharsHit = bodyGroups.reduce((n, g) => n + g.charsHit, 0);
  let verdict = "no-cms-body";
  if (bodySamples > 0 && bodyVisible === bodySamples) verdict = "ssr";
  else if (bodyVisible === 0) verdict = "csr";
  else verdict = "partial";

  return {
    path,
    finalUrl: pageRes.url,
    http: pageRes.status,
    title: cms?.data?.title || "",
    htmlBytes: pageRes.text.length,
    hasWidgetInHtml,
    hasCsrPlaceholder,
    verdict,
    bodyVisible,
    bodySamples,
    bodyChars,
    bodyCharsHit,
    groups,
  };
}

function printResult(result) {
  console.log(`\n${result.path}`);
  console.log(`  status ${result.http}  ${result.finalUrl}`);
  console.log(`  cms title: ${result.title || "(none)"}`);
  console.log(`  html bytes: ${result.htmlBytes}`);
  console.log(`  html/css widget element in document: ${result.hasWidgetInHtml ? "yes" : "no"}`);
  console.log(`  client-only placeholder: ${result.hasCsrPlaceholder ? "yes" : "no"}`);
  console.log(
    `  body text in raw HTML: ${result.bodyVisible}/${result.bodySamples} pieces, ${result.bodyCharsHit}/${result.bodyChars} chars  => ${result.verdict.toUpperCase()}`
  );
  for (const group of result.groups) {
    console.log(
      `  - ${group.kind}: ${group.inVisibleHtml}/${group.samples} pieces, ${group.charsHit}/${group.chars} chars` +
        (group.onlyInScript ? `, ${group.onlyInScript} only inside script` : "") +
        (group.missingEntirely ? `, ${group.missingEntirely} missing` : "")
    );
    for (const line of group.missingPreview) {
      console.log(`      missing: ${line.slice(0, 110)}`);
    }
  }
}

const paths = process.argv.slice(2).filter(Boolean);
const targets = paths.length ? paths : ["/about-us/", "/contact-us/"];

console.log(`Googlebot raw-HTML check`);
console.log(`site ${siteUrl}`);
console.log(`api  ${apiUrl}`);

let failed = 0;
for (const path of targets) {
  try {
    const result = await checkPath(path);
    printResult(result);
    if (result.http !== 200 || result.verdict === "csr" || result.verdict === "partial") {
      failed += 1;
    }
  } catch (error) {
    failed += 1;
    console.log(`\n${path}`);
    console.log(`  ERROR ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(
  failed
    ? `\n${failed} page(s) are not fully in the raw HTML.`
    : `\nChecked pages include their CMS body in the raw HTML.`
);
process.exit(failed ? 1 : 0);
