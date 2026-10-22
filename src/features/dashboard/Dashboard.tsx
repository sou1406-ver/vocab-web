import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { FreqMeter } from "@/components/FreqMeter";
import { Avatar } from "@/components/ProfileMenu";
import CountUp from "@/components/reactbits/CountUp";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { LESSONS, targetInfo, termInfo, TOPICS, unitOf, WORDS } from "@/lib/data";
import { lessonBookDone, lessonProgress, pct, resumeLesson } from "@/lib/progress";
import { DAILY_REVIEW_LIMIT, DEFAULT_NEW_WORD_LIMIT, displayedStatus, dueReviewIds } from "@/lib/srs";
import type { DayLog } from "@/lib/types";
import { cx, dayKey } from "@/lib/util";
import { useActions } from "@/state/actions";
import { streakOf, useProfile } from "@/state/profile";
import { useUI } from "@/state/ui";

const EMPTY_DAY: DayLog = { a: 0, c: 0, f: 0, m: 0 };

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

/** Thẻ có vệt sáng theo con trỏ (React Bits · SpotlightCard), dùng màu của giao diện */
function DCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <SpotlightCard
      className={cx("card", className)}
      spotlightColor="var(--indigo)"
      intensity={0.12}
      borderGlow={0.5}
      spotlightSize={280}
      flare={false}
      style={
        {
          "--spotlight-card-surface": "var(--surface)",
          "--spotlight-card-border": "transparent",
          "--spotlight-card-shadow": "var(--shadow-sm)",
        } as CSSProperties
      }
    >
      {children}
    </SpotlightCard>
  );
}

function Ring({ value, label, sub }: { value: number; label: ReactNode; sub: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${sub}`}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} className="ring-bg" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className={cx("ring-fg", value >= 100 && "done")}
          style={{ strokeDasharray: c, strokeDashoffset: c * (1 - Math.min(value, 100) / 100) }}
        />
      </svg>
      <div className="ring-text">
        <b>{label}</b>
        <span>{sub}</span>
      </div>
    </div>
  );
}

function Heatmap({ log }: { log: Record<string, DayLog> }) {
  // 12 tuần gần nhất, mỗi cột là một tuần (Thứ 2 → Chủ nhật)
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (12 * 7 - 1));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const cells: ReactNode[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const e = log[dayKey(d)];
    const n = e ? e.a + e.f : 0;
    const lv = n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
    cells.push(
      <i
        key={dayKey(d)}
        className={`hm l${lv}`}
        title={`${d.getDate()}/${d.getMonth() + 1}: ${n ? `${e!.a} câu, ${e!.f} thẻ` : "chưa học"}`}
      />,
    );
  }
  const active = Object.values(log).filter((e) => e.a + e.f > 0).length;
  return (
    <>
      <div className="heatmap" style={{ "--weeks": Math.ceil(cells.length / 7) } as CSSProperties}>
        {cells}
      </div>
      <div className="hm-legend">
        <span>{active} ngày đã học</span>
        <span className="hm-scale">
          Ít <i className="hm l1" />
          <i className="hm l2" />
          <i className="hm l3" />
          <i className="hm l4" /> Nhiều
        </span>
      </div>
    </>
  );
}

const SEC_NAME: Record<string, string> = {
  wic: "Words in Context",
  p5: "Part 5",
  p6: "Part 6",
  r5: "Word Review 1–10",
  r6: "Word Review 11–19",
};
const recentLabel = (k: string) => {
  const [where, sec] = k.split(":");
  return where[0] === "L"
    ? `Bài ${where.slice(1)} · ${SEC_NAME[sec] ?? sec}`
    : `Ôn tập phần ${where.slice(1)} · ${SEC_NAME[sec] ?? sec}`;
};

const Stat = ({ num, label, sub }: { num: ReactNode; label: string; sub?: string }) => (
  <div className="d-stat">
    <b>{num}</b>
    <span>{label}</span>
    {sub && <small>{sub}</small>}
  </div>
);

export function Dashboard() {
  const act = useActions();
  const setModal = useUI((s) => s.setModal);
  const { catalog, status, stats, book, log, srs, statusAt, reviewedToday, newWordsToday } = useProfile();
  const p = useProfile((s) => s.profile());

  const today = log[dayKey()] ?? EMPTY_DAY;
  const done = today.a + today.f;
  const goal = p.goal || 20;
  const streak = streakOf(log);
  const mastered = WORDS.filter((w) => displayedStatus(w.id, status, srs ?? {}) === "mastered").length;
  const learning = WORDS.filter((w) => {
    const state = displayedStatus(w.id, status, srs ?? {});
    return state === "learning" || state === "confirming";
  }).length;
  const dueToday = dueReviewIds(
    Object.keys(catalog.byId),
    status,
    srs ?? {},
    statusAt,
    Date.now(),
    undefined,
    reviewedToday,
  );
  const reviewedCount = reviewedToday?.day === dayKey() ? reviewedToday.ids.length : 0;
  const reviewLimitReached = reviewedCount >= DAILY_REVIEW_LIMIT;
  const introducedToday =
    newWordsToday?.day === dayKey() ? newWordsToday.ids.filter((id) => !id.startsWith("everyday:")).length : 0;
  const newWordLimit = p.newWordLimit ?? DEFAULT_NEW_WORD_LIMIT;
  const newWordsRemaining = Math.max(0, newWordLimit - introducedToday);
  const unseenWords = catalog.all.filter((word) => displayedStatus(word.id, status, srs ?? {}) === "new").length;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return log[dayKey(d)] ?? EMPTY_DAY;
  });
  const a7 = week.reduce((s, e) => s + e.a, 0);
  const c7 = week.reduce((s, e) => s + e.c, 0);
  const acc = a7 ? Math.round((c7 / a7) * 100) : null;
  const [tScore, tWords, tLevel] = targetInfo(p.target);
  const bookDone = LESSONS.filter((l) => lessonBookDone(book, l.n)).length;
  const next = resumeLesson(catalog, status);
  const np = lessonProgress(catalog, status, next.n);
  const weak = Object.entries(stats)
    .filter(([id, s]) => catalog.byId[id] && s.w > 0 && displayedStatus(id, status, srs ?? {}) !== "mastered")
    .sort((a, b) => b[1].w - a[1].w || a[1].c - b[1].c)
    .slice(0, 8);
  const recent = Object.entries(book)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 5);

  return (
    <div className="dash">
      <section className="d-hero">
        <div className="d-hello">
          <Avatar p={p} size="lg" />
          <div>
            <p className="kicker">{greeting()}</p>
            <h1>{p.name}</h1>
            <p className="muted">
              Mục tiêu TOEIC <b>{tScore}+</b> · {tLevel} · {goal} câu/thẻ mỗi ngày{" "}
              <button className="text-link" onClick={() => setModal({ kind: "profile", isNew: false })}>
                Sửa
              </button>
            </p>
          </div>
        </div>
        <div className={cx("d-streak", streak > 0 && "on")} title="Số ngày học liên tiếp">
          <Icon name="flame" />
          <b>
            <CountUp to={streak} duration={0.8} />
          </b>
          <span>ngày liên tiếp</span>
        </div>
      </section>

      {!p.setup && (
        <section className="card d-setup">
          <div>
            <h3>Cá nhân hoá lộ trình của bạn</h3>
            <p className="muted">
              Đặt tên hồ sơ, chọn mục tiêu TOEIC và số câu/thẻ bạn muốn học mỗi ngày. Lộ trình sẽ gợi ý bài phù hợp và
              giúp bạn theo dõi tiến độ.
            </p>
          </div>
          <button className="btn primary" onClick={() => setModal({ kind: "profile", isNew: false })}>
            <Icon name="target" size="sm" /> Thiết lập mục tiêu
          </button>
        </section>
      )}

      <DCard className="d-review">
        <div className="d-review-copy">
          <div className="d-review-count" aria-label={`${dueToday.length} từ đến hạn ôn hôm nay`}>
            <Icon name="repeat" /> <b>{dueToday.length}</b>
          </div>
          <div>
            <div className="eyebrow">Ôn tập ngắt quãng</div>
            <h3>Ôn hôm nay</h3>
            <p className="muted">
              {dueToday.length
                ? `Có ${dueToday.length} từ đến hạn. Mỗi ngày tối đa 20 từ; từ đã nhớ cần 3 lượt đúng cách quãng để thành Đã thuộc.`
                : reviewLimitReached
                  ? `Đã ôn đủ ${DAILY_REVIEW_LIMIT} từ hôm nay. Các từ còn lại sẽ vào hàng đợi ngày mai.`
                  : "Chưa có từ nào đến hạn. Từ đã đánh dấu nhớ sẽ được kiểm tra lại theo lịch."}
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn" onClick={act.quizMastered} disabled={!mastered}>
            <Icon name="check" size="sm" /> Test {mastered} từ đã thuộc
          </button>
          <button className="btn primary" onClick={act.reviewDue} disabled={!dueToday.length}>
            <Icon name="repeat" size="sm" /> {dueToday.length ? "Bắt đầu ôn" : "Đã xong"}
          </button>
        </div>
      </DCard>

      <DCard className="d-new-words">
        <div className="d-card-head">
          <div>
            <div className="eyebrow">Nhịp học vừa sức</div>
            <h3>Từ mới hôm nay</h3>
          </div>
          <span className="badge b-indigo">
            {introducedToday}/{newWordLimit}
          </span>
        </div>
        <Progress value={pct(introducedToday, newWordLimit)} />
        <p className="muted">
          {unseenWords === 0
            ? "Bạn đã bắt đầu học hết kho từ mới."
            : newWordsRemaining
              ? "Còn " +
                Math.min(newWordsRemaining, unseenWords) +
                " từ mới có thể bắt đầu hôm nay. Từ cũ vẫn ôn bình thường."
              : "Đã đạt giới hạn hôm nay. Ngày mai bạn có thể bắt đầu tối đa " + newWordLimit + " từ mới nữa."}
        </p>
        <button className="btn primary" onClick={act.learnNewWords} disabled={!newWordsRemaining || !unseenWords}>
          <Icon name="book" size="sm" /> Học từ mới
        </button>
      </DCard>

      <DCard className="d-course-path">
        <div className="d-card-head">
          <div>
            <div className="eyebrow">Lộ trình có kiểm tra</div>
            <h3>Học theo từng chặng</h3>
          </div>
          <Icon name="award" />
        </div>
        <p className="muted">
          Qua bài kiểm tra cuối bài để mở chặng kế tiếp. Mỗi tuần và tháng có mini test ôn lại từ đã học.
        </p>
        <Link className="btn" to="/course">
          Xem lộ trình <Icon name="right" size="sm" />
        </Link>
      </DCard>

      <div className="d-grid">
        <DCard className="d-today">
          <div className="d-card-head">
            <h3>Hôm nay</h3>
            <span className="muted">
              {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}
            </span>
          </div>
          <div className="d-today-body">
            <Ring
              value={pct(done, goal)}
              label={`${done}/${goal}`}
              sub={done >= goal ? "✓ Đạt mục tiêu" : "câu & thẻ"}
            />
            <ul className="d-today-list">
              <li>
                <b>{today.a}</b> câu bài tập{today.a ? ` · đúng ${Math.round((today.c / today.a) * 100)}%` : ""}
              </li>
              <li>
                <b>{today.f}</b> thẻ flashcard
              </li>
              <li>
                <b>{today.m}</b> từ mới thuộc
              </li>
            </ul>
          </div>
          <div className="d-next">
            <div className="eyebrow">{np.started ? "Học tiếp" : "Bắt đầu"}</div>
            <div className="d-next-title">
              Bài {next.n} · {next.title} <span className="muted">{next.vi}</span>
            </div>
            <div className="row">
              <button className="btn primary" onClick={() => act.openLesson(next.n)}>
                Bắt đầu học <Icon name="right" size="sm" />
              </button>
              <button className="btn" onClick={() => act.openLessonFlash(next.n)}>
                Flashcard
              </button>
              <button className="btn" onClick={() => act.openLessonBook(next.n)}>
                Bài tập sách
              </button>
            </div>
          </div>
        </DCard>

        <DCard className="d-path">
          <div className="d-card-head">
            <h3>Lộ trình {tScore}+</h3>
            <span className="muted">
              {mastered}/{tWords} từ
            </span>
          </div>
          <Progress value={pct(mastered, tWords)} className="big" />
          <p className="muted d-path-note">
            {mastered >= tWords ? (
              "Bạn đã đủ vốn từ cho mục tiêu này — thử nâng mục tiêu nhé!"
            ) : (
              <>
                Còn <b>{tWords - mastered}</b> từ. Nếu học {goal} câu/thẻ mỗi ngày, bạn sẽ cần khoảng{" "}
                <b>{Math.max(1, Math.ceil(((tWords - mastered) * 3) / goal))}</b> ngày (ước tính 3 lượt ôn cho mỗi từ).
              </>
            )}
          </p>
          <div className="d-stats">
            <Stat num={<CountUp to={mastered} duration={1} />} label="đã thuộc" sub={`/ ${WORDS.length} từ`} />
            <Stat num={<CountUp to={learning} duration={1} />} label="đang học / xác nhận" />
            <Stat
              num={acc == null ? "—" : <CountUp to={acc} suffix="%" duration={1} />}
              label="chính xác"
              sub="7 ngày qua"
            />
            <Stat num={<CountUp to={bookDone} duration={1} />} label="bài tập sách" sub={`/ ${LESSONS.length} bài`} />
          </div>
        </DCard>

        <DCard className="d-activity">
          <div className="d-card-head">
            <h3>Hoạt động 12 tuần</h3>
          </div>
          <Heatmap log={log} />
        </DCard>

        <DCard className="d-units">
          <div className="d-card-head">
            <h3>Tiến độ theo phần</h3>
            <Link className="text-link" to="/topics">
              Mục lục <Icon name="right" size="sm" />
            </Link>
          </div>
          <ul className="d-unit-list">
            {TOPICS.map((tp, i) => {
              const ws = WORDS.filter((w) => unitOf(w) === tp.id);
              const m = ws.filter((w) => displayedStatus(w.id, status, srs ?? {}) === "mastered").length;
              return (
                <li key={tp.id}>
                  <button className="d-unit" onClick={() => act.openUnit(tp.id, "network")}>
                    <span className="d-unit-n">{i + 1}</span>
                    <span className="d-unit-t">{tp.name}</span>
                    <Progress value={pct(m, ws.length)} />
                    <span className="d-unit-v">
                      {m}/{ws.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DCard>

        <DCard className="d-weak">
          <div className="d-card-head">
            <h3>Từ hay làm sai</h3>
            {weak.length > 0 && (
              <button className="text-link" onClick={act.reviewWeak}>
                Ôn bằng flashcard <Icon name="right" size="sm" />
              </button>
            )}
          </div>
          {weak.length ? (
            <ul className="d-weak-list">
              {weak.map(([id, s]) => {
                const w = catalog.byId[id];
                return (
                  <li key={id}>
                    <Link to={`/network/${id}`}>
                      <FreqMeter z={termInfo(w.word).z} />
                      <b>{w.word}</b>
                      <span className="muted">{w.vi}</span>
                    </Link>
                    <span className="badge b-rose">sai {s.w}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted d-empty">Chưa có từ nào cần ôn. Làm vài bài tập để xem những từ bạn hay nhầm ở đây.</p>
          )}
        </DCard>

        <DCard className="d-recent">
          <div className="d-card-head">
            <h3>Bài tập gần đây</h3>
          </div>
          {recent.length ? (
            <ul className="d-recent-list">
              {recent.map(([k, v]) => {
                const pc = Math.round((v.right / v.total) * 100);
                return (
                  <li key={k}>
                    <span>{recentLabel(k)}</span>
                    <span className={cx("badge", pc === 100 ? "b-emerald" : pc >= 60 ? "b-amber" : "b-rose")}>
                      {v.right}/{v.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted d-empty">Chưa làm bài tập trong sách nào.</p>
          )}
          <button className="btn sm" style={{ marginTop: 12 }} onClick={() => act.openLessonBook(next.n)}>
            <Icon name="book" size="sm" /> Làm bài tập của bài {next.n}
          </button>
        </DCard>
      </div>
    </div>
  );
}
