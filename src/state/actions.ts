import { useNavigate } from "react-router-dom";
import { LESSON_BY_N } from "@/lib/data";
import { makeQuiz } from "@/lib/quiz";
import { isLessonUnlocked, legacyLessonThrough, resumeLesson } from "@/lib/progress";
import { DEFAULT_NEW_WORD_LIMIT, displayedStatus, dueReviewIds } from "@/lib/srs";
import { dayKey, shuffle } from "@/lib/util";
import { useProfile } from "./profile";
import { NET_DEFAULT, type QuizCheckpoint, useUI } from "./ui";

/* Thao tác dùng chung giữa các trang: đổi bộ lọc của trang đích rồi điều hướng tới đó. */

/** Dựng lại bộ flashcard theo bộ lọc hiện tại */
export function buildDeck() {
  const { fc, setFc } = useUI.getState();
  const { catalog, status, srs } = useProfile.getState();
  let deck = catalog.scope(fc.unit, fc.lesson);
  if (fc.status === "unmastered") deck = deck.filter((w) => displayedStatus(w.id, status, srs ?? {}) !== "mastered");
  else if (fc.status !== "all") deck = deck.filter((w) => displayedStatus(w.id, status, srs ?? {}) === fc.status);
  setFc({ deck: deck.map((w) => w.id), i: 0, flipped: false, stale: false });
}

/** Tạo đề tự luyện mới theo bộ lọc hiện tại */
export function startQuiz() {
  const { quiz, setQuiz } = useUI.getState();
  const { catalog, status, statusAt, srs, reviewedToday } = useProfile.getState();
  let roots =
    quiz.forWord && catalog.byId[quiz.forWord]
      ? [catalog.byId[quiz.forWord]]
      : quiz.scope !== "lesson"
        ? catalog.all
        : catalog.scope(quiz.unit, quiz.lesson);
  if (quiz.checkpoint?.lesson) roots = roots.filter((word) => word.lesson === quiz.checkpoint?.lesson);
  if (quiz.checkpoint?.ids) {
    const allowed = new Set(quiz.checkpoint.ids);
    roots = roots.filter((word) => allowed.has(word.id));
  }
  if (!quiz.forWord && quiz.scope === "due") {
    const dueIds = dueReviewIds(
      roots.map((word) => word.id),
      status,
      srs ?? {},
      statusAt,
      Date.now(),
      undefined,
      reviewedToday,
    );
    const dueSet = new Set(dueIds);
    const dueWords = dueIds.map((id) => catalog.byId[id]).filter(Boolean);
    const learningWords = roots
      .filter(
        (word) =>
          !dueSet.has(word.id) && ["learning", "confirming"].includes(displayedStatus(word.id, status, srs ?? {})),
      )
      .sort((a, b) => (srs?.[a.id]?.due ?? 0) - (srs?.[b.id]?.due ?? 0));
    roots = [...dueWords, ...learningWords].slice(0, 10);
  }
  if (quiz.only !== "all")
    roots = roots.filter((word) =>
      quiz.only === "unmastered"
        ? displayedStatus(word.id, status, srs ?? {}) !== "mastered"
        : displayedStatus(word.id, status, srs ?? {}) === quiz.only,
    );
  setQuiz({
    qs: makeQuiz(catalog, quiz.type, roots, srs ?? {}, status, statusAt ?? {}),
    i: 0,
    right: 0,
    wrong: 0,
    close: 0,
    missed: [],
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
  const canOpenLesson = (n: number) => {
    const { catalog, status, checkpoints, courseThrough } = useProfile.getState();
    if (isLessonUnlocked(n, courseThrough ?? legacyLessonThrough(catalog, status), checkpoints ?? {})) return true;
    ui().toast("Hoàn thành bài kiểm tra cuối chặng trước để mở bài này.");
    return false;
  };

  return {
    navigate,
    openLesson(n: number) {
      if (!canOpenLesson(n)) return;
      const l = LESSON_BY_N[n];
      ui().setNet({ ...NET_DEFAULT, unit: l.unit, lesson: String(l.n) });
      navigate("/network");
    },
    openLessonFlash(n: number) {
      if (!canOpenLesson(n)) return;
      const l = LESSON_BY_N[n];
      ui().setFc({ unit: l.unit, lesson: String(l.n), status: "all" });
      buildDeck();
      navigate("/flashcards");
    },
    openLessonBook(n: number) {
      if (!canOpenLesson(n)) return;
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
    startCheckpoint(checkpoint: QuizCheckpoint) {
      ui().setQuiz({
        mode: "auto",
        type: "mixed",
        scope: checkpoint.lesson ? "lesson" : "all",
        unit: "all",
        lesson: checkpoint.lesson ? String(checkpoint.lesson) : "all",
        only: "all",
        forWord: null,
        checkpoint,
      });
      startQuiz();
      navigate("/quiz");
    },
    quizMastered() {
      const { catalog, status, srs } = useProfile.getState();
      const count = catalog.all.filter((word) => displayedStatus(word.id, status, srs ?? {}) === "mastered").length;
      if (!count) return;
      ui().setQuiz({
        mode: "auto",
        type: "mixed",
        scope: "all",
        unit: "all",
        lesson: "all",
        only: "mastered",
        forWord: null,
      });
      startQuiz();
      navigate("/quiz");
    },
    learnNewWords() {
      const profile = useProfile.getState();
      const { catalog, status, newWordsToday } = profile;
      const today = dayKey();
      const introduced =
        newWordsToday?.day === today
          ? new Set(newWordsToday.ids.filter((id) => !id.startsWith("everyday:")))
          : new Set<string>();
      const remaining = Math.max(0, (profile.profile().newWordLimit ?? DEFAULT_NEW_WORD_LIMIT) - introduced.size);
      const ids = catalog.all
        .filter((word) => displayedStatus(word.id, status, profile.srs ?? {}) === "new" && !introduced.has(word.id))
        .slice(0, remaining)
        .map((word) => word.id);
      if (!ids.length) return;
      ui().setFc({ unit: "all", lesson: "all", status: "all", deck: ids, i: 0, flipped: false, stale: false });
      navigate("/flashcards");
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
    reviewWords(ids: string[]) {
      const { catalog } = useProfile.getState();
      const deck = [...new Set(ids)].filter((id) => catalog.byId[id]);
      if (!deck.length) return;
      ui().setFc({ unit: "all", lesson: "all", status: "all", deck, i: 0, flipped: false, stale: false });
      navigate("/flashcards");
    },
    reviewDue() {
      const { catalog, status, srs, statusAt, reviewedToday } = useProfile.getState();
      const ids = dueReviewIds(
        Object.keys(catalog.byId),
        status,
        srs ?? {},
        statusAt,
        Date.now(),
        undefined,
        reviewedToday,
      );
      if (!ids.length) return;
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
