import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { roots, rootById, rootsContent } from "../../../data/roots";
import { PartChips } from "../../../components/PartChips";
import { RootBookBadge } from "../../../components/RootBookBadge";

export function generateStaticParams() {
  return roots.map((root) => ({ id: root.id }));
}
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const root = rootById((await params).id);
  return { title: root ? `Gốc ${root.forms.join(" / ")}` : "Gốc từ", robots: { index: false, follow: false } };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const root = rootById((await params).id);
  if (!root) notFound();
  return (
    <div className="page root-detail-page">
      <Link href="/roots" className="back-link">
        ← Tất cả gốc từ
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">GỐC TỪ · HỌC SÂU</p>
          <h1 lang="en" tabIndex={-1}>
            {root.forms.join(" / ")}
          </h1>
          <p className="page-subtitle">{root.meaning}</p>
        </div>
      </div>
      <section className="panel root-core-image" aria-labelledby="root-core-title">
        <Lightbulb aria-hidden="true" size={32} />
        <div>
          <h2 id="root-core-title">Hình ảnh cốt lõi</h2>
          <p>{root.image}</p>
        </div>
      </section>
      <p className="root-origin">
        <strong>Nguồn gốc:</strong> <span lang="en">{root.origin}</span>
      </p>
      {root.note && <p className="quiet-note">{root.note}</p>}
      <div className="root-word-list">
        {root.words.map((word, index) => (
          <article className="panel root-word" key={`${word.text}:${index}`}>
            <div className="root-word-heading">
              <div>
                <h2 lang="en">{word.text}</h2>
                <span className="pos">{word.pos}</span>
              </div>
              <RootBookBadge book={word.book} />
            </div>
            <p className="root-word-meaning">{word.meaning}</p>
            <PartChips
              label={word.text}
              parts={word.parts.map((part) => ({
                ...part,
                meaning: part.role === "root" ? root.meaning : rootsContent.affixes[part.text],
              }))}
            />
            <p className="root-logic">{word.logic}</p>
            {word.family.length > 0 && (
              <section className="root-word-family" aria-label={`Họ từ của ${word.text}`}>
                <h3>Họ từ</h3>
                <ul>
                  {word.family.map((form, familyIndex) => (
                    <li key={`${form.text}:${familyIndex}`}>
                      <b lang="en">{form.text}</b>
                      <span className="pos">{form.pos}</span>
                      <span>{form.meaning}</span>
                      <RootBookBadge book={form.book} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
