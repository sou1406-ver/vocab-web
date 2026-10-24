import "./vocabulary.css";
import { Link } from "react-router-dom";
import { Progress } from "@/components/bits";
import { FreqMeter } from "@/components/FreqMeter";
import { Icon } from "@/components/Icon";
import BlurText from "@/components/reactbits/BlurText";
import { LESSONS, termInfo, unitOf } from "@/lib/data";
import { lessonBookDone, lessonProgress, pct, resumeLesson } from "@/lib/progress";
import { displayedStatus } from "@/lib/srs";
import type { Topic } from "@/lib/types";
import { cx } from "@/lib/util";
import { useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { useUI } from "@/state/ui";

function UnitBlock({ t, i }: { t: Topic; i: number }) {
  const act = useActions();
  const { catalog, status, book, srs } = useProfile();
  const words = catalog.all.filter((w) => unitOf(w) === t.id);
  const m = words.filter((w) => displayedStatus(w.id, status, srs ?? {}) === "mastered").length;
  const lessons = t.id === "custom" ? [] : LESSONS.filter((l) => l.unit === t.id);
  return (
    <section className="unit">
      <div>
        <div className="unit-no">{t.id === "custom" ? "Của bạn" : `Phần ${i + 1}`}</div>
        <h3 className="unit-title">{t.name}</h3>
        <div className="unit-en">{t.en}</div>
        <div className="unit-meta">
          <span>
            {m}/{words.length} từ đã thuộc
          </span>
        </div>
        <div className="unit-links">
          <button className="text-link" onClick={() => act.openUnit(t.id, "flashcards")}>
            Flashcard
          </button>
          <button className="text-link" onClick={() => act.openUnit(t.id, "quiz")}>
            Bài tập
          </button>
        </div>
      </div>
      <div className="lesson-grid">
        {lessons.length
          ? lessons.map((l) => {
              const p = lessonProgress(catalog, status, l.n);
              const done = p.total > 0 && p.mastered === p.total;
              return (
                <button key={l.n} className={cx("lesson-tile", done && "done")} onClick={() => act.openLesson(l.n)}>
                  <span className="ln">
                    Bài {l.n}
                    {done ? " · xong" : p.mastered ? ` · ${p.mastered}/${p.total}` : ""}
                    {lessonBookDone(book, l.n) && (
                      <span className="ex-done" title="Đã làm bài tập trong sách">
                        {" "}
                        ✓ bài tập
                      </span>
                    )}
                  </span>
                  <span className="lt">{l.title}</span>
                  <span className="lv">{l.vi}</span>
                  <Progress value={pct(p.mastered, p.total)} />
                </button>
              );
            })
          : words.map((w) => (
              <Link key={w.id} className="lesson-tile" to={`/network/${w.id}`}>
                <FreqMeter z={termInfo(w.word).z} />
                <span className="lt">{w.word}</span>
                <span className="lv">{w.vi}</span>
              </Link>
            ))}
      </div>
    </section>
  );
}

export function TopicsPage() {
  const act = useActions();
  const setModal = useUI((s) => s.setModal);
  const { catalog, status, srs } = useProfile();
  const total = catalog.all.length;
  const mastered = catalog.all.filter((w) => displayedStatus(w.id, status, srs ?? {}) === "mastered").length;
  const learning = catalog.all.filter((w) => displayedStatus(w.id, status, srs ?? {}) === "learning").length;
  const confirming = catalog.all.filter((w) => displayedStatus(w.id, status, srs ?? {}) === "confirming").length;
  const next = resumeLesson(catalog, status);
  const np = lessonProgress(catalog, status, next.n);

  return (
    <div className="stack">
      <section className="home-head">
        <div>
          <p className="kicker">600 Essential Words for the TOEIC · 50 bài</p>
          <h1>
            <BlurText text="Học một từ, nhớ cả họ từ." animateBy="words" delay={60} direction="bottom" />
          </h1>
          <p className="lede">
            Học từ theo ý nghĩa cốt lõi và họ từ: xem một ý tưởng chuyển thành danh từ, động từ, tính từ hay trạng từ
            trong câu TOEIC.
          </p>
        </div>
        <div className="resume">
          <div className="eyebrow">{np.started ? "Học tiếp" : "Bắt đầu"}</div>
          <h3>
            Bài {next.n} · {next.title}
          </h3>
          <p className="muted">
            {next.vi} · {np.mastered}/{np.total} từ đã thuộc
          </p>
          <Progress value={pct(np.mastered, np.total)} />
          <div className="row">
            <button className="btn primary" onClick={() => act.openLesson(next.n)}>
              Mở trường từ bài {next.n} <Icon name="right" size="sm" />
            </button>
            <button className="btn" onClick={() => act.openLessonFlash(next.n)}>
              Flashcard
            </button>
            <button className="btn" onClick={() => act.openLessonBook(next.n)}>
              Bài tập sách
            </button>
          </div>
        </div>
      </section>

      <div className="overall">
        <span>
          <b>{mastered}</b> / {total} từ đã thuộc
        </span>
        <span>
          {learning} đang học · {confirming} đang xác nhận
        </span>
        <Progress value={pct(mastered, total)} title={`${Math.round(pct(mastered, total))}%`} />
      </div>

      <div>
        <div className="toc-head">
          <h2 className="section-title">Mục lục</h2>
          <button className="btn sm ghost" onClick={() => setModal({ kind: "word" })}>
            <Icon name="plus" size="sm" /> Thêm trường từ của bạn
          </button>
        </div>
        {catalog.topics.map((t, i) => (
          <UnitBlock key={t.id} t={t} i={i} />
        ))}
      </div>
    </div>
  );
}
