import Link from "next/link";
import type { Metadata } from "next";
import { coreWords } from "../../data/roots";
import { SenseJump, SenseMap } from "../../components/SenseMap";

export const metadata: Metadata = { title: "Từ đa nghĩa", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="page particles-page">
      <Link href="/roots" className="back-link">
        ← Gốc từ
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HỌC SÂU · TỪ ĐA NGHĨA</p>
          <h1 tabIndex={-1}>Từ đa nghĩa</h1>
          <p className="page-subtitle">
            {coreWords.length} từ quen mà nhiều nghĩa — tìm nghĩa lõi rồi các nghĩa còn lại tự nối vào.
          </p>
        </div>
      </div>
      <SenseJump items={coreWords} label="Chọn từ" />
      <div className="particle-list">
        {coreWords.map((word) => (
          <SenseMap item={word} key={word.word} />
        ))}
      </div>
    </div>
  );
}
