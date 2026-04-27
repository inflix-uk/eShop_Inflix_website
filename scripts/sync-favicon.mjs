/**
 * Builds public/favicon.ico from src/app/icon.svg so /favicon.ico returns a real file.
 * Non-HTML routes (e.g. /sitemap.xml) do not run the root layout; browsers still request /favicon.ico.
 * Next dev otherwise returns an empty 404 for /favicon.ico when no file exists, so tabs show a stale cached icon.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "src", "app", "icon.svg");
const outPath = path.join(root, "public", "favicon.ico");

const png = await sharp(svgPath).resize(32, 32).png().toBuffer();
const ico = await pngToIco([png]);
fs.writeFileSync(outPath, ico);
