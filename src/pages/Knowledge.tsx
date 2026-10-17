import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";

const parts = [
  {
    name: "Danh từ",
    key: "Noun",
    className: "b-indigo",
    question: "Ai hoặc cái gì?",
    clues: "Đứng sau a/an/the, tính từ; thường làm chủ ngữ hoặc tân ngữ.",
    example: "The report was sent this morning.",
    answer: "report",
  },
  {
    name: "Động từ",
    key: "Verb",
    className: "b-violet",
    question: "Làm gì hoặc ở trạng thái nào?",
    clues: "Đứng sau chủ ngữ; theo sau can, will, should là động từ nguyên mẫu.",
    example: "The team completed the project.",
    answer: "completed",
  },
  {
    name: "Tính từ",
    key: "Adjective",
    className: "b-emerald",
    question: "Đặc điểm gì?",
    clues: "Thường đứng trước danh từ hoặc sau be, seem, become.",
    example: "We received a detailed proposal.",
    answer: "detailed",
  },
  {
    name: "Trạng từ",
    key: "Adverb",
    className: "b-amber",
    question: "Theo cách nào, mức độ ra sao?",
    clues: "Bổ nghĩa cho động từ, tính từ hoặc trạng từ khác; nhiều từ tận cùng bằng -ly.",
    example: "Please respond promptly.",
    answer: "promptly",
  },
];

export function KnowledgePage() {
  return (
    <div className="knowledge-page">
      <header className="page-head">
        <p className="kicker">NGỮ PHÁP THỰC DỤNG · TOEIC</p>
        <h1>Kiến thức</h1>
        <p className="lede">
          Nhìn vị trí chỗ trống để xác định từ loại cần điền. Sau đó mới dùng nghĩa và cấu tạo từ để chọn đáp án.
        </p>
      </header>

      <section aria-labelledby="pos-title">
        <div className="knowledge-section-head">
          <div>
            <h2 id="pos-title" className="section-title">Bốn từ loại thường gặp</h2>
            <p className="muted">Trong Part 5, hãy hỏi từ còn thiếu đang giữ vai trò gì trong câu.</p>
          </div>
        </div>
        <div className="knowledge-grid">
          {parts.map((part) => (
            <article className="card knowledge-card" key={part.key}>
              <div className="row between">
                <h3>{part.name}</h3>
                <span className={`badge ${part.className}`}>{part.key}</span>
              </div>
              <p className="knowledge-question">{part.question}</p>
              <p className="muted">{part.clues}</p>
              <p className="knowledge-example">{part.example.split(part.answer)[0]}<b>{part.answer}</b>{part.example.split(part.answer)[1]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card knowledge-tip">
        <div>
          <p className="eyebrow">MẸO LÀM PART 5</p>
          <h2>Vị trí trước, nghĩa sau</h2>
          <p className="muted">
            Xác định cấu trúc câu quanh chỗ trống trước. Đuôi từ như <b>-tion</b>, <b>-ive</b> hay <b>-ly</b> chỉ là
            dấu hiệu gợi ý — vẫn cần kiểm tra cách dùng trong câu.
          </p>
        </div>
      </section>

      <section className="card knowledge-affix">
        <div className="knowledge-affix-icon"><Icon name="puzzle" size="lg" /></div>
        <div>
          <h2>Cấu tạo từ</h2>
          <p className="muted">
            Tiền tố thường đổi nghĩa; hậu tố thường giúp nhận ra hoặc biến đổi từ loại. Khám phá các phụ tố trong bộ từ
            TOEIC và xem những từ nào cùng sử dụng chúng.
          </p>
        </div>
        <Link className="btn" to="/affixes">Mở thư viện phụ tố <Icon name="right" size="sm" /></Link>
      </section>
    </div>
  );
}
