// Run with `node scripts/build-journey-art.mjs` after adding PNG atlases to art/source.
import { mkdir, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = new URL("../src/features/hanh-trinh/art/source/", import.meta.url);
const output = new URL("../src/features/hanh-trinh/art/web/", import.meta.url);
await mkdir(output, { recursive: true });

const files = await readdir(source, { withFileTypes: true });
for (const file of files) {
  if (!file.isFile() || !file.name.endsWith(".png")) continue;
  const input = new URL(encodeURIComponent(file.name), source);
  const target = new URL(encodeURIComponent(file.name.replace(/\.png$/, ".webp")), output);
  const { size } = await stat(input);
  const encoded = await sharp(fileURLToPath(input)).webp({ lossless: true, effort: 6 }).toFile(fileURLToPath(target));
  console.log(`${file.name}: ${size} → ${encoded.size} bytes`);
}
