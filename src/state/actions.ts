import { useNavigate } from "react-router-dom";
import { LESSON_BY_N } from "@/lib/data";
import { makeQuiz } from "@/lib/quiz";
import { resumeLesson } from "@/lib/progress";
import { shuffle } from "@/lib/util";
import { useProfile } from "./profile";
import { NET_DEFAULT, useUI } from "./ui";

/* Thao tác dùng chung giữa các trang: đổi bộ lọc của trang đích rồi điều hướng tới đó. */

/** Dựng lại bộ flashcard theo bộ lọc hiện tại */
export function buildDeck() {
  const { fc, setFc } = useUI.getState();
  const { catalog, status } = useProfile.getState();
  let deck = catalog.scope(fc.unit, fc.lesson);
  if (fc.status === "unmastered") deck = deck.filter((w) => status[w.id] !== "mastered");
  else if (fc.status !== "all") deck = deck.filter((w) => (status[w.id] ?? "new") === fc.status);
  setFc({ deck: deck.map((w) => w.id), i: 0, flipped: false, stale: false });
}

/** Tạo đề tự luyện mới theo bộ lọc hiện tại */
export function startQuiz() {
  const { quiz, setQuiz } = useUI.getState();
  const { catalog, status } = useProfile.getState();
  const roots =
    quiz.forWord && catalog.byId[quiz.forWord]
      ? [catalog.byId[quiz.forWord]]
      : catalog
          .scope(quiz.unit, quiz.lesson)
          .filter(
            (w) =>
              quiz.only === "all" ||
              (quiz.only === "unmastered" ? status[w.id] !== "mastered" : (status[w.id] ?? "new") === quiz.only),
          );
  setQuiz({
    qs: makeQuiz(catalog, quiz.type, roots),
    i: 0,
    right: 0,
    wrong: 0,
    answered: false,
    picked: [],
    last: null,
    stale: false,
  });
}

/** Lần đầu mở bài tập sách: chọn sẵn bài đang học dở */
export function ensureBookLesson() {
  const { book, setBook } = useUI.getState();
  if (book.touched) return;
  const { catalog, status } = useProfile.getState();
  const r = resumeLesson(catalog, status);
  setBook({ unit: r.unit, lesson: String(r.n), touched: true });
}

export type LessonWhere = "net" | "fc" | "quiz" | "book";

/** Chuyển bài trong cùng trang (thanh chuyển bài) */
export function goLesson(where: LessonWhere, n: string) {
  const ui = useUI.getState();
  const unit = n !== "all" ? LESSON_BY_N[+n].unit : undefined;
  const patch = { lesson: n, ...(unit ? { unit } : {}) };
  if (where === "net") ui.setNet(patch);
  if (where === "fc") {
    ui.setFc(patch);
    buildDeck();
  }
  if (where === "quiz") {
    ui.setQuiz(patch);
    startQuiz();
  }
  if (where === "book") {
    ui.setBook({ ...patch, touched: true });
    ui.resetBook();
  }
}

export function useActions() {
  const navigate = useNavigate();
  const ui = useUI.getState;

  return {
    navigate,
    openLesson(n: number) {
      const l = LESSON_BY_N[n];
      ui().setNet({ ...NET_DEFAULT, unit: l.unit, lesson: String(l.n) });
      navigate("/network");
    },
    openLessonFlash(n: number) {
      const l = LESSON_BY_N[n];
      ui().setFc({ unit: l.unit, lesson: String(l.n), status: "all" });
      buildDeck();
      navigate("/flashcards");
    },
    openLessonBook(n: number) {
      const l = LESSON_BY_N[n];
      ui().setBook({ unit: l.unit, lesson: String(l.n), touched: true });
      ui().resetBook();
      ui().setQuiz({ mode: "book" });
      navigate("/quiz");
    },
    openUnit(unit: string, to: "network" | "flashcards" | "quiz") {
      if (to === "network") ui().setNet({ ...NET_DEFAULT, unit });
      if (to === "flashcards") {
        ui().setFc({ unit, lesson: "all" });
        buildDeck();
      }
      if (to === "quiz") {
        ui().setQuiz({ unit, lesson: "all", forWord: null });
        startQuiz();
        if (unit !== "custom") {
          ui().setBook({ unit, lesson: "all", touched: true });
          ui().resetBook();
          ui().setQuiz({ mode: "book" });
        }
      }
      navigate("/" + to);
    },
    quizForWord(id: string, type: string) {
      ui().setQuiz({ forWord: id, type: type as never, mode: "auto" });
      startQuiz();
      navigate("/quiz");
    },
    /** Flashcard gồm các từ hay làm sai nhất */
    reviewWeak() {
      const { stats, status, catalog } = useProfile.getState();
      const ids = Object.entries(stats)
        .filter(([id, s]) => catalog.byId[id] && s.w > 0 && status[id] !== "mastered")
        .sort((a, b) => b[1].w - a[1].w)
        .map(([id]) => id)
        .slice(0, 20);
      ui().setFc({ unit: "all", lesson: "all", status: "all", deck: ids, i: 0, flipped: false, stale: false });
      navigate("/flashcards");
    },
    netByAffix(affix: string) {
      ui().setNet({ ...NET_DEFAULT, affix });
      navigate("/network");
    },
    shuffleDeck() {
      const { fc, setFc } = ui();
      setFc({ deck: shuffle(fc.deck), i: 0, flipped: false });
    },
  };
}
