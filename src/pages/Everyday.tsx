import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { EVERYDAY_ENTRIES, EVERYDAY_KIND_LABEL, type EverydayKind } from "@/data/everyday";
import { STATUS_INFO } from "@/lib/data";
import type { Status } from "@/lib/types";
import { fold } from "@/lib/util";
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

export function EverydayPage() {
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "learning";
  const reviewStarted = useRef(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [studyIds, setStudyIds] = useState<string[] | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const { status, setStatus, logActivity } = useProfile();
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return EVERYDAY_ENTRIES.filter((entry) => {
      const matchesKind = filter === "all" || entry.kind === filter;
      const matchesQuery = !q || fold(`${entry.text} ${entry.meaning} ${entry.example}`).includes(q);
      return matchesKind && matchesQuery;
    });
  }, [filter, query]);
  const studied = EVERYDAY_ENTRIES.filter((entry) => status[statusId(entry.id)] === "mastered").length;
  const current = studyIds ? EVERYDAY_ENTRIES.find((entry) => entry.id === studyIds[studyIndex]) : null;

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
    setStudyIds(visible.map((entry) => entry.id));
    setStudyIndex(0);
    setRevealed(false);
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

      {studyIds && current ? (
        <section className="card everyday-study" aria-label="Flashcard tiếng Anh đời thường">
          <div className="row between">
            <span className="badge b-indigo">{EVERYDAY_KIND_LABEL[current.kind]}</span>
            <span className="muted">Thẻ {studyIndex + 1} / {studyIds.length}</span>
          </div>
          <div className="everyday-study-face">
            <h2>{current.text}</h2>
            {revealed ? (
              <div className="everyday-answer">
                <p>{current.meaning}</p>
                <blockquote>{current.example}<small>{current.exampleVi}</small></blockquote>
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
            <button className="btn primary" disabled={!visible.length} onClick={startStudy}>
              <Icon name="layers" size="sm" /> Học {visible.length} thẻ
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
                  <p className="everyday-meaning">{entry.meaning}</p>
                  <blockquote>{entry.example}<small>{entry.exampleVi}</small></blockquote>
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
