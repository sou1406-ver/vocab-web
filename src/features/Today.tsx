"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { activeBook } from "../data/catalog";
import { useApp } from "../state/provider";
import { dayKey, dueIds, introducedToday } from "../domain/learning";
import { learningStreak } from "../domain/streak";
import { CultivationCard } from "../components/CultivationCard";
import { Icon, ProgressBar } from "../shared/ui";

export function Today() {
  const { data, start, busy } = useApp();
  const router = useRouter();
  const at = Date.now();
  const book = activeBook(data.settings);
  const catalog = book.catalog;
  const all = [...catalog.words, ...data.customWords];
  const due = dueIds(data, at).filter((id) => all.some((word) => word.id === id));
  const introduced = introducedToday(data, at);
  const remaining = Math.max(0, data.settings.dailyNew - introduced);
  const active = data.session && data.session.phase !== "complete";
  const lesson =
    catalog.lessons.find((item) =>
      catalog.words.some((word) => word.lesson === item.id && !data.progress[word.id]?.tested),
    ) ?? catalog.lessons[0];
  const nextWords = catalog.words
    .filter((word) => word.lesson === lesson.id && !data.progress[word.id]?.tested)
    .slice(0, 5);
  const dailyGoal = Math.min(100, (introduced / data.settings.dailyNew) * 100);
  const streak = learningStreak(data.events, at);
  const studiedToday = data.events.some((event) => event.at <= at && dayKey(event.at) === dayKey(at));
  const doPrimary = async () => {
    if (active) return router.push("/study");
    const words = due.length ? due.slice(0, 20).map((id) => all.find((word) => word.id === id)!) : nextWords;
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
      <section className="study-hero today-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="hero-label">
            <span /> {active ? "TIẾP NỐI NHỊP HỌC" : "VIỆC HỌC HÔM NAY"}
          </span>
          <h2 id="hero-title">{active ? "Tiếp nối hành trình." : "Thêm một bước tiến."}</h2>
          <p className="today-workload">
            {remaining} từ mới
            {due.length > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="today-due">{due.length} từ cần ôn</span>
              </>
            )}
          </p>
          <button className="button hero-button" disabled={busy} onClick={() => void doPrimary()}>
            {active ? "Tiếp tục học" : "Bắt đầu học"}
            <Icon name="arrow" />
          </button>
          <p className="hero-footnote">
            {active
              ? `${data.session!.title} · Bạn đã làm ${data.session!.index} / ${data.session!.questions.length} câu.`
              : introduced >= data.settings.dailyNew
                ? "Đã đạt mục tiêu hôm nay. Bạn vẫn có thể học thêm."
                : "Một lượt ngắn · Lưu sau mỗi câu"}
          </p>
        </div>
        <div className="today-daily-goal">
          <div
            className="goal-circle"
            style={{ "--progress": `${dailyGoal}%` } as React.CSSProperties}
            role="progressbar"
            aria-label="Mục tiêu từ mới hôm nay"
            aria-valuenow={Math.min(introduced, data.settings.dailyNew)}
            aria-valuemax={data.settings.dailyNew}
            aria-valuemin={0}
            aria-valuetext={`${introduced} trên ${data.settings.dailyNew} từ mới`}
          >
            <div>
              <b>
                {introduced}
                <span>/{data.settings.dailyNew}</span>
              </b>
              <small>từ mới</small>
            </div>
          </div>
          <Link href="/settings">Điều chỉnh mục tiêu</Link>
        </div>
      </section>
      <div className="today-highlights">
        <CultivationCard />
        <section className="panel streak-card" aria-labelledby="streak-title">
          <Flame className="streak-icon" size={28} aria-hidden="true" />
          <p className="eyebrow">ĐỀU ĐẶN MỖI NGÀY</p>
          <h2 id="streak-title">
            <span className="today-streak-count">{streak}</span> ngày liên tiếp
          </h2>
          <p className="muted">
            {studiedToday
              ? "Bạn đã giữ nhịp học hôm nay."
              : streak
                ? "Học một lượt hôm nay để nối dài chuỗi."
                : "Bắt đầu hôm nay, từng chút thành thói quen."}
          </p>
        </section>
      </div>
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
    </div>
  );
}
