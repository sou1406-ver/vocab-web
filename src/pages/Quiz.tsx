import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Chips, Empty, Ipa, netHref, PosTag, SpeakBtn } from "@/components/bits";
import { Icon, type IconName } from "@/components/Icon";
import { LessonNav, ScopeSelects } from "@/components/LessonNav";
import ClickSpark, { type ClickSparkHandle } from "@/components/reactbits/ClickSpark";
import { affixType, familyOf, POS_LABEL } from "@/lib/data";
import { isRightChoice, type Question } from "@/lib/quiz";
import type { FamilyEntry, Word } from "@/lib/types";
import { cx, lower, same, scrollBehavior } from "@/lib/util";
import { ensureBookLesson, startQuiz, useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { useUI, type QuizType } from "@/state/ui";
import { BookExercises } from "./Book";

const QUIZ_TYPES: Record<QuizType, { label: string; icon: IconName }> = {
  formation: { label: "Biến đổi từ loại", icon: "branch" },
  synonym: { label: "Đồng nghĩa & Trái nghĩa", icon: "compare" },
  meaning: { label: "Nghĩa của từ", icon: "book" },
  build: { label: "Ghép từ", icon: "puzzle" },
  mixed: { label: "Tổng hợp", icon: "layers" },
};

export function QuizPage() {
  const mode = useUI((s) => s.quiz.mode);
  const setQuiz = useUI((s) => s.setQuiz);
  useEffect(() => {
    if (mode === "book") ensureBookLesson();
  }, [mode]);
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

function Explain({
  ok,
  entry,
  root,
  extra,
  onNext,
}: {
  ok: boolean;
  entry?: FamilyEntry | null;
  root: Word;
  extra?: ReactNode;
  onNext: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
    // Trên màn hình nhỏ, kéo phần giải thích vào tầm nhìn
    if (box.current && box.current.getBoundingClientRect().bottom > window.innerHeight)
      box.current.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, []);
  return (
    <div className={cx("explain", ok ? "ok" : "bad")} ref={box}>
      <div style={{ flex: "1 1 300px" }}>
        <h4>{ok ? "✅ Chính xác!" : "❌ Chưa đúng"}</h4>
        {entry && entry.parts && entry.parts.length > 1 && (
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Chips parts={entry.parts} />
            <span className="plus">→</span>
            <b>{entry.w}</b>
            <PosTag pos={entry.pos} />
          </div>
        )}
        <p>
          {extra}
          {entry && (
            <>
              {" "}
              <b>{entry.w}</b> {entry.pos ? `(${POS_LABEL[entry.pos] ?? entry.pos})` : ""}: {entry.vi}.
            </>
          )}
          {entry?.note && (
            <>
              <br />
              <span className="note">{entry.note}</span>
            </>
          )}
        </p>
        <p style={{ fontSize: ".78rem" }}>
          <Link to={netHref(root.id, entry ? entry.w : root.word)}>Xem sơ đồ trường từ “{root.word}” →</Link>
        </p>
      </div>
      <button className="btn dark" id="quiz-next" ref={btn} onClick={onNext}>
        Câu tiếp <Icon name="right" size="sm" />
      </button>
    </div>
  );
}

function QuestionView({
  q,
  onAnswer,
  onNext,
}: {
  q: Question;
  onAnswer: (ok: boolean, pick?: number) => void;
  onNext: () => void;
}) {
  const st = useUI((s) => s.quiz);
  const setQuiz = useUI((s) => s.setQuiz);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [q]);

  const choices = <T,>(opts: T[], label: (o: T) => string, right: (o: T) => boolean) => (
    <div className="choices">
      {opts.map((o, i) => {
        const cls = st.answered ? (right(o) ? "right" : st.last?.pick === i ? "wrong" : "") : "";
        return (
          <button
            key={i}
            className={cx("choice", cls)}
            disabled={st.answered}
            onClick={() => onAnswer(isRightChoice(q, i), i)}
          >
            <span className="k">{i + 1}</span>
            {label(o)}
          </button>
        );
      })}
    </div>
  );

  if (q.kind === "formation") {
    const before = q.s.slice(0, q.m.index);
    const after = q.s.slice(q.m.index + q.m.text.length);
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Điền dạng từ đúng của từ trong ngoặc (biến đổi từ loại / thêm tiền tố, hậu tố):</div>
          <div className="q-text">
            {before}
            <span className="blank">{st.answered ? q.m.text : "______"}</span>{" "}
            <span className="base">({q.base.toUpperCase()})</span>
            {after}
          </div>
          <div className="q-hint">
            💡 Gợi ý: cần một <b>{POS_LABEL[q.f.pos] ?? q.f.pos}</b> mang nghĩa “{q.f.vi}”.
          </div>
        </div>
        {st.style === "typing" ? (
          <form
            className="type-row"
            onSubmit={(e) => {
              e.preventDefault();
              const v = lower(inputRef.current?.value ?? "");
              if (!v || st.answered) return;
              onAnswer(v === lower(q.m.text) || v === lower(q.f.w));
            }}
          >
            <input
              ref={inputRef}
              className="input"
              id="quiz-input"
              autoComplete="off"
              spellCheck={false}
              placeholder="Gõ từ đã biến đổi…"
              aria-label="Từ đã biến đổi"
              disabled={st.answered}
            />
            <button className="btn primary" disabled={st.answered}>
              Kiểm tra
            </button>
          </form>
        ) : (
          choices(
            q.options,
            (o) => o,
            (o) => same(o, q.m.text),
          )
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            entry={q.f}
            root={q.root}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.m.text}</b>.
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "synonym") {
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Chọn từ {q.ant ? "TRÁI NGHĨA" : "ĐỒNG NGHĨA"} với từ sau:</div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="q-big">{q.root.word}</span>
            <Ipa ipa={q.root.ipa} />
            <PosTag pos={q.root.pos} />
            <SpeakBtn text={q.root.word} size="" />
          </div>
          <div className="q-hint">Nghĩa: {q.root.vi}</div>
        </div>
        {choices(
          q.options,
          (o) => o,
          (o) => same(o, q.correct),
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              <>
                {q.ant ? "Trái nghĩa" : "Đồng nghĩa"} của <b>{q.root.word}</b>:{" "}
                {(q.ant ? q.root.ant : q.root.syn).join(", ")}.
              </>
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "meaning") {
    const w = q.root;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">{q.reverse ? "Từ nào có nghĩa là:" : "Nghĩa của từ:"}</div>
          {q.reverse ? (
            <div className="q-big" style={{ fontSize: "1.5rem", marginTop: 8 }}>
              {w.vi}
            </div>
          ) : (
            <div className="row" style={{ marginTop: 8 }}>
              <span className="q-big">{w.word}</span>
              <Ipa ipa={w.ipa} />
              <PosTag pos={w.pos} />
              <SpeakBtn text={w.word} size="" />
            </div>
          )}
          {w.def && <div className="q-hint">Định nghĩa (sách): {w.def}</div>}
        </div>
        {choices(
          q.options,
          (o) => (q.reverse ? o.word : o.vi),
          (o) => o === w,
        )}
        {st.answered && st.last && (
          <Explain ok={st.last.ok} entry={familyOf(w).find((f) => same(f.w, w.word))} root={w} onNext={onNext} />
        )}
      </>
    );
  }

  // Ghép từ
  const f = q.f;
  return (
    <>
      <div className="q-box" style={{ textAlign: "center" }}>
        <div className="eyebrow">Ghép tiền tố + từ gốc + hậu tố thành từ có nghĩa:</div>
        <div className="q-big" style={{ fontSize: "1.45rem", marginTop: 8 }}>
          {f.vi}
        </div>
        <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
          <PosTag pos={f.pos} />
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {POS_LABEL[f.pos] ?? ""} · họ từ “{q.root.word}” · cần {f.parts.length} mảnh
          </span>
        </div>
        <div className="slots">
          {st.picked.length ? (
            st.picked.map((i) => (
              <button
                key={i}
                className={`morph ${affixType(q.tiles[i])}`}
                disabled={st.answered}
                onClick={() => setQuiz({ picked: st.picked.filter((x) => x !== i) })}
              >
                {q.tiles[i]}
              </button>
            ))
          ) : (
            <span className="muted" style={{ fontSize: ".82rem" }}>
              Bấm các mảnh bên dưới theo đúng thứ tự
            </span>
          )}
        </div>
        <div className="tiles">
          {q.tiles.map((t, i) => (
            <button
              key={i}
              className={cx("morph", affixType(t), st.picked.includes(i) && "used")}
              disabled={st.answered}
              onClick={() => !st.picked.includes(i) && setQuiz({ picked: [...st.picked, i] })}
            >
              {t}
            </button>
          ))}
        </div>
        {!st.answered && (
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <button className="btn" onClick={() => setQuiz({ picked: [] })}>
              Xoá
            </button>
            <button
              className="btn primary"
              disabled={!st.picked.length}
              onClick={() => onAnswer(st.picked.map((i) => q.tiles[i]).join("|") === f.parts.join("|"))}
            >
              Kiểm tra
            </button>
          </div>
        )}
      </div>
      {st.answered && st.last && (
        <Explain
          ok={st.last.ok}
          entry={f}
          root={q.root}
          extra={st.last.ok ? null : "Thứ tự đúng ở trên."}
          onNext={onNext}
        />
      )}
    </>
  );
}

function AutoQuiz() {
  const act = useActions();
  const st = useUI((s) => s.quiz);
  const setQuiz = useUI((s) => s.setQuiz);
  const { catalog, recordAnswer } = useProfile();
  const spark = useRef<ClickSparkHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (st.stale) startQuiz();
  }, [st.stale]);

  const q = st.qs[st.i];

  const answer = (ok: boolean, pick?: number) => {
    const s = useUI.getState().quiz;
    if (s.answered || !q) return;
    setQuiz({ answered: true, last: { ok, pick }, right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1) });
    recordAnswer(q.root.id, ok);
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

  // Phím 1–4 chọn đáp án, Enter sang câu tiếp
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || useUI.getState().modal) return;
      const s = useUI.getState().quiz;
      const cur = s.qs[s.i];
      if (!cur) return;
      const n = parseInt(e.key, 10);
      const typing = cur.kind === "formation" && s.style === "typing";
      if (!s.answered && !typing && cur.kind !== "build" && n >= 1 && n <= cur.options.length)
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
      <div className="card filter-bar">
        <div className="seg">
          {(Object.keys(QUIZ_TYPES) as QuizType[]).map((k) => (
            <button key={k} className={cx(st.type === k && "active")} onClick={() => restart({ type: k })}>
              <Icon name={QUIZ_TYPES[k].icon} size="sm" /> {QUIZ_TYPES[k].label}
            </button>
          ))}
        </div>
        <div className="row">
          {st.forWord && catalog.byId[st.forWord] ? (
            <span className="badge b-violet" style={{ padding: "6px 12px" }}>
              Trường từ: {catalog.byId[st.forWord].word}{" "}
              <button
                className="speak-btn"
                title="Bỏ lọc"
                aria-label="Bỏ lọc trường từ"
                onClick={() => restart({ forWord: null })}
              >
                <Icon name="x" size="sm" />
              </button>
            </span>
          ) : (
            <>
              <ScopeSelects
                unit={st.unit}
                lesson={st.lesson}
                onUnit={(v) => restart({ unit: v, lesson: "all" })}
                onLesson={(v) => restart({ lesson: v })}
              />
              <label className="row" style={{ gap: 6 }}>
                <span className="eyebrow">Ôn</span>
                <select className="select" value={st.only} onChange={(e) => restart({ only: e.target.value })}>
                  <option value="all">Tất cả từ</option>
                  <option value="unmastered">Từ chưa thuộc</option>
                  <option value="learning">Từ đang học</option>
                </select>
              </label>
            </>
          )}
          {st.type === "formation" && (
            <select
              className="select"
              aria-label="Cách trả lời"
              value={st.style}
              onChange={(e) => setQuiz({ style: e.target.value as "choice" | "typing" })}
            >
              <option value="choice">Trắc nghiệm 4 đáp án</option>
              <option value="typing">Tự gõ từ biến đổi</option>
            </select>
          )}
          <button className="btn sm soft" onClick={() => restart()}>
            <Icon name="repeat" size="sm" /> Làm đề mới
          </button>
        </div>
      </div>
      {!st.forWord && <LessonNav unit={st.unit} lesson={st.lesson} where="quiz" />}
    </>
  );

  if (!st.qs.length)
    return (
      <div className="stack">
        {header}
        <Empty title={`Chưa có câu hỏi dạng “${QUIZ_TYPES[st.type].label}” ở phạm vi này`}>
          Các từ trong phạm vi này không có dữ liệu cho dạng bài đó.
          <br />
          <button className="btn" onClick={() => restart({ type: "mixed" })}>
            Làm dạng Tổng hợp
          </button>
        </Empty>
      </div>
    );

  if (st.i >= st.qs.length) {
    const p = Math.round((st.right / st.qs.length) * 100);
    return (
      <div className="stack">
        {header}
        <div className="card quiz-card" style={{ textAlign: "center", maxWidth: 640 }}>
          <div className="topic-icon" style={{ margin: "0 auto" }}>
            <Icon name="award" size="lg" />
          </div>
          <h3 style={{ fontSize: "1.5rem", marginTop: 14 }}>Hoàn thành bài luyện tập!</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            {p >= 80
              ? "Rất tốt — bạn nắm chắc quy luật biến đổi từ."
              : p >= 50
                ? "Khá ổn, ôn lại sơ đồ các từ sai nhé."
                : "Cần ôn thêm — xem lại sơ đồ trường từ rồi làm lại."}
          </p>
          <div
            className="grid grid-2"
            style={{ margin: "20px 0", background: "var(--surface-2)", padding: 16, borderRadius: 16 }}
          >
            <div>
              <div className="muted" style={{ fontSize: ".78rem" }}>
                Số câu đúng
              </div>
              <div className="q-big" style={{ color: "var(--indigo)" }}>
                {st.right} / {st.qs.length}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: ".78rem" }}>
                Tỷ lệ chính xác
              </div>
              <div className="q-big" style={{ color: "var(--emerald)" }}>
                {p}%
              </div>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn primary" onClick={() => restart()}>
              <Icon name="undo" size="sm" /> Làm bài mới
            </button>
            <button className="btn" onClick={() => act.navigate("/network")}>
              <Icon name="network" size="sm" /> Xem lại Sơ đồ
            </button>
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
  }[q.kind];

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
              <span className="badge b-violet mono">Gốc: {q.root.word.toUpperCase()}</span>
            </div>
            <div className="row">
              <span className="score-pill" style={{ color: "var(--emerald)" }}>
                <Icon name="check2" size="sm" /> {st.right}
              </span>
              <span className="score-pill" style={{ color: "var(--rose)" }}>
                <Icon name="x" size="sm" /> {st.wrong}
              </span>
            </div>
          </div>
          <QuestionView key={st.i} q={q} onAnswer={answer} onNext={nextQ} />
        </div>
      </ClickSpark>
    </div>
  );
}
