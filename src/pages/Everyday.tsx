import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { EVERYDAY_ENTRIES, EVERYDAY_KIND_LABEL, type EverydayKind } from "@/data/everyday";
import { STATUS_INFO } from "@/lib/data";
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
type EverydayQuestion = { id: string; choices: string[] };

export function EverydayPage() {
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "learning";
  const reviewStarted = useRef(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [studyIds, setStudyIds] = useState<string[] | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [quiz, setQuiz] = useState<EverydayQuestion[] | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const { status, setStatus, logActivity, recordAnswer } = useProfile();
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return EVERYDAY_ENTRIES.filter((entry) => {
      const matchesKind = filter === "all" || entry.kind === filter;
      const senseText = entry.otherSenses?.map((sense) => `${sense.meaning} ${sense.definition} ${sense.example}`).join(" ") ?? "";
      const matchesQuery = !q || fold(`${entry.text} ${entry.meaning} ${entry.definition} ${entry.example} ${senseText}`).includes(q);
      return matchesKind && matchesQuery;
    });
  }, [filter, query]);
  const studied = EVERYDAY_ENTRIES.filter((entry) => status[statusId(entry.id)] === "mastered").length;
  const current = studyIds ? EVERYDAY_ENTRIES.find((entry) => entry.id === studyIds[studyIndex]) : null;
  const quizCurrent = quiz ? EVERYDAY_ENTRIES.find((entry) => entry.id === quiz[quizIndex]?.id) : null;

  useEffect(() => {
    if (!reviewMode || reviewStarted.current) return;
    reviewStarted.current = true;
    const ids = EVERYDAY_ENTRIES.filter((entry) => status[statusId(entry.id)] === "learning").map((entry) => entry.id);
    if (ids.length) {
      setStudyIds(ids);
      setStudyIndex(0);
      setRevealed(false);
    }
  }, [reviewMode, status]);

  const startStudy = () => {
    if (!visible.length) return;
    setQuiz(null);
    setStudyIds(visible.map((entry) => entry.id));
    setStudyIndex(0);
    setRevealed(false);
  };
  const startQuiz = () => {
    if (!visible.length) return;
    const questions = shuffle(visible).slice(0, 10).map((entry) => {
      const distractors = shuffle(EVERYDAY_ENTRIES.filter((other) => other.id !== entry.id))
        .slice(0, 3)
        .map((other) => other.meaning);
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
    setQuizChoice(choice);
    const correct = choice === quizCurrent.meaning;
    if (correct) setQuizCorrect((value) => value + 1);
    else setStatus(statusId(quizCurrent.id), "learning");
    recordAnswer(statusId(quizCurrent.id), correct);
  };
  const nextQuizQuestion = () => {
    setQuizChoice(null);
    setQuizIndex((index) => index + 1);
  };
  const rate = (value: Status) => {
    if (!current) return;
    // “Chưa nhớ” vẫn cần quay lại Ôn tập, nên giữ mục ở trạng thái đang học.
    setStatus(statusId(current.id), value === "new" ? "learning" : value);
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
          Học cụm từ, phrasal verbs, thành ngữ và từ lóng theo ngữ cảnh. Bộ này có tiến độ riêng, không cộng vào 600 từ TOEIC.
        </p>
      </header>

      <section className="d-stats everyday-stats" aria-label="Tiến độ bộ sưu tập">
        <div className="d-stat"><b>{EVERYDAY_ENTRIES.length}</b><span>mục đang có</span></div>
        <div className="d-stat"><b>{studied}</b><span>đã thuộc</span></div>
        <div className="d-stat"><b>{EVERYDAY_ENTRIES.length - studied}</b><span>còn lại</span></div>
      </section>

      {quiz && quizCurrent ? (
        <section className="card everyday-study everyday-quiz" aria-label="Quiz tiếng Anh đời thường">
          <div className="row between">
            <span className="badge b-indigo">Kiểm tra nhanh</span>
            <span className="muted">Câu {quizIndex + 1} / {quiz.length}</span>
          </div>
          <div className="everyday-study-face">
            <span className="eyebrow">Chọn nghĩa đúng</span>
            <h2>{quizCurrent.text}</h2>
            <div className="everyday-quiz-options">
              {quiz[quizIndex].choices.map((choice) => {
                const isAnswer = choice === quizCurrent.meaning;
                const selected = choice === quizChoice;
                const stateClass = quizChoice === null ? "" : isAnswer ? " is-correct" : selected ? " is-wrong" : " is-muted";
                return <button key={choice} className={`everyday-quiz-choice${stateClass}`} disabled={quizChoice !== null} onClick={() => answerQuiz(choice)}>
                  <span>{choice}</span>
                  {quizChoice !== null && isAnswer && <Icon name="check" size="sm" />}
                  {quizChoice !== null && selected && !isAnswer && <Icon name="x" size="sm" />}
                </button>;
              })}
            </div>
            {quizChoice !== null && <div className="everyday-answer">
              <p className="everyday-definition"><span>EN</span>{quizCurrent.definition}</p>
              <blockquote>{quizCurrent.example}<small>{quizCurrent.exampleVi}</small></blockquote>
              {quizCurrent.usage && <small className="muted">{quizCurrent.usage}</small>}
              <button className="btn primary everyday-quiz-next" onClick={nextQuizQuestion}>{quizIndex + 1 === quiz.length ? "Xem kết quả" : "Câu tiếp theo"}</button>
            </div>}
          </div>
          <button className="text-link everyday-exit" onClick={() => setQuiz(null)}>Thoát bài kiểm tra</button>
        </section>
      ) : quiz ? (
        <section className="card everyday-finished">
          <span className="practice-option-icon"><Icon name="check" size="lg" /></span>
          <h2>Hoàn thành bài kiểm tra</h2>
          <p className="muted">Bạn trả lời đúng {quizCorrect} / {quiz.length} câu. Những câu sai đã được thêm vào mục Đang học trong phần Ôn tập.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={startQuiz}>Làm lại</button>
            <button className="btn primary" onClick={() => setQuiz(null)}>Về danh sách</button>
          </div>
        </section>
      ) : studyIds && current ? (
        <section className="card everyday-study" aria-label="Flashcard tiếng Anh đời thường">
          <div className="row between">
            <span className="badge b-indigo">{EVERYDAY_KIND_LABEL[current.kind]}</span>
            <span className="muted">Thẻ {studyIndex + 1} / {studyIds.length}</span>
          </div>
          <div className="everyday-study-face">
            <h2>{current.text}</h2>
            {revealed ? (
              <div className="everyday-answer">
                <p className="everyday-definition"><span>EN</span>{current.definition}</p>
                <p className="everyday-meaning"><span>VI</span>{current.meaning}</p>
                <blockquote>{current.example}<small>{current.exampleVi}</small></blockquote>
                {current.otherSenses?.length ? <div className="everyday-other-senses">
                  <h3>Nghĩa khác</h3>
                  {current.otherSenses.map((sense) => <article key={`${sense.meaning}-${sense.definition}`}>
                    <p className="everyday-definition"><span>EN</span>{sense.definition}</p>
                    <p className="everyday-meaning"><span>VI</span>{sense.meaning}</p>
                    <blockquote>{sense.example}<small>{sense.exampleVi}</small></blockquote>
                  </article>)}
                </div> : null}
                {current.usage && <small className="muted">{current.usage}</small>}
              </div>
            ) : (
              <button className="btn" onClick={() => setRevealed(true)}>Hiện nghĩa</button>
            )}
          </div>
          {revealed && (
            <div className="rate-grid">
              <button className="rate-btn r1" onClick={() => rate("new")}>Chưa nhớ<small>Ôn lại sau</small></button>
              <button className="rate-btn r2" onClick={() => rate("learning")}>Đang học<small>Nhớ một phần</small></button>
              <button className="rate-btn r3" onClick={() => rate("mastered")}>Đã thuộc<small>Nhớ chắc</small></button>
            </div>
          )}
          <button className="text-link everyday-exit" onClick={() => setStudyIds(null)}>Thoát lượt học</button>
        </section>
      ) : studyIds ? (
        <section className="card everyday-finished">
          <span className="practice-option-icon"><Icon name="check" size="lg" /></span>
          <h2>Xong lượt học rồi</h2>
          <p className="muted">Tiến độ của bộ sưu tập đã được lưu vào hồ sơ.</p>
          <button className="btn primary" onClick={() => setStudyIds(null)}>Về danh sách</button>
        </section>
      ) : (
        <>
          <section className="card everyday-controls">
            <div className="everyday-filter-list" role="group" aria-label="Lọc loại cụm từ">
              {FILTERS.map((key) => (
                <button key={key} className={`btn sm${filter === key ? " primary" : ""}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  {FILTER_LABEL[key]}
                </button>
              ))}
            </div>
            <label className="search-box everyday-search">
              <span className="sr-only">Tìm trong bộ sưu tập</span>
              <Icon name="search" size="sm" />
              <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm cụm từ hoặc nghĩa..." />
            </label>
            <button className="btn" disabled={!visible.length} onClick={startStudy}>
              <Icon name="layers" size="sm" /> Học {visible.length} thẻ
            </button>
            <button className="btn primary" disabled={!visible.length} onClick={startQuiz}>
              Kiểm tra nhanh {Math.min(visible.length, 10)} câu
            </button>
          </section>

          <section className="everyday-grid" aria-label="Các cụm từ đời thường">
            {visible.map((entry) => {
              const learned: Status = status[statusId(entry.id)] ?? "new";
              return (
                <article className="card everyday-item" key={entry.id}>
                  <div className="row between">
                    <span className="badge b-indigo">{EVERYDAY_KIND_LABEL[entry.kind]}</span>
                    <span className={`badge ${learned === "mastered" ? "b-emerald" : learned === "learning" ? "b-amber" : "b-slate"}`}>
                      {STATUS_INFO[learned].label}
                    </span>
                  </div>
                  <h2>{entry.text}</h2>
                  <p className="everyday-definition"><span>EN</span>{entry.definition}</p>
                  <p className="everyday-meaning"><span>VI</span>{entry.meaning}</p>
                  <blockquote>{entry.example}<small>{entry.exampleVi}</small></blockquote>
                  {entry.otherSenses?.length ? <details className="everyday-other-senses">
                    <summary>{entry.otherSenses.length} nghĩa khác</summary>
                    {entry.otherSenses.map((sense) => <article key={`${sense.meaning}-${sense.definition}`}>
                      <p className="everyday-definition"><span>EN</span>{sense.definition}</p>
                      <p className="everyday-meaning"><span>VI</span>{sense.meaning}</p>
                      <blockquote>{sense.example}<small>{sense.exampleVi}</small></blockquote>
                    </article>)}
                  </details> : null}
                  {entry.usage && <p className="everyday-usage">{entry.usage}</p>}
                </article>
              );
            })}
          </section>
          {!visible.length && <p className="muted">Không tìm thấy mục nào phù hợp.</p>}
        </>
      )}
    </div>
  );
}
