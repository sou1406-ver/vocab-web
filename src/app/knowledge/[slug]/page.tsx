import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Article from "../../../../content/knowledge/reading-at-work.mdx";
import { findArticle, articles } from "../../../features/knowledge/articles";
import { ReadingPosition } from "../../../features/knowledge/ReadingPosition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteOrigin } from "../../../lib/site";

export function generateStaticParams() {
  return articles.filter((a) => a.published).map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = findArticle((await params).slug);
  const origin = siteOrigin();
  return article
    ? {
        title: article.title,
        description: article.description,
        ...(origin ? { alternates: { canonical: origin + `/knowledge/${article.slug}` } } : {}),
      }
    : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const article = findArticle((await params).slug);
  if (!article) notFound();
  return (
    <div className="page">
      <article className="reading-article">
        <ReadingPosition slug={article.slug} version={article.version} />
        <Link className="back-link" href="/knowledge">
          ← Tất cả bài kiến thức
        </Link>
        <p className="eyebrow">ĐỌC TRONG NGỮ CẢNH · TIẾNG ANH</p>
        <h1 tabIndex={-1} className="mt-4">
          {article.title}
        </h1>
        <p className="page-subtitle">{article.description}</p>
        <div className="article-meta">
          <Badge variant="secondary">{article.minutes} phút đọc</Badge>
          <span className="text-sm text-muted-foreground">
            {article.itemIds.length} từ & cụm · Giải thích tiếng Việt
          </span>
        </div>
        <div className="reading-body">
          <Article />
        </div>
        <div className="reading-actions">
          <Button asChild className="min-h-11">
            <Link href={`/library?filter=saved&from=${article.slug}`}>Xem từ đã lưu</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/lessons/1">Mở bài học TOEIC 1</Link>
          </Button>
        </div>
        <p className="saved-notice">{article.source}</p>
      </article>
    </div>
  );
}
