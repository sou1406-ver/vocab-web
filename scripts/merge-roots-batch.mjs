// Usage: node scripts/merge-roots-batch.mjs <batch-delta.json> [--write]
// Without --write it only prints what would change. The merged content is validated before anything is written.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { mergeRootsBatch } from "./lib/roots-merge.mjs";
import { validateRootsContent } from "./lib/roots-content.mjs";

const [deltaPath, ...flags] = process.argv.slice(2);
if (!deltaPath) {
  console.error("Usage: node scripts/merge-roots-batch.mjs <batch-delta.json> [--write]");
  process.exit(1);
}
const root = new URL("../", import.meta.url);
const target = new URL("content/roots/roots.json", root);
const content = JSON.parse(await readFile(target, "utf8"));
const delta = JSON.parse(await readFile(deltaPath, "utf8"));

const ids = new Set();
for (const entry of await readdir(new URL("src/content/books/", root), { withFileTypes: true }))
  if (entry.isDirectory()) {
    const catalog = JSON.parse(await readFile(new URL(`src/content/books/${entry.name}/catalog.json`, root), "utf8"));
    for (const word of catalog.words) ids.add(word.id);
  }

const { content: merged, added, skipped } = mergeRootsBatch(content, delta);
validateRootsContent(merged, ids);
console.log(`Added ${added.length}:`);
for (const line of added) console.log(`  + ${line}`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} (already in the repo, not overwritten):`);
  for (const line of skipped) console.log(`  = ${line}`);
}
if (flags.includes("--write")) {
  const filepath = fileURLToPath(target);
  // Same formatting as `npm run format`, so a merge only shows real content changes in the diff.
  await writeFile(
    target,
    await format(JSON.stringify(merged, null, 2), { ...(await resolveConfig(filepath)), filepath }),
  );
  console.log(`Wrote ${target.pathname}`);
} else console.log("Dry run. Add --write to save.");
