import createMDX from "@next/mdx";
const withMDX = createMDX({});
export default withMDX({
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: import.meta.dirname },
  // One id per build: the service worker URL changes with it, so each deploy refreshes the offline cache.
  env: { NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now())).slice(0, 12) },
  headers: () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
      ],
    },
  ],
  // Lesson URLs gained a book segment; old links only ever pointed at the original TOEIC book.
  redirects: () => [
    { source: "/lessons/:id(\\d+)", destination: "/books/toeic-600/lessons/:id", permanent: true },
    // Content review moved into the admin page's content area.
    { source: "/review", destination: "/admin#content", permanent: false },
  ],
});
