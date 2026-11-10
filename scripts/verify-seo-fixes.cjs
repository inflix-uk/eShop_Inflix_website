const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const sourcePath = path.join(__dirname, "../src/lib/siteTrailingSlash.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: sourcePath,
}).outputText;

const mod = { exports: {} };
const wrapped = `(function (exports, require, module) { ${compiled}\n})`;
const runner = eval(wrapped);
runner(mod.exports, Module.createRequire(sourcePath), mod);
const lib = mod.exports;

const html = `
<a href="https://www.aromadesire.com/categories/car-fragrance/vent-clip/">Vent</a>
<a href="https://www.aromadesire.com/categories/home-fragrances/reed-diffuser/">Reed</a>
<a href="https://www.aromadesire.com/categories/car-fragrance/hanging/">Hanging</a>
<a href="/categories/Home-Fragrances/">Home</a>
<a href="https://www.royalmail.com/track">External</a>
<h1>Luxury Home Fragrance for Your Space Feal Like Premium</h1>
<p>No sprays, no liquids to spill.</p>
`;

const rewritten = lib.rewriteInternalHrefsInHtml(html);
assert.match(rewritten, /href="https:\/\/aromadesire\.com\/categories\/car-fragrance\/vent-clip\/"/);
assert.match(rewritten, /href="https:\/\/aromadesire\.com\/categories\/home-fragrances\/reed-diffuser\/"/);
assert.match(rewritten, /href="https:\/\/aromadesire\.com\/categories\/car-fragrance\/hanging\/"/);
assert.match(rewritten, /href="\/categories\/home-fragrances\/"/);
assert.match(rewritten, /href="https:\/\/www\.royalmail\.com\/track"/);
assert.match(rewritten, /Space Feel Like Premium/);
assert.doesNotMatch(rewritten, /Space Feal Like Premium/);
assert.match(rewritten, /No sprays, no liquids to spill\./);

const hanging = lib.demoteCmsH1(
  lib.fixHangingProductCopy(
    '<h1 style="font-size:40px">English Pear Car Air Freshener - Hanging</h1><p>No sprays, no liquids to spill.</p>'
  )
);
assert.match(hanging, /<h2 style="font-size:40px">/);
assert.match(hanging, /<\/h2>/);
assert.doesNotMatch(hanging, /<h1/);
assert.match(hanging, /No sprays\. Scent releases through the wooden cap\./);
assert.doesNotMatch(hanging, /no liquids to spill/);

assert.equal(lib.isHangingProduct({ producturl: "luxury-car-air-fragrance-english-pear-hanging" }), true);
assert.equal(lib.isHangingProduct({ producturl: "luxury-car-air-fragrance-english-pear-vent-clip" }), false);

assert.equal(lib.apexHostFromWww("www.aromadesire.com"), "aromadesire.com");
assert.equal(lib.apexHostFromWww("aromadesire.com"), null);
assert.equal(
  lib.canonicalizeRobotsSitemap("Sitemap: https://www.aromadesire.com/sitemap.xml\n"),
  "Sitemap: https://aromadesire.com/sitemap.xml\n"
);

assert.equal(lib.normalizeInternalHref("/categories/Home-Fragrances"), "/categories/home-fragrances/");

console.log("seo fix checks passed");
