import createMDX from "@next/mdx";
const withMDX = createMDX({});
export default withMDX({
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: import.meta.dirname },
  // Lesson URLs gained a book segment; old links only ever pointed at the original TOEIC book.
  redirects: () => [{ source: "/lessons/:id(\\d+)", destination: "/books/toeic-600/lessons/:id", permanent: true }],
});
