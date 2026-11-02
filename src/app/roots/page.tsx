import Link from "next/link";
import type { Metadata } from "next";
import { coreWords, particles, prefixFamilies, roots } from "../../data/roots";
import { affixSlug } from "../../data/affix-slug";

export const metadata: Metadata = { title: "Gốc từ", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="page roots-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">HỌC SÂU · TIẾNG ANH</p>
          <h1 tabIndex={-1}>Gốc từ</h1>
          <p className="page-subtitle">{roots.length} gốc từ — nhìn những từ quen thuộc từ một góc khác.</p>
        </div>
      </div>
      <p className="roots-intro muted">Kho mở rộng để tham khảo, chưa tính vào tiến độ và chưa có bài tập riêng.</p>
      <Link className="text-link roots-affix-link" href="/affixes">
        Xem tiền tố & hậu tố →
      </Link>
      <div className="roots-grid">
        {roots.map((root) => (
          <Link className="panel root-card" href={`/roots/${root.id}`} key={root.id}>
            <h2 lang="en">{root.forms.join(" / ")}</h2>
            <p>{root.meaning}</p>
            <span className="muted">{root.words.length} từ · Khám phá →</span>
          </Link>
        ))}
      </div>
      {prefixFamilies.length > 0 && (
        <section className="roots-extra" aria-labelledby="prefix-families-title">
          <h2 id="prefix-families-title">
            Họ tiền tố <span className="muted">· {prefixFamilies.length}</span>
          </h2>
          <div className="roots-grid">
            {prefixFamilies.map((family) => (
              <Link
                className="panel root-card"
                href={`/affixes/${affixSlug("prefix", family.affix)}`}
                key={family.affix}
              >
                <h3 lang="en">{family.affix}</h3>
                <p>{family.meaning}</p>
                <span className="muted">{family.words.length} từ · Khám phá →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {particles.length > 0 && (
        <section className="roots-extra" aria-labelledby="particles-title">
          <h2 id="particles-title">
            Giới từ <span className="muted">· {particles.length}</span>
          </h2>
          <div className="roots-grid">
            {particles.map((particle) => (
              <Link className="panel root-card" href={`/particles#${particle.word}`} key={particle.word}>
                <h3 lang="en">{particle.word}</h3>
                <p>{particle.core}</p>
                <span className="muted">{particle.senses.length} cách dùng · Khám phá →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {coreWords.length > 0 && (
        <section className="roots-extra" aria-labelledby="core-words-title">
          <h2 id="core-words-title">
            Từ đa nghĩa <span className="muted">· {coreWords.length}</span>
          </h2>
          <div className="roots-grid">
            {coreWords.map((word) => (
              <Link className="panel root-card" href={`/core-words#${word.word}`} key={word.word}>
                <h3 lang="en">{word.word}</h3>
                <p>{word.core}</p>
                <span className="muted">{word.senses.length} cách dùng · Khám phá →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
