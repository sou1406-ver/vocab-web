import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { EVERYDAY_ENTRIES, EVERYDAY_KIND_LABEL, type EverydayKind, type UsageLevel } from "@/data/everyday";
import { STATUS_INFO } from "@/lib/data";
import { displayedStatus } from "@/lib/srs";
import type { Status } from "@/lib/types";
import { fold, shuffle } from "@/lib/util";
import { useProfile } from "@/state/profile";

const FILTERS: ("all" | EverydayKind)[] = ["all", "phrase", "phrasal", "idiom", "slang"];
const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = {
  all: "Tất cả",
  phrase: "Cụm từ",
  phrasal: "Phrasal verbs",
  idiom: "Thành ngữ",
  slang: "Từ lóng",
};
const statusId = (id: string) => `everyday:${id}`;
const USAGE_LABEL: Record<UsageLevel, string> = { 0: "Hiếm gặp", 1: "Ít gặp hơn", 2: "Phổ biến", 3: "Rất phổ biến" };
type EverydayQuestion = { id: string; choices: string[] };

function UsageMeter({ level }: { level: UsageLevel }) {
  return (
    <span className={`freq freq-${level}`} role="img" title={USAGE_LABEL[level]} aria-label={USAGE_LABEL[level]}>
      <i />
      <i />
      <i />
    </span>
  );
}

export function EverydayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "learning";
  const paramKind = searchParams.get("kind");
  const filter = FILTERS.includes(paramKind as (typeof FILTERS)[number])
    ? (paramKind as (typeof FILTERS)[number])
    : "all";
  const reviewStarted = useRef(false);
  const [usageFilter, setUsageFilter] = useState<"all" | UsageLevel>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(60);
  const [studyIds, setStudyIds] = useState<string[] | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [quiz, setQuiz] = useState<EverydayQuestion[] | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const { status, srs, setStatus, logActivity, recordAnswer } = useProfile();
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return EVERYDAY_ENTRIES.filter((entry) => {
      const matchesKind = filter === "all" || entry.kind === filter;
      const matchesUsage = usageFilter === "all" || entry.usageLevel === usageFilter;
      const entryStatus = displayedStatus(statusId(entry.id), status, srs ?? {});
      const matchesStatus = statusFilter === "all" || entryStatus === statusFilter;
      const senseText =
        entry.otherSenses?.map((sense) => `${sense.meaning} ${sense.definition} ${sense.example}`).join(" ") ?? "";
      const matchesQuery =
        !q ||
        fold(`${entry.text} ${entry.meaning} ${entry.definition} ${entry.example ?? ""} ${senseText}`).includes(q);
      return matchesKind && matchesUsage && matchesStatus && matchesQuery;
    });
  }, [filter, usageFilter, statusFilter, query, status, srs]);
  const displayed = visible.slice(0, displayLimit);
  const studied = EVERYDAY_ENTRIES.filter(
    (entry) => displayedStatus(statusId(entry.id), status, srs ?? {}) === "mastered",
  ).length;
  const current = studyIds ? EVERYDAY_ENTRIES.find((entry) => entry.id === studyIds[studyIndex]) : null;
  const quizCurrent = quiz ? EVERYDAY_ENTRIES.find((entry) => entry.id === quiz[quizIndex]?.id) : null;
  const setKindFilter = (kind: (typeof FILTERS)[number]) => {
    const next = new URLSearchParams(searchParams);
    if (kind === "all") next.delete("kind");
    else next.set("kind", kind);
    setSearchParams(next, { replace: true });
    setDisplayLimit(60);
  };

  useEffect(() => {
    if (!reviewMode || reviewStarted.current) return;
    reviewStarted.current = true;
    const ids = EVERYDAY_ENTRIES.filter((entry) => {
      const state = displayedStatus(statusId(entry.id), status, srs ?? {});
      return state === "learning" || state === "confirming";
    }).map((entry) => entry.id);
    if (ids.length) {
      setStudyIds(ids);
      setStudyIndex(0);
      setRevealed(false);
    }
  }, [reviewMode, status, srs]);

  const startStudy = () => {
    if (!visible.length) return;
    setQuiz(null);
    setStudyIds(visible.map((entry) => entry.id));
    setStudyIndex(0);
    setRevealed(false);
  };
  const startQuiz = () => {
    if (!visible.length) return;
    const questions = shuffle(visible)
      .slice(0, 10)
      .map((entry) => {
        const distractors = shuffle([
          ...new Set(
            EVERYDAY_ENTRIES.filter((other) => other.id !== entry.id && other.meaning !== entry.meaning).map(
              (other) => other.meaning,
            ),
          ),
        ]).slice(0, 3);
        return { id: entry.id, choices: shuffle([entry.meaning, ...distractors]) };
      });
    setStudyIds(null);
    setQuiz(questions);
    setQuizIndex(0);
    setQuizChoice(null);
    setQuizCorrect(0);
  };
  const answerQuiz = (choice: string) => {
    if (!quizCurrent || quizChoice !== null) return;
    const correct = choice === quizCurrent.meaning;
    recordAnswer(statusId(quizCurrent.id), correct);
    setQuizChoice(choice);
    if (correct) setQuizCorrect((value) => value + 1);
  };
  const nextQuizQuestion = () => {
    setQuizChoice(null);
    setQuizIndex((index) => index + 1);
  };
  const rate = (value: Status) => {
    if (!current) return;
    // “Chưa nhớ” vẫn cần quay lại Ôn tập, nên giữ mục ở trạng thái đang học.
    if (!setStatus(statusId(current.id), value === "new" ? "learning" : value)) return;
    logActivity("card");
    setRevealed(false);
    setStudyIndex((i) => i + 1);
  };

  return (
    <div className="everyday-page">
      <header className="page-head">
        <p className="kicker">BỘ SƯU TẬP MỞ RỘNG</p>
        <h1>Tiếng Anh đời thường</h1>
        <p className="lede">
          Học cụm từ, phrasal verbs, thành ngữ và từ lóng theo ngữ cảnh. Bộ này có tiến độ riêng, không cộng vào 600 từ
          TOEIC.
        </p>
        <nav className="everyday-shortcuts" aria-label="Đi nhanh tới bộ từ">
          <button
            className={`btn sm${filter === "idiom" ? " primary" : ""}`}
            aria-pressed={filter === "idiom"}
            onClick={() => setKindFilter("idiom")}
          >
            Học idiom <span>→</span>
          </button>
          <button
            className={`btn sm${filter === "phrasal" ? " primary" : ""}`}
            aria-pressed={filter === "phrasal"}
            onClick={() => setKindFilter("phrasal")}
          >
            Phrasal verbs <span>→</span>
          </button>
        </nav>
      </header>

      <section className="d-stats everyday-stats" aria-label="Tiến độ bộ sưu tập">
        <div className="d-stat">
          <b>{EVERYDAY_ENTRIES.length}</b>
          <span>mục đang có</span>
        </div>
        <div className="d-stat">
          <b>{studied}</b>
          <span>đã thuộc</span>
        </div>
        <div className="d-stat">
          <b>{EVERYDAY_ENTRIES.length - studied}</b>
          <span>còn lại</span>
        </div>
      </section>

      {quiz && quizCurrent ? (
        <section className="card everyday-study everyday-quiz" aria-label="Quiz tiếng Anh đời thường">
          <div className="row between">
            <span className="badge b-indigo">Kiểm tra nhanh</span>
            <span className="muted">
              Câu {quizIndex + 1} / {quiz.length}
            </span>
          </div>
          <div className="everyday-study-face">
            <span className="eyebrow">Chọn nghĩa đúng</span>
            <h2>{quizCurrent.text}</h2>
            <div className="everyday-quiz-options">
              {quiz[quizIndex].choices.map((choice) => {
                const isAnswer = choice === quizCurrent.meaning;
                const selected = choice === quizChoice;
                const stateClass =
                  quizChoice === null ? "" : isAnswer ? " is-correct" : selected ? " is-wrong" : " is-muted";
                return (
                  <button
                    key={choice}
                    className={`everyday-quiz-choice${stateClass}`}
                    disabled={quizChoice !== null}
                    onClick={() => answerQuiz(choice)}
                  >
                    <span>{choice}</span>
                    {quizChoice !== null && isAnswer && <Icon name="check" size="sm" />}
                    {quizChoice !== null && selected && !isAnswer && <Icon name="x" size="sm" />}
                  </button>
                );
              })}
            </div>
            {quizChoice !== null && (
              <div className="everyday-answer">
                <p className="everyday-definition">
                  <span>EN</span>
                  {quizCurrent.definition}
                </p>
                {quizCurrent.example && (
                  <blockquote>
                    {quizCurrent.example}
                    {quizCurrent.exampleVi && <small>{quizCurrent.exampleVi}</small>}
                  </blockquote>
                )}
                {quizCurrent.usage && <small className="muted">{quizCurrent.usage}</small>}
                <button className="btn primary everyday-quiz-next" onClick={nextQuizQuestion}>
                  {quizIndex + 1 === quiz.length ? "Xem kết quả" : "Câu tiếp theo"}
                </button>
              </div>
            )}
          </div>
          <button className="text-link everyday-exit" onClick={() => setQuiz(null)}>
            Thoát bài kiểm tra
          </button>
        </section>
      ) : quiz ? (
        <section className="card everyday-finished">
          <span className="practice-option-icon">
            <Icon name="check" size="lg" />
          </span>
          <h2>Hoàn thành bài kiểm tra</h2>
          <p className="muted">
            Bạn trả lời đúng {quizCorrect} / {quiz.length} câu. Những câu sai đã được thêm vào mục Đang học trong phần
            Ôn tập.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={startQuiz}>
              Làm lại
            </button>
            <button className="btn primary" onClick={() => setQuiz(null)}>
              Về danh sách
            </button>
          </div>
        </section>
      ) : studyIds && current ? (
        <section className="card everyday-study" aria-label="Flashcard tiếng Anh đời thường">
          <div className="row between">
            <span className="badge b-indigo">{EVERYDAY_KIND_LABEL[current.kind]}</span>
            <span className="muted">
              Thẻ {studyIndex + 1} / {studyIds.length}
            </span>
          </div>
          <div className="everyday-study-face">
            <h2>{current.text}</h2>
            {revealed ? (
              <div className="everyday-answer">
                <p className="everyday-definition">
                  <span>EN</span>
                  {current.definition}
                </p>
                <p className="everyday-meaning">
                  <span>VI</span>
                  {current.meaning}
                </p>
                {current.example && (
                  <blockquote>
                    {current.example}
                    {current.exampleVi && <small>{current.exampleVi}</small>}
                  </blockquote>
                )}
                {current.otherSenses?.length ? (
                  <div className="everyday-other-senses">
                    <h3>Nghĩa khác</h3>
                    {current.otherSenses.map((sense) => (
                      <article key={`${sense.meaning}-${sense.definition}`}>
                        <p className="everyday-definition">
                          <span>EN</span>
                          {sense.definition}
                        </p>
                        <p className="everyday-meaning">
                          <span>VI</span>
                          {sense.meaning}
                        </p>
                        <blockquote>
                          {sense.example}
                          <small>{sense.exampleVi}</small>
                        </blockquote>
                      </article>
                    ))}
                  </div>
                ) : null}
                {current.usage && <small className="muted">{current.usage}</small>}
              </div>
            ) : (
              <button className="btn" onClick={() => setRevealed(true)}>
                Hiện nghĩa
              </button>
            )}
          </div>
          {revealed && (
            <div className="rate-grid">
              <button className="rate-btn r1" onClick={() => rate("new")}>
                Chưa nhớ<small>Ôn lại sau</small>
              </button>
              <button className="rate-btn r2" onClick={() => rate("learning")}>
                Đang học<small>Nhớ một phần</small>
              </button>
              <button className="rate-btn r3" onClick={() => rate("mastered")}>
                Đã thuộc<small>Nhớ chắc</small>
              </button>
            </div>
          )}
          <button className="text-link everyday-exit" onClick={() => setStudyIds(null)}>
            Thoát lượt học
          </button>
        </section>
      ) : studyIds ? (
        <section className="card everyday-finished">
          <span className="practice-option-icon">
            <Icon name="check" size="lg" />
          </span>
          <h2>Xong lượt học rồi</h2>
          <p className="muted">Tiến độ của bộ sưu tập đã được lưu vào hồ sơ.</p>
          <button className="btn primary" onClick={() => setStudyIds(null)}>
            Về danh sách
          </button>
        </section>
      ) : (
        <>
          <section className="card everyday-controls">
            <div className="everyday-filter-list" role="group" aria-label="Lọc loại cụm từ">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  className={`btn sm${filter === key ? " primary" : ""}`}
                  aria-pressed={filter === key}
                  onClick={() => setKindFilter(key)}
                >
                  {FILTER_LABEL[key]}
                </button>
              ))}
            </div>
            <div className="everyday-extra-filters">
              <label>
                Mức độ phổ biến
                <select
                  className="input"
                  value={usageFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUsageFilter(value === "all" ? "all" : (Number(value) as UsageLevel));
                    setDisplayLimit(60);
                  }}
                >
                  <option value="all">Mọi mức độ</option>
                  <option value={3}>Rất phổ biến</option>
                  <option value={2}>Phổ biến</option>
                  <option value={1}>Ít gặp hơn</option>
                  <option value={0}>Hiếm gặp</option>
                </select>
              </label>
              <label>
                Tiến độ
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as "all" | Status);
                    setDisplayLimit(60);
                  }}
                >
                  <option value="all">Mọi trạng thái</option>
                  <option value="new">Chưa học</option>
                  <option value="learning">Đang học</option>
                  <option value="confirming">Đang xác nhận</option>
                  <option value="mastered">Đã thuộc</option>
                </select>
              </label>
            </div>
            <label className="search-box everyday-search">
              <span className="sr-only">Tìm trong bộ sưu tập</span>
              <Icon name="search" size="sm" />
              <input
                className="input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDisplayLimit(60);
                }}
                placeholder="Tìm cụm từ hoặc nghĩa..."
              />
            </label>
            <button className="btn" disabled={!visible.length} onClick={startStudy}>
              <Icon name="layers" size="sm" /> Học {visible.length} thẻ
            </button>
            <button className="btn primary" disabled={!visible.length} onClick={startQuiz}>
              Kiểm tra nhanh {Math.min(visible.length, 10)} câu
            </button>
          </section>

          <section className="everyday-grid" aria-label="Các cụm từ đời thường">
            {displayed.map((entry) => {
              const learned: Status = displayedStatus(statusId(entry.id), status, srs ?? {});
              return (
                <article className="card everyday-item" key={entry.id}>
                  <div className="row between">
                    <span className="badge b-indigo">{EVERYDAY_KIND_LABEL[entry.kind]}</span>
                    <div className="row everyday-badges">
                      <UsageMeter level={entry.usageLevel} />
                      <span
                        className={`badge ${learned === "mastered" ? "b-emerald" : learned === "confirming" ? "b-sky" : learned === "learning" ? "b-amber" : "b-slate"}`}
                      >
                        {STATUS_INFO[learned].label}
                      </span>
                    </div>
                  </div>
                  <h2>{entry.text}</h2>
                  <p className="everyday-definition">
                    <span>EN</span>
                    {entry.definition}
                  </p>
                  <p className="everyday-meaning">
                    <span>VI</span>
                    {entry.meaning}
                  </p>
                  {entry.example && (
                    <blockquote>
                      {entry.example}
                      {entry.exampleVi && <small>{entry.exampleVi}</small>}
                    </blockquote>
                  )}
                  {entry.otherSenses?.length ? (
                    <details className="everyday-other-senses">
                      <summary>{entry.otherSenses.length} nghĩa khác</summary>
                      {entry.otherSenses.map((sense) => (
                        <article key={`${sense.meaning}-${sense.definition}`}>
                          <p className="everyday-definition">
                            <span>EN</span>
                            {sense.definition}
                          </p>
                          <p className="everyday-meaning">
                            <span>VI</span>
                            {sense.meaning}
                          </p>
                          <blockquote>
                            {sense.example}
                            <small>{sense.exampleVi}</small>
                          </blockquote>
                        </article>
                      ))}
                    </details>
                  ) : null}
                  {entry.usage && <p className="everyday-usage">{entry.usage}</p>}
                </article>
              );
            })}
          </section>
          {visible.length > displayLimit && (
            <div className="everyday-load-more">
              <p className="muted">
                Đang hiện {displayed.length.toLocaleString("vi-VN")} / {visible.length.toLocaleString("vi-VN")} mục phù
                hợp
              </p>
              <button className="btn" onClick={() => setDisplayLimit((limit) => limit + 60)}>
                Hiện thêm 60 mục
              </button>
            </div>
          )}
          {!visible.length && <p className="muted">Không tìm thấy mục nào phù hợp.</p>}
        </>
      )}
    </div>
  );
}
