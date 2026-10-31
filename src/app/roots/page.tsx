import Link from "next/link";
import type { Metadata } from "next";
import { roots } from "../../data/roots";

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
      <div className="roots-grid">
        {roots.map((root) => (
          <Link className="panel root-card" href={`/roots/${root.id}`} key={root.id}>
            <h2 lang="en">{root.forms.join(" / ")}</h2>
            <p>{root.meaning}</p>
            <span className="muted">{root.words.length} từ · Khám phá →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
