import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [catalog, collection, articles] = await Promise.all([
  json("src/content/catalog.json"),
  json("src/content/manifest.json"),
  json("content/knowledge/manifest.json"),
]);
assert.equal(catalog.words.length, collection.expectedEntries, "Collection entry count mismatch");
assert.equal(catalog.lessons.length, collection.expectedLessons, "Collection lesson count mismatch");
const ids = new Set(catalog.words.map((word) => word.id));
const slugs = new Set();
for (const article of articles) {
  assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(!slugs.has(article.slug), "Duplicate article slug");
  slugs.add(article.slug);
  for (const field of ["title", "description", "version", "targetLanguage", "explanationLanguage", "source"])
    assert(typeof article[field] === "string" && article[field].trim(), `Missing ${field}`);
  assert(typeof article.published === "boolean");
  const mdx = await readFile(new URL(`content/knowledge/${article.slug}.mdx`, root), "utf8");
  // Controlled repo authoring requires literal Term IDs, so this check never executes MDX.
  const terms = [...mdx.matchAll(/<Term\s+itemId="([^"]+)"\s+label="([^"]+)"/g)];
  assert.equal((mdx.match(/<Term\b/g) ?? []).length, terms.length, "Term must have literal itemId and label");
  const linked = new Set(terms.map((term) => term[1]));
  assert.deepEqual([...linked].sort(), [...new Set(article.itemIds)].sort(), "Article manifest links differ from MDX");
  for (const id of linked) assert(ids.has(id), `Unknown vocabulary ID: ${id}`);
}
console.log(
  `Validated ${articles.length} article(s), ${collection.id}: ${ids.size} entries/${catalog.lessons.length} lessons; no broken vocabulary links.`,
);
