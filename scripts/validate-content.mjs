import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { validateRootsContent } from "./lib/roots-content.mjs";
const root = new URL("../", import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const bookIds = (await readdir(new URL("src/content/books/", root), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
assert(bookIds.length, "No generated books; run npm run data:catalog");
const registry = await readFile(new URL("src/content/books/registry.ts", root), "utf8");
const ids = new Set();
const summaries = [];
for (const id of bookIds) {
  const [book, catalog] = await Promise.all([
    json(`src/content/books/${id}/book.json`),
    json(`src/content/books/${id}/catalog.json`),
  ]);
  assert.equal(book.id, id, `Book folder ${id} has id ${book.id}`);
  assert(registry.includes(`"./${id}/catalog.json"`), `Book ${id} missing from registry`);
  assert.equal(catalog.words.length, book.expectedEntries, `${id}: entry count mismatch`);
  assert.equal(catalog.lessons.length, book.expectedLessons, `${id}: lesson count mismatch`);
  for (const word of catalog.words) {
    assert(book.legacyWordIds || word.id.startsWith(`${id}:`), `${id}: word ID must start with "${id}:": ${word.id}`);
    assert(!ids.has(word.id), `Duplicate word ID across books: ${word.id}`);
    ids.add(word.id);
  }
  summaries.push(`${id}: ${catalog.words.length} entries/${catalog.lessons.length} lessons`);
}
validateRootsContent(await json("content/roots/roots.json"), ids);
const articles = await json("content/knowledge/manifest.json");
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
  `Validated ${articles.length} article(s), ${summaries.join("; ")}; no duplicate IDs or broken vocabulary links.`,
);
