// Run with `node scripts/build-journey-art.mjs` after adding PNGs to art-source/.
import { mkdir, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = new URL("../art-source/", import.meta.url);
const output = new URL("../src/features/hanh-trinh/art/web/", import.meta.url);
await mkdir(output, { recursive: true });

// Five 240 px columns for the largest plant previews at roughly 2×.
const sheetWidth = 5 * 240;
let totalBytes = 0;
const files = await readdir(source, { withFileTypes: true });
for (const file of files) {
  if (!file.isFile() || !file.name.endsWith(".png")) continue;
  const input = new URL(encodeURIComponent(file.name), source);
  const target = new URL(encodeURIComponent(file.name.replace(/\.png$/, ".webp")), output);
  const { size } = await stat(input);
  const isMap = file.name.startsWith("map-");
  const width = file.name === "sprout.png" ? 240 : isMap ? 1100 : sheetWidth;
  const encoded = await sharp(fileURLToPath(input))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: isMap ? 82 : 80, alphaQuality: 10, effort: 6 })
    .toFile(fileURLToPath(target));
  totalBytes += encoded.size;
  console.log(`${file.name}: ${size} → ${encoded.size} bytes`);
}
console.log(`Total: ${totalBytes} bytes`);
