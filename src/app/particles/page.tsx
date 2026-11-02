import Link from "next/link";
import type { Metadata } from "next";
import { particles } from "../../data/roots";
import { SenseJump, SenseMap } from "../../components/SenseMap";

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
      <SenseJump items={particles} label="Chọn giới từ" />
      <div className="particle-list">
        {particles.map((particle) => (
          <SenseMap item={particle} key={particle.word} />
        ))}
      </div>
    </div>
  );
}
