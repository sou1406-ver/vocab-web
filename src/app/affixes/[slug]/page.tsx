import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { affixBySlug, affixes } from "../../../data/affixes";
import { RootWordCard } from "../../../components/RootWordCard";

export function generateStaticParams() {
  return affixes().map((entry) => ({ slug: entry.slug }));
}
export const dynamicParams = false;
const roleLabel = { prefix: "Tiền tố", suffix: "Hậu tố" } as const;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const entry = affixBySlug((await params).slug);
  return {
    title: entry ? `${roleLabel[entry.role]} ${entry.text}` : "Phụ tố",
    robots: { index: false, follow: false },
  };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const entry = affixBySlug((await params).slug);
  if (!entry) notFound();
  return (
    <div className="page affix-detail-page">
      <Link href="/affixes" className="back-link">
        ← Tất cả tiền tố & hậu tố
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{roleLabel[entry.role].toUpperCase()} · PHÂN TÍCH TỪ</p>
          <h1 lang="en" tabIndex={-1}>
            {entry.text}
          </h1>
          <p className="page-subtitle">{entry.meaning || "Chưa có ghi chú nghĩa cho phụ tố này."}</p>
        </div>
      </div>
      {entry.family && (
        <section className="affix-family" aria-labelledby="affix-family-title">
          <div className="panel root-core-image">
            <Lightbulb aria-hidden="true" size={32} />
            <div>
              <h2 id="affix-family-title">Hình ảnh cốt lõi</h2>
              <p>{entry.family.image}</p>
            </div>
          </div>
          <p className="affix-family-meaning">
            <strong lang="en">{entry.text}</strong> = {entry.family.meaning}
          </p>
          {entry.family.note && <p className="quiet-note">{entry.family.note}</p>}
          <div className="root-word-list">
            {entry.family.words.map((word, index) => (
              <RootWordCard word={word} key={`${word.text}:${index}`} />
            ))}
          </div>
        </section>
      )}
      {entry.rootWords.length > 0 && (
        <section className="panel affix-section" aria-labelledby="affix-roots-title">
          <div className="section-heading">
            <h2 id="affix-roots-title">Trong kho gốc từ</h2>
            <span className="muted">{entry.rootWords.length} từ</span>
          </div>
          <ul className="affix-word-list">
            {entry.rootWords.map((word) => (
              <li key={`${word.rootId}:${word.text}`}>
                <b lang="en">{word.text}</b>
                <span className="pos" data-pos={word.pos}>
                  {word.pos}
                </span>
                <span className="affix-word-meaning">{word.meaning}</span>
                <Link className="text-link" href={`/roots/${word.rootId}`}>
                  Gốc <span lang="en">{word.rootForms[0]}</span> →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {entry.bookWords.length > 0 && (
        <section className="panel affix-section" aria-labelledby="affix-book-title">
          <div className="section-heading">
            <h2 id="affix-book-title">Trong sách</h2>
            <span className="muted">{entry.bookWords.length} từ</span>
          </div>
          <ul className="affix-word-list">
            {entry.bookWords.map((word) => (
              <li key={`${word.bookId}:${word.form}`}>
                <b lang="en">{word.form}</b>
                <span className="pos" data-pos={word.pos}>
                  {word.pos}
                </span>
                <span className="affix-word-meaning">{word.meaning}</span>
                <Link className="root-book-badge" href={`/books/${word.bookId}/lessons/${word.lesson}`}>
                  Bài {word.lesson}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
