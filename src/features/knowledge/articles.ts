import source from "../../../content/knowledge/manifest.json";
export const articles = source;
export function findArticle(slug: string) {
  return articles.find((article) => article.slug === slug && article.published);
}
