import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Empty, netHref } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { LessonNav, ScopeSelects } from "@/components/LessonNav";
import { familyLookup, LESSON_BY_N, TOPIC_BY_ID, unitIndex } from "@/lib/data";
import type { ClozeBlock, Exercises, McqQuestion, OptionKey, WordsInContext } from "@/lib/types";
import { cx, lower, scrollBehavior } from "@/lib/util";
import { goLesson, useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { toast, useUI } from "@/state/ui";

const KEYS: OptionKey[] = ["A", "B", "C", "D"];
const NO_PICKS: Record<number, OptionKey> = {};

const normAns = (s: string) =>
  lower(s)
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.,!?]$/, "");

function bookKey(unit: string, lesson: string, sec: string) {
  return (lesson === "all" ? `R${unitIndex(unit) + 1}` : `L${lesson}`) + ":" + sec;
}

/** Đoạn văn: dòng "## " là tiêu đề nhỏ, {{n}} là chỗ trống */
function Passage({ text, gap }: { text: string; gap: (n: number) => ReactNode }) {
  return (
    <div className="passage">
      {text.split("\n").map((line, i) => {
        const isHead = line.startsWith("## ");
        const parts = (isHead ? line.slice(3) : line).split(/\{\{(\d+)\}\}/);
        const content = parts.map((p, j) => (j % 2 ? <span key={j}>{gap(+p)}</span> : p));
        return isHead ? (
          <h4 key={i} className="passage-h">
            {content}
          </h4>
        ) : (
          <p key={i}>{content}</p>
        );
      })}
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
  sec,
  total,
}: {
  kicker: string;
  title: string;
  sub?: string;
  sec: string;
  total: number;
}) {
  const book = useUI((s) => s.book);
  const best = useProfile((s) => s.book[bookKey(book.unit, book.lesson, sec)]);
  const ck = book.checked[sec];
  const badge = ck ? (
    <span
      className={cx("badge", ck.right === ck.total ? "b-emerald" : ck.right / ck.total >= 0.6 ? "b-amber" : "b-rose")}
    >
      {ck.right}/{ck.total} đúng
    </span>
  ) : best ? (
    <span className="badge b-slate" title="Điểm cao nhất">
      Cao nhất {best.right}/{best.total}
    </span>
  ) : (
    <span className="badge b-slate">{total} câu</span>
  );
  return (
    <div className="ex-head">
      <div>
        <div className="ex-kicker">{kicker}</div>
        <h3>{title}</h3>
        {sub && !ck && <p className="section-sub">{sub}</p>}
      </div>
      <div className="ex-score">{badge}</div>
    </div>
  );
}

function SectionActions({
  sec,
  done,
  total,
  unit,
  onCheck,
}: {
  sec: string;
  done: number;
  total: number;
  unit: string;
  onCheck: () => void;
}) {
  const ck = useUI((s) => s.book.checked[sec]);
  const reset = () => {
    const { book, setBook } = useUI.getState();
    const picks = { ...book.picks };
    delete picks[sec];
    const checked = { ...book.checked };
    delete checked[sec];
    setBook({ picks, checked, active: null, ...(sec === "wic" ? { wic: {} } : {}) });
    document.getElementById(`sec-${sec}`)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };
  return (
    <div className="ex-actions">
      {ck ? (
        <button className="btn" onClick={reset}>
          <Icon name="undo" size="sm" /> Làm lại
        </button>
      ) : (
        <>
          <button className="btn primary" disabled={!done} onClick={onCheck}>
            Kiểm tra
          </button>
          <span className="muted" style={{ fontSize: ".86rem" }}>
            {done}/{total} {unit}
          </span>
        </>
      )}
    </div>
  );
}

/** Chấm điểm một phần, lưu điểm cao nhất, ghi nhận đúng/sai cho từng từ gốc */
function useCheck() {
  const { catalog, recordAnswer, saveBookScore } = useProfile();
  return (sec: string, results: { ok: boolean; answer: string }[]) => {
    const { book, setBook } = useUI.getState();
    let right = 0;
    let confirmed = 0;
    for (const r of results) {
      if (r.ok) right++;
      const fam = familyLookup(catalog, r.answer);
      if (fam) {
        const before = useProfile.getState();
        const wasConfirming = Boolean(
          before.srs?.[fam.root.id]?.confirming || before.status[fam.root.id] === "confirming",
        );
        recordAnswer(fam.root.id, r.ok);
        if (wasConfirming && useProfile.getState().status[fam.root.id] === "mastered") confirmed++;
      }
    }
    const total = results.length;
    setBook({ checked: { ...book.checked, [sec]: { right, total } }, active: null });
    saveBookScore(bookKey(book.unit, book.lesson, sec), right, total);
    const el = document.getElementById(`sec-${sec}`);
    if (el && el.getBoundingClientRect().top < 60) el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    toast(
      right === total
        ? `Xuất sắc! Đúng cả ${total}/${total} 🎉${confirmed ? ` · ${confirmed} từ đã được xác nhận thuộc` : ""}`
        : `Đúng ${right}/${total} — xem lại những chỗ đánh dấu đỏ${confirmed ? ` · ${confirmed} từ đã được xác nhận thuộc` : ""}`,
    );
  };
}

// ---------------------------------------------------------------- Words in Context: đoạn văn + bảng từ
function WicSection({ wic }: { wic: WordsInContext }) {
  const book = useUI((s) => s.book);
  const setBook = useUI((s) => s.setBook);
  const check = useCheck();
  const sec = "wic";
  const fills = book.wic;
  const ck = book.checked[sec];
  const total = wic.answers.length;
  const bank = wic.answers.map((alts, i) => ({ i, w: alts[0] })).sort((a, b) => a.w.localeCompare(b.w));
  const used = new Set(Object.values(fills).map((f) => f.chip));
  const nums = Array.from({ length: total }, (_, k) => k + 1);
  const active = book.active ?? nums.find((k) => !fills[k]) ?? null;

  const pickChip = (i: number) => {
    const empty = (k: number) => !fills[k];
    const n = book.active ?? nums.find(empty);
    if (!n) return;
    const next = { ...fills, [n]: { w: wic.answers[i][0], chip: i } };
    // tự chuyển sang ô trống kế tiếp
    const nextActive = Array.from({ length: total }, (_, k) => ((n + k) % total) + 1).find((k) => !next[k]) ?? null;
    setBook({ wic: next, active: nextActive });
    if (nextActive && window.innerWidth < 760)
      setTimeout(() =>
        document
          .querySelector(`.gap[data-n="${nextActive}"]`)
          ?.scrollIntoView({ block: "center", behavior: scrollBehavior() }),
      );
  };
  const tapGap = (n: number) => {
    const next = { ...fills };
    delete next[n];
    setBook({ wic: next, active: n });
  };

  return (
    <section className="card ex-section" id="sec-wic">
      <SectionHead
        kicker="Words in Context"
        title="Điền từ vào đoạn văn"
        sub="Chạm một từ để điền vào ô đang sáng; chạm ô đã điền để xoá."
        sec={sec}
        total={total}
      />
      <div className="wordbank">
        {bank.map((b) => (
          <button
            key={b.i}
            className={cx("bank-chip", used.has(b.i) && "used")}
            disabled={!!ck || used.has(b.i)}
            onClick={() => pickChip(b.i)}
          >
            {b.w}
          </button>
        ))}
      </div>
      <Passage
        text={wic.text}
        gap={(n) => {
          const f = fills[n];
          const ok = !!ck && !!f && wic.answers[n - 1].some((a) => normAns(a) === normAns(f.w));
          const cls = ck ? (ok ? "right" : "wrong") : f ? "filled" : n === active ? "active" : "";
          return (
            <>
              <button
                className={cx("gap", cls)}
                data-n={n}
                disabled={!!ck}
                aria-label={`Chỗ trống ${n}${f ? ": " + f.w : ""}`}
                onClick={() => tapGap(n)}
              >
                <span className="gap-n">{n}</span>
                {f ? f.w : " "}
              </button>
              {ck && !ok && <span className="gap-fix">{wic.answers[n - 1].join(" / ")}</span>}
            </>
          );
        }}
      />
      <SectionActions
        sec={sec}
        done={Object.keys(fills).length}
        total={total}
        unit="ô đã điền"
        onCheck={() =>
          check(
            sec,
            wic.answers.map((alts, i) => {
              const f = fills[i + 1];
              return { ok: !!f && alts.some((a) => normAns(a) === normAns(f.w)), answer: alts[0] };
            }),
          )
        }
      />
    </section>
  );
}

// ---------------------------------------------------------------- câu trắc nghiệm
function McqItem({ q, sec, inPassage }: { q: McqQuestion; sec: string; inPassage?: boolean }) {
  const catalog = useProfile((s) => s.catalog);
  const pick = useUI((s) => s.book.picks[sec]?.[q.n]);
  const ck = useUI((s) => s.book.checked[sec]);
  const choose = (L: OptionKey) => {
    const { book, setBook } = useUI.getState();
    setBook({ picks: { ...book.picks, [sec]: { ...book.picks[sec], [q.n]: L } } });
  };

  let head: ReactNode;
  if (inPassage) {
    head = (
      <p className="mcq-q">
        <span className="qn">{q.n}.</span> <span className="muted">Chỗ trống số {q.n}</span>
      </p>
    );
  } else {
    const [before, after = ""] = (q.text ?? "").split("___");
    head = (
      <p className="mcq-q">
        <span className="qn">{q.n}.</span> {before}
        <span className={cx("blank-inline", pick && (ck ? (pick === q.answer ? "right" : "wrong") : "filled"))}>
          {pick ? q.options[pick] : " "}
        </span>
        {after}
      </p>
    );
  }
  const right = q.options[q.answer];
  const fam = ck ? familyLookup(catalog, right) : null;
  return (
    <li className="mcq" id={`q-${sec}-${q.n}`}>
      {head}
      <div className="opt-grid">
        {KEYS.map((L) => (
          <button
            key={L}
            className={cx(
              "opt",
              ck ? (L === q.answer ? "right" : L === pick ? "wrong" : "") : L === pick && "selected",
            )}
            disabled={!!ck}
            aria-pressed={L === pick}
            onClick={() => choose(L)}
          >
            <span className="k">{L}</span>
            {q.options[L]}
          </button>
        ))}
      </div>
      {ck && (
        <div className={cx("mcq-fb", pick === q.answer ? "ok" : "bad")}>
          {pick === q.answer ? "✓ Đúng" : pick ? "✗ Sai" : "Bỏ trống"} — đáp án{" "}
          <b>
            ({q.answer}) {right}
          </b>
          {fam && (
            <>
              {" · "}
              <span className="muted">{fam.f.vi || fam.root.vi}</span>
              {" · "}
              <Link to={netHref(fam.root.id, fam.f.w)}>họ từ “{fam.root.word}” →</Link>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function McqSection({ sec, kicker, title, qs }: { sec: string; kicker: string; title: string; qs: McqQuestion[] }) {
  const picks = useUI((s) => s.book.picks[sec] ?? NO_PICKS);
  const check = useCheck();
  return (
    <section className="card ex-section" id={`sec-${sec}`}>
      <SectionHead kicker={kicker} title={title} sub="Chọn từ đúng điền vào chỗ trống." sec={sec} total={qs.length} />
      <ol className="mcq-list">
        {qs.map((q) => (
          <McqItem key={q.n} q={q} sec={sec} />
        ))}
      </ol>
      <SectionActions
        sec={sec}
        done={Object.keys(picks).length}
        total={qs.length}
        unit="câu đã chọn"
        onCheck={() =>
          check(
            sec,
            qs.map((q) => ({ ok: picks[q.n] === q.answer, answer: q.options[q.answer] })),
          )
        }
      />
    </section>
  );
}

function ClozeSection({
  sec,
  kicker,
  title,
  blocks,
}: {
  sec: string;
  kicker: string;
  title: string;
  blocks: ClozeBlock[];
}) {
  const picks = useUI((s) => s.book.picks[sec] ?? NO_PICKS);
  const ck = useUI((s) => s.book.checked[sec]);
  const check = useCheck();
  const all = blocks.flatMap((b) => b.questions);
  const jump = (n: number) => {
    const t = document.getElementById(`q-${sec}-${n}`);
    if (!t) return;
    t.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    t.classList.remove("pulse");
    void t.offsetWidth;
    t.classList.add("pulse");
  };
  return (
    <section className="card ex-section" id={`sec-${sec}`}>
      <SectionHead
        kicker={kicker}
        title={title}
        sub="Đọc đoạn văn rồi chọn từ cho từng chỗ trống."
        sec={sec}
        total={all.length}
      />
      {blocks.map((b, bi) => {
        const byN = Object.fromEntries(b.questions.map((q) => [q.n, q]));
        return (
          <div key={bi}>
            {bi > 0 && <hr className="ex-sep" />}
            <Passage
              text={b.text}
              gap={(n) => {
                const q = byN[n];
                if (!q) return "____";
                const pick = picks[n];
                const cls = ck ? (pick === q.answer ? "right" : "wrong") : pick ? "filled" : "";
                return (
                  <button className={cx("gap", cls)} aria-label={`Chỗ trống ${n}`} onClick={() => jump(n)}>
                    <span className="gap-n">{n}</span>
                    {pick ? q.options[pick] : " "}
                  </button>
                );
              }}
            />
            <ol className="mcq-list compact">
              {b.questions.map((q) => (
                <McqItem key={q.n} q={q} sec={sec} inPassage />
              ))}
            </ol>
          </div>
        );
      })}
      <SectionActions
        sec={sec}
        done={Object.keys(picks).length}
        total={all.length}
        unit="chỗ trống đã chọn"
        onCheck={() =>
          check(
            sec,
            all.map((q) => ({ ok: picks[q.n] === q.answer, answer: q.options[q.answer] })),
          )
        }
      />
    </section>
  );
}

export function BookExercises() {
  const [exercises, setExercises] = useState<Exercises | null>(null);
  const act = useActions();
  const book = useUI((s) => s.book);
  const setBook = useUI((s) => s.setBook);
  const resetBook = useUI((s) => s.resetBook);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void import("@/lib/exercises").then(({ EXERCISES }) => {
      if (active) setExercises(EXERCISES);
    });
    return () => {
      active = false;
    };
  }, []);

  const controls = (
    <>
      <div className="card filter-bar" ref={topRef}>
        <div className="row">
          <ScopeSelects
            unit={book.unit}
            lesson={book.lesson}
            onUnit={(v) => {
              setBook({ unit: v, lesson: "all", touched: true });
              resetBook();
            }}
            onLesson={(v) => {
              setBook({ lesson: v, touched: true });
              resetBook();
            }}
          />
        </div>
        <p className="muted" style={{ fontSize: ".84rem", maxWidth: "56ch" }}>
          Bài tập &amp; đáp án lấy từ sách. Phần nghe (Part 1–4) và đọc hiểu dài (Part 7) không có trên web.
        </p>
      </div>
      <LessonNav unit={book.unit} lesson={book.lesson} where="book" />
    </>
  );

  if (!exercises)
    return (
      <div className="stack">
        {controls}
        <div className="card muted" role="status">
          Đang tải bài tập…
        </div>
      </div>
    );

  if (book.unit === "all" || book.unit === "custom")
    return (
      <div className="stack">
        {controls}
        <Empty title="Chọn một bài hoặc một phần">
          Mỗi bài có Words in Context, Part 5 và Part 6; mỗi phần có thêm bài ôn Word Review.
          <br />
          <button className="btn primary" onClick={() => goLesson("book", "1")}>
            Bắt đầu từ bài 1
          </button>
        </Empty>
      </div>
    );

  if (book.lesson === "all") {
    const n = unitIndex(book.unit) + 1;
    const R = exercises.reviews[n];
    return (
      <div className="stack">
        {controls}
        <div className="ex-title">
          <span className="kicker">Ôn tập phần {n}</span>
          <h2>
            Word Review #{n} · {TOPIC_BY_ID[book.unit].name}
          </h2>
        </div>
        {R ? (
          <>
            <McqSection key={`r5-${n}`} sec="r5" kicker="Word Review · câu 1–10" title="Chọn từ đúng" qs={R.part5} />
            <ClozeSection
              key={`r6-${n}`}
              sec="r6"
              kicker="Word Review · câu 11–19"
              title="Điền từ vào đoạn văn"
              blocks={R.part6}
            />
          </>
        ) : (
          <Empty title="Chưa có dữ liệu" />
        )}
      </div>
    );
  }

  const L = exercises.lessons[book.lesson];
  const l = LESSON_BY_N[+book.lesson];
  return (
    <div className="stack">
      {controls}
      <div className="ex-title">
        <span className="kicker">Bài {l.n}</span>
        <h2>
          {l.title} · {l.vi}
        </h2>
        <button className="text-link" onClick={() => act.openLesson(l.n)}>
          Xem lại 12 trường từ của bài <Icon name="right" size="sm" />
        </button>
      </div>
      {L?.wic && <WicSection key={`wic-${l.n}`} wic={L.wic} />}
      {L?.part5?.length > 0 && (
        <McqSection
          key={`p5-${l.n}`}
          sec="p5"
          kicker="Part 5 · Incomplete Sentences"
          title="Hoàn thành câu"
          qs={L.part5}
        />
      )}
      {L?.part6 && (
        <ClozeSection
          key={`p6-${l.n}`}
          sec="p6"
          kicker="Part 6 · Text Completion"
          title="Hoàn thành đoạn văn"
          blocks={[L.part6]}
        />
      )}
    </div>
  );
}
