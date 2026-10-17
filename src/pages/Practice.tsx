import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/Icon";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

const ways: { to: string; title: string; icon: IconName; description: string; action: string }[] = [
  {
    to: "/network",
    title: "Trường từ",
    icon: "network",
    description: "Khám phá từ gốc, họ từ, cách cấu tạo cùng các từ đồng nghĩa và trái nghĩa.",
    action: "Mở trường từ",
  },
  {
    to: "/flashcards",
    title: "Flashcard",
    icon: "layers",
    description: "Tự kiểm tra trí nhớ rồi đánh dấu từ mới, đang học hoặc đã thuộc.",
    action: "Ôn bằng flashcard",
  },
  {
    to: "/quiz",
    title: "Bài tập",
    icon: "pencil",
    description: "Luyện nhận diện từ loại, cấu tạo từ và nghĩa trong câu hỏi TOEIC.",
    action: "Làm bài tập",
  },
  {
    to: "/everyday",
    title: "Tiếng Anh đời thường",
    icon: "quote",
    description: "Mở rộng vốn từ với cụm từ, phrasal verbs, thành ngữ và tiếng lóng có ghi chú ngữ cảnh.",
    action: "Khám phá bộ sưu tập",
  },
];

export function PracticePage() {
  return (
    <div className="practice-hub">
      <header className="page-head">
        <p className="kicker">CHỌN CÁCH HỌC HÔM NAY</p>
        <h1>Luyện tập</h1>
        <p className="lede">Chọn cách học từ vựng hoặc khám phá thêm cách người ta dùng tiếng Anh trong đời thường.</p>
      </header>

      <section className="practice-options" aria-label="Các cách luyện tập">
        {ways.map((way) => (
          <SpotlightCard
            key={way.to}
            className="card practice-option"
            spotlightColor="var(--indigo)"
            intensity={0.1}
            borderGlow={0.35}
            spotlightSize={240}
            flare={false}
          >
            <span className="practice-option-icon"><Icon name={way.icon} size="lg" /></span>
            <h2>{way.title}</h2>
            <p className="muted">{way.description}</p>
            <Link className="practice-option-link" to={way.to}>
              {way.action} <Icon name="right" size="sm" />
            </Link>
          </SpotlightCard>
        ))}
      </section>
    </div>
  );
}
