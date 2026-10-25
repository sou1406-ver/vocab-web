"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { catalog } from "../data/catalog";
import { useApp } from "../state/provider";
import { Icon, ProgressBar, Empty } from "../shared/ui";
import { statusOf, makeRecognitionQuestions } from "../domain/learning";
import { useWord } from "../app/context";
import { clozeLessons, loadClozeLesson } from "../data/cloze";

export default function Lessons({ lessonId: id }: { lessonId?: string }) {
  const { data, start, startExercises, busy } = useApp();
  const [topic, setTopic] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingKind, setLoadingKind] = useState<"cloze-choice" | "word-form-choice" | null>(null);
  const [loadError, setLoadError] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [id],
  );
  const inspect = useWord();
  const router = useRouter();
  const lesson = catalog.lessons.find((l) => l.id === Number(id));
  const active = data.session && data.session.phase !== "complete";
  if (id && !lesson)
    return (
      <div className="page">
        <Empty title="Không tìm thấy bài này">
          <Link className="button primary" href="/lessons">
            Về danh sách bài
          </Link>
        </Empty>
      </div>
    );
  if (lesson) {
    const exercise = clozeLessons.find((entry) => entry.lessonId === lesson.id);
    const practiceCloze = async (kind: "cloze-choice" | "word-form-choice") => {
      if (active) return router.push("/study");
      const controller = new AbortController();
      request.current?.abort();
      request.current = controller;
      setLoading(true);
      setLoadingKind(kind);
      setLoadError("");
      try {
        const questions = (await loadClozeLesson(lesson.id, controller.signal)).filter((q) => q.kind === kind);
        if (
          !controller.signal.aborted &&
          (await startExercises(
            questions,
            `${kind === "word-form-choice" ? "Dạng từ" : "Điền chỗ trống"} · ${lesson.title}`,
          ))
        )
          router.push("/study");
      } catch {
        if (!controller.signal.aborted) setLoadError("Không tải được bài tập. Hãy thử lại.");
      } finally {
        if (request.current === controller) setLoading(false);
      }
    };
    const words = catalog.words.filter((w) => w.lesson === lesson.id);
    const untested = words.filter((w) => !data.progress[w.id]?.tested);
    const learned = words.length - untested.length;
    const practiceRecognition = async () => {
      if (active) return router.push("/study");
      setRecognitionError("");
      try {
        const title = `Chọn nghĩa / chọn từ · ${lesson.title}`;
        const offset =
          (data.history.filter((item) => item.mode === "practice" && item.title === title).length * 6) % words.length;
        const batch = [...words.slice(offset), ...words.slice(0, offset)].slice(0, 6);
        if (await startExercises((sessionId) => makeRecognitionQuestions(batch, catalog.words, sessionId), title))
          router.push("/study");
      } catch (error) {
        setRecognitionError(error instanceof Error ? error.message : "Chưa mở được bài luyện.");
      }
    };
    const begin = async () => {
      if (active) return router.push("/study");
      if (
        await start(
          (untested.length ? untested : words).slice(0, 5),
          untested.length ? "learn" : "practice",
          `Bài ${lesson.id} · ${lesson.title}`,
        )
      )
        router.push("/study");
    };
    return (
      <div className="page">
        <Link className="back-link" href="/lessons">
          ← Tất cả bài học
        </Link>
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              BÀI {String(lesson.id).padStart(2, "0")} · {catalog.topics.find((t) => t.id === lesson.topicId)?.title}
            </p>
            <h1 tabIndex={-1}>{lesson.title}</h1>
            <p className="page-subtitle">
              {lesson.translation} · {words.length} từ vựng trong ngữ cảnh
            </p>
          </div>
          <button className="button primary" onClick={() => void begin()} disabled={busy}>
            {active ? "Tiếp tục lượt đang học" : untested.length ? "Học 5 từ tiếp theo" : "Luyện lại bài"}
            <Icon name="arrow" />
          </button>
        </div>
        <div className="lesson-overview panel">
          <div>
            <b>
              {learned}
              <span>/{words.length}</span>
            </b>
            <p>từ đã học và kiểm tra</p>
          </div>
          <div className="lesson-overview-progress">
            <ProgressBar value={(learned / words.length) * 100} label="Tiến độ bài" />
            <p>Học để hiểu trước, quay lại ôn để nhớ lâu.</p>
          </div>
          <div>
            <b>{words.filter((w) => (data.progress[w.id]?.box ?? 0) >= 5).length}</b>
            <p>từ nhớ ổn định</p>
          </div>
        </div>
        {(
          [
            { kind: "cloze-choice", title: "Điền chỗ trống", button: "Luyện điền chỗ trống" },
            { kind: "word-form-choice", title: "Dạng từ", button: "Luyện dạng từ" },
          ] as const
        ).map((group) => (
          <section className="panel cloze-practice" aria-label={group.title} key={group.kind}>
            <div>
              <h2>{group.title}</h2>
              <p>
                {exercise?.kinds[group.kind] ?? 0} câu ·{" "}
                {group.kind === "word-form-choice" ? "Chọn đúng dạng từ trong câu." : "Chọn từ phù hợp trong câu."}{" "}
                Luyện thêm không tăng bậc ôn.
              </p>
              {loadError && loadingKind === group.kind && <p role="alert">{loadError}</p>}
              {active && <p>Tiếp tục hoặc kết thúc lượt đang học trước khi mở bài luyện mới.</p>}
            </div>
            <button
              className="button secondary"
              disabled={busy || loading || Boolean(active) || !exercise?.kinds[group.kind]}
              onClick={() => void practiceCloze(group.kind)}
            >
              {loading && loadingKind === group.kind ? "Đang tải bài tập…" : group.button}
              <Icon name="arrow" />
            </button>
          </section>
        ))}
        <section className="panel cloze-practice" aria-label="Chọn nghĩa và chọn từ">
          <div>
            <h2>Chọn nghĩa / chọn từ</h2>
            {recognitionError && <p role="alert">{recognitionError}</p>}
            <p>
              {Math.min(words.length, 6) * 2} câu · Nhìn từ chọn nghĩa, nhìn nghĩa chọn từ. Luyện thêm không tăng bậc
              ôn.
            </p>
          </div>
          <button
            className="button secondary"
            disabled={busy || loading || Boolean(active)}
            onClick={() => void practiceRecognition()}
          >
            Luyện chọn nghĩa / chọn từ <Icon name="arrow" />
          </button>
        </section>
        <div className="section-heading">
          <h2>Từ vựng trong bài</h2>
          <span className="muted">Bấm vào từ để xem nghĩa và ví dụ</span>
        </div>
        <div className="word-list">
          {words.map((word, index) => (
            <button className="word-row" key={word.id} onClick={() => inspect(word)}>
              <span className="word-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="word-row-main">
                <b lang="en">{word.text}</b>
                <span>{word.meaning}</span>
              </span>
              <span className="pos">{word.pos}</span>
              <span className={`status-badge ${data.progress[word.id] ? "started" : ""}`}>
                {statusOf(data.progress[word.id])}
              </span>
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </div>
        <p className="quiet-note">
          Kiểm tra trong lượt học giúp lên lịch ôn. Bài kiểm tra qua bài sẽ được bổ sung ở giai đoạn sau.
        </p>
      </div>
    );
  }
  const visible = catalog.lessons.filter((l) => topic === "all" || l.topicId === topic);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {catalog.words.length} TỪ · {catalog.lessons.length} BÀI · MỘT HÀNH TRÌNH
          </p>
          <h1 tabIndex={-1}>
            Từng bài, từng bước<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">Chọn chủ đề bạn cần. Học theo nhịp của riêng mình.</p>
        </div>
        <span className="edition-label">
          <Icon name="book" size={16} /> 600 ESSENTIAL WORDS
        </span>
      </div>
      <div className="filter-bar">
        <label htmlFor="topic-select">Chủ đề</label>
        <select id="topic-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">Tất cả chủ đề</option>
          {catalog.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <span className="muted">{visible.length} bài học</span>
      </div>
      <div className="lesson-grid">
        {visible.map((l) => {
          const words = catalog.words.filter((w) => w.lesson === l.id);
          const learned = words.filter((w) => data.progress[w.id]?.tested).length;
          return (
            <Link className="lesson-card" href={`/lessons/${l.id}`} key={l.id}>
              <div className="lesson-card-top">
                <span className="lesson-number">{String(l.id).padStart(2, "0")}</span>
                <span className="small-label">{catalog.topics.find((t) => t.id === l.topicId)?.title}</span>
                <Icon name="arrow" size={18} />
              </div>
              <h2 lang="en">{l.title}</h2>
              <p>{l.translation}</p>
              <div className="lesson-card-footer">
                <span>{learned ? `${learned}/${words.length} từ đã học` : `${words.length} từ · Chưa bắt đầu`}</span>
                <span>{Math.round((learned / words.length) * 100)}%</span>
              </div>
              <ProgressBar
                value={(learned / words.length) * 100}
                label={`Bài ${l.id}: ${learned} trên ${words.length} từ`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
