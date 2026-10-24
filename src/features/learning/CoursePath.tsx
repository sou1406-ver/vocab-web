import "./learning.css";
import { Link } from "react-router-dom";
import { Progress } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { LESSONS, TOPICS } from "@/lib/data";
import { isLessonUnlocked, legacyLessonThrough, monthPeriodKey, weekPeriodKey } from "@/lib/progress";
import { dueReviewIds } from "@/lib/srs";
import type { CheckpointRecord } from "@/lib/types";
import { cx } from "@/lib/util";
import { useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";

function periodStart() {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday.getTime();
}

function TestCard({
  kind,
  title,
  detail,
  ids,
  record,
}: {
  kind: "weekly" | "monthly";
  title: string;
  detail: string;
  ids: string[];
  record?: CheckpointRecord;
}) {
  const act = useActions();
  const key = kind === "weekly" ? weekPeriodKey() : monthPeriodKey();
  const available = ids.length >= 5;
  return (
    <article className="card pathway-test">
      <div className="pathway-test-icon">
        <Icon name={kind === "weekly" ? "repeat" : "award"} size="sm" />
      </div>
      <div className="pathway-test-copy">
        <span className="eyebrow">{kind === "weekly" ? "Mỗi tuần" : "Mỗi tháng"}</span>
        <h3>{title}</h3>
        <p className="muted">{detail}</p>
        {record && (
          <small className="pathway-result">
            Kỷ lục tốt nhất: {Math.round(record.best * 100)}% · {record.attempts} lượt
          </small>
        )}
      </div>
      <button
        className={cx("btn", available ? "primary" : "soft")}
        disabled={!available}
        onClick={() => act.startCheckpoint({ key, title, kind, ids })}
      >
        {available ? "Làm mini test" : `Cần học thêm ${5 - ids.length} từ`}
      </button>
    </article>
  );
}

export function CoursePathPage() {
  const act = useActions();
  const { catalog, status, statusAt, checkpoints, courseThrough, srs, reviewedToday } = useProfile();
  const legacyThrough = courseThrough ?? legacyLessonThrough(catalog, status);
  const lessonGroups = LESSONS.reduce<Record<string, typeof LESSONS>>((groups, lesson) => {
    (groups[lesson.unit] ??= []).push(lesson);
    return groups;
  }, {});
  const dueIds = dueReviewIds(
    Object.keys(catalog.byId),
    status,
    srs ?? {},
    statusAt,
    Date.now(),
    undefined,
    reviewedToday,
  );
  const weekStart = periodStart();
  const weeklyIds = [
    ...new Set([
      ...catalog.all
        .filter((word) => status[word.id] && (statusAt?.[word.id] ?? 0) >= weekStart)
        .map((word) => word.id),
      ...dueIds,
    ]),
  ];
  const monthlyIds = catalog.all.filter((word) => Boolean(status[word.id])).map((word) => word.id);
  const learned = monthlyIds.length;

  return (
    <div className="course-path stack">
      <header className="page-head">
        <p className="kicker">LỘ TRÌNH HỌC</p>
        <h1>Học theo từng chặng</h1>
        <p className="lede">
          Học một bài, làm bài kiểm tra cuối chặng để mở bài mới. Mini test giúp ôn lại kiến thức theo tuần và tháng.
        </p>
      </header>

      <section className="card pathway-overview">
        <div>
          <span className="eyebrow">600 Essential Words for the TOEIC</span>
          <h2>{legacyThrough ? `Đã đi đến bài ${legacyThrough}` : "Bắt đầu từ bài 1"}</h2>
          <p className="muted">Bài có khóa mở sau khi đạt 80% trở lên ở bài kiểm tra cuối chặng.</p>
        </div>
        <div className="pathway-count">
          <b>{LESSONS.length}</b>
          <span>bài học</span>
        </div>
      </section>

      <section className="stack pathway-section" aria-labelledby="pathway-lessons-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">THEO GIÁO TRÌNH</p>
            <h2 id="pathway-lessons-heading">Các chặng học</h2>
          </div>
          <span className="muted">
            {Object.values(checkpoints ?? {}).filter((item) => item.passed).length} bài kiểm tra đã qua
          </span>
        </div>
        {Object.entries(lessonGroups).map(([unit, lessons]) => (
          <section className="pathway-unit" key={unit}>
            <h3>{TOPICS.find((topic) => topic.id === unit)?.name ?? unit}</h3>
            <div className="pathway-lessons">
              {lessons.map((lesson) => {
                const unlocked = isLessonUnlocked(lesson.n, legacyThrough, checkpoints ?? {});
                const words = catalog.all.filter((word) => word.lesson === lesson.n);
                const started = words.some((word) => status[word.id]);
                const mastered = words.filter((word) => status[word.id] === "mastered").length;
                const check = checkpoints?.[`lesson:${lesson.n}`];
                const canTest = unlocked && (started || Boolean(check?.passed));
                return (
                  <article
                    className={cx("pathway-lesson", !unlocked && "locked", check?.passed && "passed")}
                    key={lesson.n}
                  >
                    <div className="pathway-lesson-top">
                      <span className="pathway-number">{String(lesson.n).padStart(2, "0")}</span>
                      <span className="pathway-state">
                        {check?.passed ? "Đã qua" : unlocked ? (started ? "Đang học" : "Sẵn sàng") : "Đang khóa"}
                      </span>
                    </div>
                    <h4>
                      Bài {lesson.n} · {lesson.title}
                    </h4>
                    <p className="muted">{lesson.vi}</p>
                    <Progress value={words.length ? (mastered / words.length) * 100 : 0} />
                    {check && (
                      <small className="pathway-result">{Math.round(check.best * 100)}% tốt nhất · cần 80%</small>
                    )}
                    <div className="pathway-lesson-actions">
                      <button className="btn sm" disabled={!unlocked} onClick={() => act.openLesson(lesson.n)}>
                        <Icon name="book" size="sm" /> {started ? "Học tiếp" : "Bắt đầu"}
                      </button>
                      <button
                        className="btn sm soft"
                        disabled={!canTest}
                        title={
                          !unlocked
                            ? "Hãy hoàn thành bài kiểm tra của chặng trước"
                            : !canTest
                              ? "Bắt đầu học bài này trước"
                              : "Bài kiểm tra cuối chặng"
                        }
                        onClick={() =>
                          act.startCheckpoint({
                            key: `lesson:${lesson.n}`,
                            title: `Kiểm tra bài ${lesson.n}`,
                            kind: "lesson",
                            lesson: lesson.n,
                          })
                        }
                      >
                        Kiểm tra
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>

      <section className="pathway-section stack" aria-labelledby="pathway-tests-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">ÔN TẬP TỔNG HỢP</p>
            <h2 id="pathway-tests-heading">Mini test định kỳ</h2>
          </div>
          <span className="muted">Đã học {learned} từ</span>
        </div>
        <div className="pathway-tests">
          <TestCard
            kind="weekly"
            title="Nhìn lại tuần này"
            detail="Từ mới trong tuần và những từ đến hạn cần ôn."
            ids={weeklyIds}
            record={checkpoints?.[weekPeriodKey()]}
          />
          <TestCard
            kind="monthly"
            title="Kiểm tra hàng tháng"
            detail="Bài trộn từ toàn bộ những từ bạn đã bắt đầu học."
            ids={monthlyIds}
            record={checkpoints?.[monthPeriodKey()]}
          />
        </div>
      </section>
      <Link className="text-link" to="/">
        ← Về trang tổng quan
      </Link>
    </div>
  );
}
