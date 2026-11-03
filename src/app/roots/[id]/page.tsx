import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { roots, rootById } from "../../../data/roots";
import { RootWordCard } from "../../../components/RootWordCard";
import { RootQuiz } from "../../../components/RootQuiz";
import { RootStudyButton } from "../../../components/RootStudyButton";
import { makeRootQuiz } from "../../../domain/root-quiz";

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
      <RootStudyButton
        label={`Gốc ${root.forms[0]}`}
        wordIds={[
          ...new Set(
            root.words.flatMap((word) => [word.book?.wordId, ...word.family.map((form) => form.book?.wordId)]),
          ),
        ].filter((id): id is string => Boolean(id))}
      />
      <div className="root-word-list">
        {root.words.map((word, index) => (
          <RootWordCard word={word} root={root} key={`${word.text}:${index}`} />
        ))}
      </div>
      <RootQuiz rounds={[0, 1, 2].map((round) => makeRootQuiz(root, roots, round ? `${root.id}:${round}` : root.id))} />
    </div>
  );
}
