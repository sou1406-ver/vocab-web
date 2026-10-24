import "../learning.css";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import { cx } from "@/lib/util";
import { ensureBookLesson } from "@/state/actions";
import { useUI } from "@/state/ui";
import { useLessonDetails } from "@/lib/useLessonDetails";
import { BookExercises } from "../Book";
import { AutoQuiz } from "./AutoQuiz";

export function QuizPage() {
  const mode = useUI((s) => s.quiz.mode);
  const setQuiz = useUI((s) => s.setQuiz);
  const detailsReady = useLessonDetails();
  useEffect(() => {
    if (mode === "book") ensureBookLesson();
  }, [mode]);
  if (!detailsReady)
    return (
      <div className="card" role="status">
        Đang tải dữ liệu từ vựng…
      </div>
    );
  return (
    <>
      <div className="mode-switch" role="tablist">
        <button
          role="tab"
          aria-selected={mode === "book"}
          className={cx(mode === "book" && "active")}
          onClick={() => setQuiz({ mode: "book" })}
        >
          <Icon name="book" size="sm" /> Bài tập trong sách
        </button>
        <button
          role="tab"
          aria-selected={mode === "auto"}
          className={cx(mode === "auto" && "active")}
          onClick={() => setQuiz({ mode: "auto" })}
        >
          <Icon name="layers" size="sm" /> Tự luyện từ vựng
        </button>
      </div>
      {mode === "book" ? <BookExercises /> : <AutoQuiz />}
    </>
  );
}

