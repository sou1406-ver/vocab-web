import Link from "next/link";
import type { Metadata } from "next";
import { affixes } from "../../data/affixes";

export const metadata: Metadata = { title: "Tiền tố & hậu tố", robots: { index: false, follow: false } };
export default function Page() {
  const all = affixes();
  const groups = [
    { role: "prefix", title: "Tiền tố" },
    { role: "suffix", title: "Hậu tố" },
  ] as const;
  return (
    <div className="page affixes-page">
      <Link href="/roots" className="back-link">
        ← Gốc từ
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PHÂN TÍCH TỪ</p>
          <h1 tabIndex={-1}>Tiền tố & hậu tố</h1>
          <p className="page-subtitle">{all.length} phụ tố gặp trong sách và kho gốc từ.</p>
        </div>
      </div>
      {groups.map((group) => {
        const items = all.filter((entry) => entry.role === group.role);
        return (
          <section className="affix-group" aria-labelledby={`affix-${group.role}`} key={group.role}>
            <h2 id={`affix-${group.role}`}>
              {group.title} <span className="muted">· {items.length}</span>
            </h2>
            <div className="affix-grid">
              {items.map((entry) => (
                <Link className="panel affix-card" href={`/affixes/${entry.slug}`} key={entry.slug}>
                  <b lang="en">{entry.text}</b>
                  <span>{entry.meaning || "—"}</span>
                  <small className="muted">{entry.rootWords.length + entry.bookWords.length} từ</small>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
