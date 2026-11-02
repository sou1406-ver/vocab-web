import Link from "next/link";
import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { particles } from "../../data/roots";

export const metadata: Metadata = { title: "Giới từ", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="page particles-page">
      <Link href="/roots" className="back-link">
        ← Gốc từ
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HỌC SÂU · GIỚI TỪ</p>
          <h1 tabIndex={-1}>Giới từ</h1>
          <p className="page-subtitle">
            {particles.length} giới từ — mỗi từ một hình ảnh cốt lõi, mọi nghĩa đều quy về đó.
          </p>
        </div>
      </div>
      <nav className="particle-jump" aria-label="Chọn giới từ">
        {particles.map((particle) => (
          <a className="particle-chip" href={`#${particle.word}`} lang="en" key={particle.word}>
            {particle.word}
          </a>
        ))}
      </nav>
      <div className="particle-list">
        {particles.map((particle) => (
          <section
            className="panel particle"
            id={particle.word}
            aria-labelledby={`particle-${particle.word}`}
            key={particle.word}
          >
            <h2 id={`particle-${particle.word}`} lang="en">
              {particle.word}
            </h2>
            <p className="particle-core">{particle.core}</p>
            <div className="root-core-image">
              <Lightbulb aria-hidden="true" size={28} />
              <p>{particle.image}</p>
            </div>
            {particle.note && <p className="quiet-note">{particle.note}</p>}
            <ul className="particle-senses">
              {particle.senses.map((sense, index) => (
                <li key={`${sense.example}:${index}`}>
                  <b lang="en">{sense.example}</b>
                  <span>{sense.meaning}</span>
                  <small className="muted">{sense.logic}</small>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
