import type { IconName } from "@/components/Icon";
import type { QuizType } from "@/state/ui";

export const QUIZ_TYPES: Record<QuizType, { label: string; icon: IconName }> = {
  formation: { label: "Biến đổi từ loại", icon: "branch" },
  synonym: { label: "Đồng nghĩa & Trái nghĩa", icon: "compare" },
  meaning: { label: "Nghĩa của từ", icon: "book" },
  build: { label: "Ghép từ", icon: "puzzle" },
  recall: { label: "Điền từ vào câu", icon: "book" },
  listening: { label: "Nghe & gõ từ", icon: "volume" },
  mixed: { label: "Theo bậc", icon: "layers" },
};
