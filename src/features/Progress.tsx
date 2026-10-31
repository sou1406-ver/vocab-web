"use client";
import Link from "next/link";
import { useApp } from "../state/provider";
import { activeBook } from "../data/catalog";
import { dayKey, statusOf } from "../domain/learning";
import { Icon, ProgressBar } from "../shared/ui";
import { useWord } from "../app/context";
import { exerciseProgress } from "../domain/exercise-progress";
import { CultivationCard } from "../components/CultivationCard";

export default function Progress() {
  const { data } = useApp();
  const inspect = useWord();
  const catalog = activeBook(data.settings).catalog;
  const all = [...catalog.words, ...data.customWords];
  const exerciseGroups = exerciseProgress(data.events, new Set(all.map((word) => word.id)));
  const learned = catalog.words.filter((w) => data.progress[w.id]?.tested).length;
  const stable = catalog.words.filter((w) => (data.progress[w.id]?.box ?? 0) >= 5).length;
  const correct = data.events.filter((e) => e.correct).length;
  const days = Array.from({ length: 7 }, (_, i) => {
    const at = Date.now() - (6 - i) * 86400000;
    const key = dayKey(at, data.settings.timezone);
    return {
      key,
      label: new Intl.DateTimeFormat("vi", { weekday: "short", timeZone: data.settings.timezone }).format(at),
      count: data.events.filter((e) => e.day === key).length,
    };
  });
  const max = Math.max(10, ...days.map((d) => d.count));
  const weak = all
    .filter((w) => (data.progress[w.id]?.incorrect ?? 0) > 0)
    .sort((a, b) => data.progress[b.id].incorrect - data.progress[a.id].incorrect)
    .slice(0, 5);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">NHÌN LẠI ĐỂ ĐI XA HƠN</p>
          <h1 tabIndex={-1}>
            Mỗi chút đều có giá trị<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">Một hành trình dài được tạo nên từ những lượt học nhỏ.</p>
        </div>
      </div>
      <CultivationCard />
      {!data.events.length ? (
        <section className="panel empty-state" aria-labelledby="progress-empty-title">
          <Icon name="leaf" size={32} />
          <h2 id="progress-empty-title">Chưa có lượt học nào</h2>
          <p className="muted">Làm một lượt ngắn để thấy kết quả và nhịp học của bạn ở đây.</p>
          <Link href="/" className="button primary">
            Bắt đầu học
          </Link>
        </section>
      ) : (
        <>
          <section className="stats-grid progress-stats">
            <div className="stat-card">
              <span className="stat-icon green">
                <Icon name="quiz" />
              </span>
              <div>
                <span className="stat-label">Đã học và kiểm tra</span>
                <div className="stat-number">
                  {learned}
                  <small>/{catalog.words.length} từ</small>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card--brand">
              <span className="stat-icon">
                <Icon name="memorized" />
              </span>
              <div>
                <span className="stat-label">Nhớ ổn định</span>
                <div className="stat-number">
                  {stable}
                  <small>từ</small>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card--neutral">
              <span className="stat-icon">
                <Icon name="target" />
              </span>
              <div>
                <span className="stat-label">Tự trả lời đúng</span>
                <div className="stat-number">
                  {data.events.length ? Math.round((correct / data.events.length) * 100) : "—"}
                  <small>{data.events.length ? "%" : "chưa có lượt"}</small>
                </div>
              </div>
            </div>
          </section>
          <section className="exercise-results" aria-labelledby="exercise-results-title">
            <div className="section-heading">
              <h2 id="exercise-results-title">Theo nhóm bài tập</h2>
              <span className="muted">Độ chính xác · {activeBook(data.settings).shortTitle}</span>
            </div>
            <div className="exercise-results-grid">
              {exerciseGroups.map((group) => (
                <article
                  className={`exercise-result-card exercise-result-card--${group.id}`}
                  key={group.id}
                  aria-labelledby={`exercise-${group.id}`}
                >
                  <div className="exercise-result-heading">
                    <div>
                      <h3 id={`exercise-${group.id}`}>{group.title}</h3>
                      <p className="muted">{group.description}</p>
                    </div>
                    <strong className="exercise-result-value">
                      {group.accuracy === null ? "—" : `${group.accuracy}%`}
                    </strong>
                  </div>
                  <ProgressBar
                    value={group.accuracy ?? 0}
                    label={`${group.title}: ${group.accuracy === null ? "chưa có kết quả" : `${group.accuracy}% đúng`}`}
                  />
                  <p className="muted">
                    {group.total
                      ? `${group.correct}/${group.total} câu tự trả lời đúng`
                      : "Chưa làm bài nào — thử một lượt để xem kết quả."}
                  </p>
                </article>
              ))}
            </div>
            <p className="quiet-note">
              Tính theo câu đã trả lời có ghi dạng bài, gồm cả luyện thêm. Đây là kết quả làm bài, chưa phải mức thành
              thạo.
            </p>
          </section>
          <div className="progress-columns">
            <section className="panel activity-panel">
              <div className="section-heading">
                <h2>Nhịp học 7 ngày</h2>
                <span className="muted">Số câu đã làm</span>
              </div>
              <div
                className="activity-chart"
                role="img"
                aria-label={days.map((d) => d.key + ": " + d.count + " câu").join("; ")}
              >
                {days.map((d) => (
                  <div className="activity-column" key={d.key}>
                    <span>{d.count}</span>
                    <div className="activity-track">
                      <i style={{ height: Math.max(2, (d.count / max) * 100) + "%" }} />
                    </div>
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
              {!data.events.length && (
                <p className="quiet-note">Bắt đầu lượt đầu tiên, nhịp học của bạn sẽ hiện ở đây.</p>
              )}
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Vốn từ TOEIC</h2>
                <Icon name="leaf" />
              </div>
              <div className="vocab-total">
                {learned}
                <span>/{catalog.words.length}</span>
              </div>
              <ProgressBar
                value={(learned / catalog.words.length) * 100}
                label={"Tổng tiến độ " + catalog.words.length + " từ"}
              />
              <p className="muted">
                {stable} từ nhớ ổn định · {learned - stable} từ đang củng cố
              </p>
              <Link className="text-link" href="/lessons">
                Mở bài học <Icon name="arrow" size={16} />
              </Link>
            </section>
          </div>
          <section className="panel">
            <div className="section-heading">
              <h2>Những từ cần thêm thời gian</h2>
              <Link className="text-link" href="/library?filter=weak">
                Xem tất cả <Icon name="arrow" size={16} />
              </Link>
            </div>
            {weak.length ? (
              <div className="compact-word-list">
                {weak.map((word) => (
                  <button key={word.id} onClick={() => inspect(word)}>
                    <span>
                      <b lang="en">{word.text}</b>
                      <small>{word.meaning}</small>
                    </span>
                    <span className="status-badge">
                      {statusOf(data.progress[word.id])} · Sai {data.progress[word.id].incorrect} lần
                    </span>
                    <Icon name="chevron" size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">Chưa có từ cần luyện lại.</p>
            )}
          </section>
          {data.history.length > 0 && (
            <section className="panel history-panel">
              <div className="section-heading">
                <h2>Các lượt gần đây</h2>
                <Icon name="clock" />
              </div>
              {data.history
                .slice(-5)
                .reverse()
                .map((h) => (
                  <div className="history-row" key={h.id}>
                    <span>
                      <b>{h.title}</b>
                      <small>
                        {new Intl.DateTimeFormat("vi", {
                          day: "numeric",
                          month: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: data.settings.timezone,
                        }).format(h.at)}{" "}
                        · {h.finished ? "Hoàn thành" : "Kết thúc sớm"}
                      </small>
                    </span>
                    <span>
                      {h.correct}/{h.total} đúng
                    </span>
                  </div>
                ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
