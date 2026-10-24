import { useEffect, useRef } from "react";
import { Empty } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { LessonNav, ScopeSelects } from "@/components/LessonNav";
import ClickSpark, { type ClickSparkHandle } from "@/components/reactbits/ClickSpark";
import { LESSON_BY_N } from "@/lib/data";
import { isRightChoice, type Question } from "@/lib/quiz";
import { displayedStatus, dueReviewIds } from "@/lib/srs";
import { cx } from "@/lib/util";
import { startQuiz, useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { toast, useUI, type QuizType } from "@/state/ui";

import { QuestionView } from "./QuestionView";
import { QUIZ_TYPES } from "./quizTypes";

export function AutoQuiz() {
  const act = useActions();
  const st = useUI((s) => s.quiz);
  const setQuiz = useUI((s) => s.setQuiz);
  const { catalog, recordAnswer, status, statusAt, srs, reviewedToday, saveCheckpoint } = useProfile();
  const spark = useRef<ClickSparkHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const savedCheckpointSession = useRef<Question[] | null>(null);

  useEffect(() => {
    if (st.stale) startQuiz();
  }, [st.stale]);

  useEffect(() => {
    if (!st.checkpoint || !st.qs.length || st.i < st.qs.length || savedCheckpointSession.current === st.qs) return;
    savedCheckpointSession.current = st.qs;
    saveCheckpoint(st.checkpoint.key, st.right, st.qs.length);
  }, [st.i, st.qs, st.checkpoint, st.right, st.wrong, saveCheckpoint]);

  const q = st.qs[st.i];

  const answer = (
    ok: boolean,
    pick?: number,
    close = false,
    masteryCredit = true,
    reviewResults?: { id: string; ok: boolean }[],
  ) => {
    const s = useUI.getState().quiz;
    if (s.answered || !q) return;
    const before = useProfile.getState();
    const targets = reviewResults ?? [{ id: q.root.id, ok }];
    const confirming = new Set(
      targets
        .filter(({ id }) => before.srs?.[id]?.confirming || before.status[id] === "confirming")
        .map(({ id }) => id),
    );
    if (!close && masteryCredit) for (const result of targets) recordAnswer(result.id, result.ok);
    const missed = new Set(s.missed);
    for (const result of targets) {
      if (!result.ok) missed.add(result.id);
      else missed.delete(result.id);
    }
    setQuiz({
      answered: true,
      last: { ok, pick, close },
      right: s.right + (ok ? 1 : 0),
      wrong: s.wrong + (!ok && !close && masteryCredit ? 1 : 0),
      close: s.close + (close ? 1 : 0),
      missed: close || !masteryCredit ? s.missed : [...missed],
    });
    for (const id of confirming) {
      if (useProfile.getState().status[id] === "mastered")
        toast(`${useProfile.getState().catalog.byId[id]?.word ?? id}: Đã xác nhận thuộc sau 3 lượt đúng cách quãng!`);
    }
    // Trả lời đúng: bắn tia sáng (React Bits · ClickSpark) từ nút vừa chọn
    if (ok && spark.current && cardRef.current) {
      const target =
        pick != null ? cardRef.current.querySelectorAll(".choice")[pick] : cardRef.current.querySelector(".q-box");
      const host = cardRef.current.getBoundingClientRect();
      const r = (target as HTMLElement | null)?.getBoundingClientRect();
      if (r) spark.current.spark(r.left - host.left + r.width / 2, r.top - host.top + r.height / 2);
    }
  };
  const nextQ = () => setQuiz({ i: useUI.getState().quiz.i + 1, answered: false, picked: [], last: null });
  const restart = (p: Partial<typeof st> = {}) => {
    setQuiz(p);
    startQuiz();
  };

  const dueCount = dueReviewIds(
    Object.keys(catalog.byId),
    status,
    srs ?? {},
    statusAt,
    Date.now(),
    undefined,
    reviewedToday,
  ).length;
  const learningCount = catalog.all.filter((word) => {
    const current = displayedStatus(word.id, status, srs ?? {});
    return current === "learning" || current === "confirming";
  }).length;
  const practiceGroups: { title: string; types: QuizType[] }[] = [
    { title: "Nghĩa", types: ["meaning", "synonym"] },
    { title: "Dạng từ", types: ["formation", "build"] },
    { title: "Nhớ ra", types: ["recall", "listening"] },
  ];

  // Phím 1–4 chọn đáp án, Enter sang câu tiếp
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || useUI.getState().modal) return;
      const s = useUI.getState().quiz;
      const cur = s.qs[s.i];
      if (!cur) return;
      const n = parseInt(e.key, 10);
      const typing =
        cur.kind === "recall" ||
        cur.kind === "listening" ||
        cur.kind === "adaptive-hint" ||
        cur.kind === "adaptive-formation" ||
        cur.kind === "adaptive-recall" ||
        (cur.kind === "formation" && s.style === "typing");
      if (
        !s.answered &&
        !typing &&
        cur.kind !== "build" &&
        cur.kind !== "adaptive-match" &&
        n >= 1 &&
        n <= (cur.options?.length ?? 0)
      )
        answer(isRightChoice(cur, n - 1), n - 1);
      else if (s.answered && e.key === "Enter" && (e.target as HTMLElement).id !== "quiz-next") {
        e.preventDefault();
        nextQ();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const header = (
    <>
      <section className="card quiz-start-card">
        <div>
          <p className="eyebrow">{st.checkpoint ? "BÀI KIỂM TRA CUỐI CHẶNG" : "Luyện hôm nay"}</p>
          <h2>{st.checkpoint?.title ?? "Ôn đúng những từ cần nhớ"}</h2>
          <p className="muted">
            {st.checkpoint
              ? "Cần đạt ít nhất 80% để xác nhận hoàn thành chặng."
              : `${Math.min(10, dueCount + learningCount)} câu · ${dueCount} từ đến hạn · ${learningCount} từ đang học`}
          </p>
        </div>
        {!st.checkpoint && (
          <button
            className="btn primary"
            onClick={() =>
              // chưa có từ nào cần ôn (người mới) → luyện trên toàn bộ từ thay vì ra đề rỗng
              restart({
                type: "mixed",
                scope: dueCount + learningCount ? "due" : "all",
                unit: "all",
                lesson: "all",
                only: "all",
                forWord: null,
                checkpoint: null,
              })
            }
          >
            <Icon name="layers" size="sm" /> {dueCount + learningCount ? "Bắt đầu luyện" : "Luyện từ mới"}
          </button>
        )}
      </section>
      {!st.checkpoint && (
        <div className="quiz-controls card">
          <div className="quiz-scope-row" role="group" aria-label="Phạm vi luyện tập">
            {(
              [
                ["due", "Từ cần ôn"],
                ["lesson", "Theo bài…"],
                ["all", "Tất cả"],
              ] as const
            ).map(([scope, label]) => (
              <button
                key={scope}
                className={cx("quiz-scope", st.scope === scope && "active")}
                aria-pressed={st.scope === scope}
                onClick={() =>
                  restart({
                    scope,
                    only: "all",
                    forWord: null,
                    ...(scope === "all" ? { unit: "all", lesson: "all" } : {}),
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          {st.forWord && catalog.byId[st.forWord] ? (
            <span className="badge b-violet">Trường từ: {catalog.byId[st.forWord].word}</span>
          ) : st.scope === "lesson" ? (
            <>
              <ScopeSelects
                unit={st.unit}
                lesson={st.lesson}
                onUnit={(v) => restart({ unit: v, lesson: "all" })}
                onLesson={(v) => restart({ lesson: v })}
              />
              <LessonNav unit={st.unit} lesson={st.lesson} where="quiz" />
            </>
          ) : null}
          <div className="quiz-control-actions">
            <details className="quiz-custom-types">
              <summary>▸ Luyện riêng một dạng</summary>
              <div className="quiz-type-groups">
                {practiceGroups.map((group) => (
                  <div key={group.title} className="quiz-type-group">
                    <span className="eyebrow">{group.title}</span>
                    {group.types.map((type) => (
                      <button
                        key={type}
                        className={cx("quiz-type-option", st.type === type && "active")}
                        onClick={() => restart({ type })}
                      >
                        <Icon name={QUIZ_TYPES[type].icon} size="sm" /> {QUIZ_TYPES[type].label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </details>
            <button className="btn sm soft" onClick={() => restart()}>
              <Icon name="repeat" size="sm" /> Đề mới
            </button>
          </div>
        </div>
      )}
      {!st.checkpoint && st.type === "mixed" && (
        <p className="muted">Theo bậc sẽ tự đổi dạng và độ khó cho từng từ, từ nhận diện đến tự nhớ đáp án.</p>
      )}
    </>
  );

  // Phạm vi "Từ cần ôn" nhưng hôm nay chưa có từ nào đến hạn → chỉ lối khác, không báo lỗi dạng bài
  if (!st.qs.length && st.scope === "due" && !st.forWord)
    return (
      <div className="stack">
        {header}
        <Empty title="Hôm nay chưa có từ nào cần ôn">
          Từ bạn đã học sẽ quay lại đây khi đến hạn ôn. Trong lúc chờ, luyện thêm từ mới nhé.
          <br />
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn primary" onClick={() => restart({ scope: "all", unit: "all", lesson: "all" })}>
              Luyện tất cả từ
            </button>
            <button className="btn" onClick={() => restart({ scope: "lesson" })}>
              Luyện theo bài
            </button>
          </div>
        </Empty>
      </div>
    );

  if (!st.qs.length)
    return (
      <div className="stack">
        {header}
        <Empty title={`Chưa có câu hỏi dạng “${QUIZ_TYPES[st.type].label}” ở phạm vi này`}>
          Các từ trong phạm vi này không có dữ liệu cho dạng bài đó.
          <br />
          {st.type !== "mixed" ? (
            <button className="btn" onClick={() => restart({ type: "mixed" })}>
              Làm dạng Theo bậc
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => restart({ scope: "all", unit: "all", lesson: "all", forWord: null })}
            >
              Luyện tất cả từ
            </button>
          )}
        </Empty>
      </div>
    );

  if (st.i >= st.qs.length) {
    const graded = st.checkpoint ? st.qs.length : st.right + st.wrong;
    const p = graded ? Math.round((st.right / graded) * 100) : 0;
    const checkpointPassed = Boolean(st.checkpoint && p >= 80);
    const nextLesson = !st.forWord && st.lesson !== "all" ? LESSON_BY_N[+st.lesson + 1] : undefined;
    return (
      <div className="stack">
        {header}
        <div className="card quiz-card" style={{ textAlign: "center", maxWidth: 640 }}>
          <div className="topic-icon" style={{ margin: "0 auto" }}>
            <Icon name="award" size="lg" />
          </div>
          <h3 style={{ fontSize: "1.5rem", marginTop: 14 }}>Hoàn thành lượt luyện!</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            {st.checkpoint
              ? checkpointPassed
                ? `Đạt ${p}% — chặng đã hoàn thành, bài tiếp theo đã mở.`
                : `Đạt ${p}%. Cần 80% để hoàn thành chặng; thử lại để củng cố kiến thức.`
              : st.missed.length > 0
                ? `Có ${st.missed.length} từ cần ôn lại. ${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Hãy xem lại trước khi tiếp tục nhé.`
                : p >= 80
                  ? `${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Rất tốt! Bạn đang nắm khá vững phần này.`
                  : p >= 50
                    ? `${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Bạn làm khá tốt. Hãy xem lại những câu còn nhầm nhé.`
                    : `${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Hãy xem lại các từ và phần giải thích, rồi thử lại nhé.`}
          </p>
          <div
            className="grid grid-2"
            style={{ margin: "20px 0", background: "var(--surface-2)", padding: 16, borderRadius: 16 }}
          >
            <div>
              <div className="muted" style={{ fontSize: ".78rem" }}>
                Đúng / câu đã chấm
              </div>
              <div className="q-big" style={{ color: "var(--indigo)" }}>
                {st.right} / {graded}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: ".78rem" }}>
                Tỷ lệ chính xác
              </div>
              <div className="q-big" style={{ color: "var(--emerald)" }}>
                {graded ? `${p}%` : "—"}
              </div>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            {st.checkpoint && (
              <>
                {!checkpointPassed && (
                  <button className="btn primary" onClick={() => act.startCheckpoint(st.checkpoint!)}>
                    <Icon name="repeat" size="sm" /> Làm lại bài kiểm tra
                  </button>
                )}
                <button className={cx("btn", checkpointPassed && "primary")} onClick={() => act.navigate("/course")}>
                  <Icon name="layers" size="sm" /> Về lộ trình
                </button>
              </>
            )}
            {!st.checkpoint && st.missed.length > 0 && (
              <button className="btn primary" onClick={() => act.reviewWords(st.missed)}>
                <Icon name="repeat" size="sm" /> Ôn {st.missed.length} từ vừa sai
              </button>
            )}
            {!st.checkpoint && nextLesson && (
              <button
                className={cx("btn", st.missed.length === 0 && "primary")}
                onClick={() => act.openLesson(nextLesson.n)}
              >
                <Icon name="right" size="sm" /> Học tiếp bài {nextLesson.n}
              </button>
            )}
            {!st.checkpoint && (
              <button
                className={cx("btn", st.missed.length === 0 && !nextLesson && "primary")}
                onClick={() => restart()}
              >
                <Icon name="undo" size="sm" /> Làm bài mới
              </button>
            )}
            {!st.checkpoint && (
              <button className="btn" onClick={() => act.navigate("/network")}>
                <Icon name="network" size="sm" /> Xem lại Sơ đồ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const kindLabel = {
    formation: "Biến đổi từ loại",
    synonym: q.kind === "synonym" && q.ant ? "Trái nghĩa" : "Đồng nghĩa",
    meaning: "Nghĩa của từ",
    build: "Ghép từ",
    recall: "Điền từ vào câu",
    listening: "Nghe & gõ từ",
    "adaptive-choice": `Bậc ${q.kind === "adaptive-choice" ? q.level : ""}`,
    "adaptive-cloze": "Bậc 3 · Điền câu",
    "adaptive-hint": "Bậc 4 · Gõ có gợi ý",
    "adaptive-formation-choice": "Bậc 3 · Biến đổi từ loại",
    "adaptive-formation": "Bậc 4 · Biến đổi từ loại",
    "adaptive-recall":
      q.kind === "adaptive-recall" ? `Bậc ${q.level} · ${q.listening ? "Nghe & gõ" : "Tự nhớ"}` : "Bậc 5–6 · Tự nhớ",
    "adaptive-listen-choice": "Bậc 1 · Nghe chọn từ",
    "adaptive-match": "Bậc 2 · Nối nghĩa",
    "adaptive-synonym-sentence": "Bậc 3 · Đồng nghĩa trong câu",
    "adaptive-form-fix": "Bậc 4 · Sửa dạng từ",
  }[q.kind];
  const adaptive = q.kind.startsWith("adaptive-");

  return (
    <div className="stack">
      {header}
      <div className="bar" style={{ maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}>
        <span style={{ width: `${(st.i / st.qs.length) * 100}%` }} />
      </div>
      <ClickSpark
        ref={spark}
        auto={false}
        sparkColor={["#2f7a55", "#c08a2e", "#2f4b8f"]}
        sparkCount={12}
        sparkRadius={34}
        sparkSize={12}
        duration={520}
        style={{ height: "auto" }}
      >
        <div className="card quiz-card" ref={cardRef}>
          <div className="row between">
            <div className="row" style={{ gap: 6 }}>
              <span className="badge b-indigo">
                Câu {st.i + 1} / {st.qs.length}
              </span>
              <span className="badge b-sky">{kindLabel}</span>
              {!adaptive && <span className="badge b-violet mono">Gốc: {q.root.word.toUpperCase()}</span>}
            </div>
            <div className="row">
              <span className="score-pill" style={{ color: "var(--emerald)" }}>
                <Icon name="check2" size="sm" /> {st.right}
              </span>
              <span className="score-pill" style={{ color: "var(--rose)" }}>
                <Icon name="x" size="sm" /> {st.wrong}
              </span>
              {st.close > 0 && (
                <span className="score-pill" style={{ color: "var(--amber-text)" }}>
                  ~ {st.close}
                </span>
              )}
            </div>
          </div>
          <QuestionView key={st.i} q={q} onAnswer={answer} onNext={nextQ} />
        </div>
      </ClickSpark>
    </div>
  );
}
