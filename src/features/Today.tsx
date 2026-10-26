"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { activeBook } from "../data/catalog";
import { useApp } from "../state/provider";
import { dayKey, dueIds, introducedToday } from "../domain/learning";
import { Icon, ProgressBar } from "../shared/ui";
import { useWord } from "../app/context";

export function Today() {
  const { data, start, busy } = useApp();
  const router = useRouter();
  const inspect = useWord();
  const book = activeBook(data.settings);
  const catalog = book.catalog;
  const all = [...catalog.words, ...data.customWords];
  const due = dueIds(data).filter((id) => all.some((w) => w.id === id));
  const introduced = introducedToday(data);
  const active = data.session && data.session.phase !== "complete";
  const lesson =
    catalog.lessons.find((l) => catalog.words.some((w) => w.lesson === l.id && !data.progress[w.id]?.tested)) ??
    catalog.lessons[0];
  const nextWords = catalog.words.filter((w) => w.lesson === lesson.id && !data.progress[w.id]?.tested).slice(0, 5);
  const today = dayKey(Date.now(), data.settings.timezone);
  const reviewed = new Set(data.events.filter((e) => e.day === today && e.mode === "review").map((e) => e.wordId)).size;
  const learned = catalog.words.filter((w) => data.progress[w.id]?.tested).length;
  const complete = catalog.words.filter((w) => (data.progress[w.id]?.box ?? 0) >= 5).length;
  const dailyGoal = Math.min(100, (introduced / data.settings.dailyNew) * 100);
  const preview = nextWords[1] ?? all[0];
  const doPrimary = async () => {
    if (active) return router.push("/study");
    const words = due.length ? due.slice(0, 20).map((id) => all.find((w) => w.id === id)!) : nextWords;
    if (!words.length) return router.push("/lessons");
    if (
      await start(
        words,
        due.length ? "review" : "learn",
        due.length ? "Ôn từ đến hạn" : `Bài ${lesson.id} · ${lesson.title}`,
      )
    )
      router.push("/study");
  };
  return (
    <div className="page today-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MỖI NGÀY MỘT CHÚT</p>
          <h1 tabIndex={-1}>
            Hôm nay, học một chút<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">
            {data.settings.name ? `${data.settings.name}, cùng` : "Cùng"} dành vài phút cho vốn từ của bạn nhé.
          </p>
        </div>
        <span className="edition-label">
          <Icon name="book" size={16} /> {book.shortTitle.toUpperCase()}
        </span>
      </div>
      <section className="study-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="hero-label">
            <span /> {active ? "TIẾP NỐI NHỊP HỌC" : due.length ? "ĐÃ ĐẾN LÚC ÔN LẠI" : "BUỔI HỌC CỦA BẠN"}
          </span>
          <h2 id="hero-title">
            {active ? (
              <>
                Một chút nữa.
                <br />
                Tiếp tục nhé?
              </>
            ) : due.length ? (
              <>
                Gặp lại từ cũ.
                <br />
                Nhớ thêm một lần.
              </>
            ) : (
              <>
                Thêm 5 từ.
                <br />
                Thêm một bước tiến.
              </>
            )}
          </h2>
          <p>
            {active
              ? `${data.session!.title} · Bạn đã làm ${data.session!.index} / ${data.session!.questions.length} câu.`
              : due.length
                ? `${due.length} từ đang đợi bạn. Bắt đầu với một lượt tối đa 20 từ.`
                : `${lesson.title} — ${lesson.translation}. Học nghĩa, xem ví dụ và thử tự nhớ lại.`}
          </p>
          <button className="button hero-button" disabled={busy} onClick={() => void doPrimary()}>
            {active
              ? "Tiếp tục học"
              : due.length
                ? "Bắt đầu ôn"
                : nextWords.length
                  ? "Bắt đầu học"
                  : "Khám phá bài học"}
            <Icon name="arrow" />
          </button>
          <div className="hero-footnote">
            <Icon name="clock" size={15} />
            {active
              ? "Tiến độ đã được giữ lại"
              : due.length
                ? "Mỗi lần nhớ lại, một lần vững hơn"
                : "Một lượt ngắn · Lưu sau mỗi câu"}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-star star-one">✳</span>
          <span className="art-star star-two">+</span>
          <div className="back-vocab-card">
            <span>LEARN. RECALL. REMEMBER.</span>
            <div className="card-lines">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="front-vocab-card">
            <span className="small-label">MỘT TỪ MỚI, MỘT KHỞI ĐẦU</span>
            <span className="art-word">{preview.text}</span>
            <span className="art-ipa">
              {preview.pos} &nbsp; {preview.ipa}
            </span>
            <div className="art-divider" />
            <span className="art-meaning">{preview.meaning}</span>
            <span className="art-bottom">
              <Icon name="leaf" size={17} /> a little, every day.
            </span>
          </div>
          <div className="art-check">
            <Icon name="check" size={24} />
          </div>
        </div>
      </section>
      <section className="stats-grid" aria-label="Việc học của bạn">
        <div className="stat-card">
          <span className="stat-icon green">
            <Icon name="new-word" />
          </span>
          <div>
            <span className="stat-label">Từ mới hôm nay</span>
            <div className="stat-number">
              {introduced}
              <small>/ {data.settings.dailyNew} từ</small>
            </div>
          </div>
          <span className="stat-note">Mục tiêu mỗi ngày</span>
        </div>
        <div className="stat-card stat-card--brand stat-card--due">
          <span className="stat-icon">
            <Icon name="repeat" />
          </span>
          <div>
            <span className="stat-label">Đến hạn ôn</span>
            <div className="stat-number">
              {due.length}
              <small>từ</small>
            </div>
          </div>
          <span className="stat-note">{reviewed ? `Đã ôn ${reviewed} từ hôm nay` : "Ôn lại để nhớ lâu"}</span>
        </div>
        <div className="stat-card stat-card--neutral">
          <span className="stat-icon">
            <Icon name="memorized" />
          </span>
          <div>
            <span className="stat-label">Đã bắt đầu ghi nhớ</span>
            <div className="stat-number">
              {learned}
              <small>/ {catalog.words.length} từ</small>
            </div>
          </div>
          <span className="stat-note">{complete} từ nhớ ổn định</span>
        </div>
      </section>
      <div className="today-bottom">
        <section className="panel learning-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TỪNG BƯỚC VỮNG VÀNG</p>
              <h2>Tiếp tục hành trình</h2>
            </div>
            <Link className="text-link" href="/lessons">
              Tất cả bài học <Icon name="arrow" size={17} />
            </Link>
          </div>
          <div className="lesson-preview-list">
            {catalog.lessons.slice(Math.max(0, lesson.id - 1), Math.max(0, lesson.id - 1) + 3).map((l, i) => {
              const words = catalog.words.filter((w) => w.lesson === l.id);
              const count = words.filter((w) => data.progress[w.id]?.tested).length;
              return (
                <Link className="lesson-preview" href={`/books/${book.id}/lessons/${l.id}`} key={l.id}>
                  <span className={`lesson-number ${i === 0 ? "current" : ""}`}>{String(l.id).padStart(2, "0")}</span>
                  <div className="lesson-preview-body">
                    <h3>{l.title}</h3>
                    <span>
                      {l.translation} <span className="dot-separator">·</span> {words.length} từ
                    </span>
                    <ProgressBar
                      value={(count / words.length) * 100}
                      label={`Bài ${l.id}: ${count} trên ${words.length} từ`}
                    />
                  </div>
                  <span className="lesson-state">
                    {count ? `${count}/${words.length}` : i === 0 ? "Học tiếp" : "Khám phá"}
                  </span>
                  <Icon name="chevron" size={17} />
                </Link>
              );
            })}
          </div>
        </section>
        <aside className="goal-panel">
          <div className="section-heading">
            <h2>Nhịp học hôm nay</h2>
            <Icon name="target" />
          </div>
          <div className="goal-circle" style={{ "--progress": `${dailyGoal}%` } as React.CSSProperties}>
            <div>
              <b>
                {introduced}
                <span>/{data.settings.dailyNew}</span>
              </b>
              <small>từ mới</small>
            </div>
          </div>
          <p>
            {introduced >= data.settings.dailyNew
              ? "Bạn đã đạt mục tiêu hôm nay."
              : "Đều đặn quan trọng hơn thật nhiều."}
          </p>
          <Link href="/settings" className="text-link">
            Điều chỉnh mục tiêu <Icon name="arrow" size={16} />
          </Link>
        </aside>
      </div>
      <section className="word-strip">
        <div className="strip-icon">
          <Icon name="leaf" />
        </div>
        <div>
          <span className="eyebrow">GÓC TỪ VỰNG</span>
          <p>Một từ, nhiều cách dùng. Khám phá thêm những người bạn trong họ từ.</p>
        </div>
        <button className="text-link" onClick={() => inspect(preview)}>
          Khám phá “{preview.text}” <Icon name="arrow" size={16} />
        </button>
      </section>
    </div>
  );
}
