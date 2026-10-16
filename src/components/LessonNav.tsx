import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LESSON_BY_N, LESSONS, TOPICS } from "@/lib/data";
import { lessonProgress, pct } from "@/lib/progress";
import { cx, scrollBehavior } from "@/lib/util";
import { goLesson, type LessonWhere } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { Icon } from "./Icon";

/** Thanh chuyển bài: bài trước / các bài cùng phần / bài sau */
export function LessonNav({ unit, lesson, where }: { unit: string; lesson: string; where: LessonWhere }) {
  const { catalog, status } = useProfile();
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const cur = lesson === "all" ? null : +lesson;

  // Giữ bước đang chọn trong tầm nhìn (thanh cuộn ngang trên màn hình hẹp)
  useEffect(() => {
    ref.current?.querySelector(".step.active")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [lesson, unit]);

  if (unit === "all" || unit === "custom") return null;
  const sib = LESSONS.filter((l) => l.unit === unit);
  const prev = cur ? LESSON_BY_N[cur - 1] : undefined;
  const next = cur ? LESSON_BY_N[cur + 1] : undefined;
  const unitIdx = TOPICS.findIndex((x) => x.id === unit);

  const go = (n: string) => {
    goLesson(where, n);
    if (where === "net") navigate("/network", { replace: true });
    const nav = ref.current;
    if (nav && nav.getBoundingClientRect().top < 60)
      window.scrollTo({ top: window.scrollY + nav.getBoundingClientRect().top - 76, behavior: scrollBehavior() });
  };

  return (
    <nav className="lesson-nav" aria-label="Chuyển bài" ref={ref}>
      <button
        className="btn sm ghost nav-edge"
        disabled={!prev}
        title={prev ? `Bài ${prev.n}: ${prev.title}` : ""}
        onClick={() => prev && go(String(prev.n))}
      >
        <Icon name="left" size="sm" />
        <span>Bài trước</span>
      </button>
      <div className="lesson-steps">
        <button className={cx("step step-all", !cur && "active")} onClick={() => go("all")}>
          <span className="step-n">Phần {unitIdx + 1}</span>
          <span className="step-t">Cả phần</span>
        </button>
        {sib.map((l) => {
          const p = lessonProgress(catalog, status, l.n);
          const on = l.n === cur;
          return (
            <button
              key={l.n}
              className={cx("step", on && "active", p.total > 0 && p.mastered === p.total && "done")}
              aria-current={on ? "page" : undefined}
              onClick={() => go(String(l.n))}
            >
              <span className="step-n">Bài {l.n}</span>
              <span className="step-t">{l.title}</span>
              <span className="step-bar">
                <span style={{ width: `${pct(p.mastered, p.total)}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <button
        className="btn sm ghost nav-edge"
        disabled={!next}
        title={next ? `Bài ${next.n}: ${next.title}` : ""}
        onClick={() => next && go(String(next.n))}
      >
        <span>Bài sau</span>
        <Icon name="right" size="sm" />
      </button>
    </nav>
  );
}

/** Hai ô chọn Chủ đề / Bài */
export function ScopeSelects({
  unit,
  lesson,
  onUnit,
  onLesson,
}: {
  unit: string;
  lesson: string;
  onUnit: (v: string) => void;
  onLesson: (v: string) => void;
}) {
  const topics = useProfile((s) => s.catalog.topics);
  const lessons = unit === "all" ? LESSONS : unit === "custom" ? [] : LESSONS.filter((l) => l.unit === unit);
  return (
    <>
      <label className="row" style={{ gap: 6 }}>
        <span className="eyebrow">Chủ đề</span>
        <select className="select" value={unit} onChange={(e) => onUnit(e.target.value)}>
          <option value="all">Tất cả chủ đề</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {unit !== "custom" && (
        <label className="row" style={{ gap: 6 }}>
          <span className="eyebrow">Bài</span>
          <select className="select" value={lesson} onChange={(e) => onLesson(e.target.value)}>
            <option value="all">Tất cả bài</option>
            {lessons.map((l) => (
              <option key={l.n} value={l.n}>
                {l.n}. {l.title}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
