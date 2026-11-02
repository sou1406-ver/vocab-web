/* Vocab Learn service worker: keeps the study app usable offline.
 * Progress already lives in IndexedDB; this only caches the pages and static files needed to open the app.
 * - /_next/static/* (content-hashed): cache first.
 * - Page navigations: network first, cached copy when offline, a small offline page otherwise.
 * - RSC fetches are never cached: when they fail the router falls back to a full navigation, served above.
 * - Other same-origin files (avatars, icons, exercise packs): network first with a cached fallback.
 * - Roots pages: when the learner opens /roots, the index pages and every root/prefix page linked from /roots are stored.
 * Cross-origin requests (Firebase, Google sign-in) are never touched.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const PAGES = `vocab-pages-${VERSION}`;
const ASSETS = `vocab-assets-${VERSION}`;
const CORE_ROUTES = ["/", "/lessons", "/library", "/study", "/progress", "/settings", "/leaderboard"];
const STATIC_ASSET = /\/_next\/static\/[^"'\s)\\]+/g;
// Lesson pages are listed by the app itself (it knows the catalog); only these paths are accepted.
const LESSON_PATH = /^\/books\/[a-z0-9-]+\/lessons\/\d+$/;
// Deep-learning pages: the index pages, then whatever root and affix pages /roots links to (read from its HTML,
// so the app never has to ship the roots data just to list them).
const ROOTS_INDEX = ["/roots", "/affixes", "/particles", "/core-words"];
const ROOTS_LINK = /href="(\/(?:roots\/[a-z0-9-]+|affixes\/(?:prefix|suffix)-[a-z0-9-]+))"/g;

// Stores pages (skipping ones already cached unless refresh is set) and every hashed asset their HTML references.
async function cachePages(routes, refresh) {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const files = new Set();
  for (const route of routes) {
    try {
      if (!refresh && (await pages.match(route))) continue;
      const response = await fetch(route, { cache: "reload", credentials: "same-origin" });
      if (!response.ok || response.redirected) continue;
      const html = await response.clone().text();
      await pages.put(route, response);
      for (const match of html.matchAll(STATIC_ASSET)) files.add(match[0]);
    } catch {
      /* Skip pages that fail; they are cached later when visited online. */
    }
  }
  await Promise.all(
    [...files].map((file) =>
      assets
        .match(file)
        .then((hit) => hit || assets.add(file))
        .catch(() => undefined),
    ),
  );
}

async function cacheRoots() {
  await cachePages(ROOTS_INDEX, false);
  const index = await (await caches.open(PAGES)).match("/roots");
  if (!index) return;
  const links = new Set();
  for (const match of (await index.text()).matchAll(ROOTS_LINK)) links.add(match[1]);
  await cachePages([...links].slice(0, 300), false);
}

self.addEventListener("message", (event) => {
  const { type, urls } = event.data || {};
  if (type === "cache-roots") return event.waitUntil(cacheRoots());
  if (type !== "cache-lessons" || !Array.isArray(urls)) return;
  const routes = urls.filter((url) => typeof url === "string" && LESSON_PATH.test(url)).slice(0, 500);
  event.waitUntil(cachePages(routes, false));
});

self.addEventListener("install", (event) => {
  event.waitUntil(cachePages(CORE_ROUTES, true).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("vocab-") && key !== PAGES && key !== ASSETS)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const offlinePage = () =>
  new Response(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Đang offline · Vocab Learn</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#e9eee4;color:#242e29}
main{max-width:420px;padding:32px;text-align:center}a{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:12px;background:#2f7357;color:#fff;text-decoration:none;font-weight:600}
@media (prefers-color-scheme:dark){body{background:#0b110e;color:#f4f6ef}a{background:#6cc790;color:#0e1512}}</style></head>
<body><main><h1>Bạn đang offline</h1><p>Trang này chưa được lưu trên máy. Tiến độ học vẫn an toàn và sẽ đồng bộ khi có mạng.</p><a href="/">Về Hôm nay</a></main></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic" && !response.redirected) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || (fallback ? fallback() : Response.error());
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request));
  if (request.mode === "navigate") return event.respondWith(networkFirst(request, PAGES, offlinePage));
  if (url.pathname.startsWith("/_next/")) return;
  event.respondWith(networkFirst(request, ASSETS));
});
