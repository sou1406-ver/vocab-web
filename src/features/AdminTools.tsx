"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SandboxProvider, useApp } from "../state/provider";
import { useCloud } from "../state/cloud-provider";
import { activeBook, bookById, books } from "../data/catalog";
import { exerciseEntry, loadClozeLesson } from "../data/cloze";
import { needsAuthoredPack, previewFormats, previewQuestions, type PreviewFormat } from "../data/preview-questions";
import { countLearnedWords, cultivationOf, cultivationRealms } from "../domain/cultivation";
import { emptySnapshot } from "../domain/learning";
import { simulateSnapshot, type SimulatedProgress } from "../domain/simulate";
import { avatarSeeds } from "../lib/avatar";
import { useEnglishVoices } from "../lib/use-english-voices";
import { CultivationAvatar } from "../components/CultivationAvatar";
import { syncLabels } from "../components/AccountPanel";
import { WordContext } from "../app/context";
import { WordDialog } from "../shared/ui";
import { Today } from "./Today";
import { StudySession } from "./Study";
import type { Question, Snapshot, Word } from "../domain/types";

const ContentPreview = dynamic(() => import("./ContentReviewTools"), {
  loading: () => <p role="status">Đang mở nội dung…</p>,
});

const areas = [
  {
    id: "content",
    label: "Kiểm soát nội dung",
    hint: "Xem trước, sửa, thêm và ẩn nội dung học",
    tabs: [["preview", "Xem trước bài tập"]],
  },
  {
    id: "features",
    label: "Kiểm tra tính năng",
    hint: "Hệ thống, khung avatar, giả lập tiến độ, chạy thử dạng bài",
    tabs: [
      ["system", "Hệ thống"],
      ["avatar", "Khung avatar"],
      ["progress", "Giả lập tiến độ"],
      ["exercise", "Thử dạng bài"],
    ],
  },
] as const;
type Area = (typeof areas)[number]["id"];
const panels: Record<string, () => ReactNode> = {
  preview: () => <ContentPreview />,
  system: () => <SystemPanel />,
  avatar: () => <AvatarPanel />,
  progress: () => <ProgressPanel />,
  exercise: () => <ExercisePanel />,
};

export default function AdminTools() {
  const [area, setArea] = useState<Area>("content");
  const [tabs, setTabs] = useState<Record<Area, string>>({ content: "preview", features: "system" });
  // #content / #features deep-link to an area, e.g. the old /review address redirects to #content.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (areas.some((item) => item.id === fromHash)) setArea(fromHash as Area);
  }, []);
  const chooseArea = (next: Area) => {
    setArea(next);
    window.history.replaceState(null, "", `#${next}`);
  };
  const current = areas.find((item) => item.id === area)!;
  return (
    <div className="page admin-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHỈ DÀNH CHO ADMIN</p>
          <h1 tabIndex={-1}>Admin</h1>
          <p className="page-subtitle">Kiểm soát nội dung học và kiểm tra các tính năng của web.</p>
        </div>
      </div>
      <TabList
        label="Khu vực admin"
        className="admin-areas"
        items={areas.map((item) => ({
          id: item.id,
          label: (
            <>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </>
          ),
        }))}
        value={area}
        onChange={(id) => chooseArea(id as Area)}
        idPrefix="admin-area"
      />
      <div id={`admin-area-panel-${area}`} role="tabpanel" aria-labelledby={`admin-area-tab-${area}`}>
        <TabList
          label={current.label}
          className="admin-tabs"
          items={current.tabs.map(([id, label]) => ({ id, label }))}
          value={tabs[area]}
          onChange={(id) => setTabs((previous) => ({ ...previous, [area]: id }))}
          idPrefix={`admin-${area}`}
        />
        <div
          id={`admin-${area}-panel-${tabs[area]}`}
          role="tabpanel"
          aria-labelledby={`admin-${area}-tab-${tabs[area]}`}
          className="admin-panel"
        >
          {panels[tabs[area]]?.()}
        </div>
      </div>
    </div>
  );
}

// Accessible tabs: arrow keys move between tabs, only the selected tab is in the Tab order.
function TabList({
  label,
  className,
  items,
  value,
  onChange,
  idPrefix,
}: {
  label: string;
  className: string;
  items: { id: string; label: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
  idPrefix: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = items[(index + step + items.length) % items.length].id;
    onChange(next);
    refs.current[next]?.focus();
  };
  return (
    <div className={className} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(node) => {
            refs.current[item.id] = node;
          }}
          id={`${idPrefix}-tab-${item.id}`}
          role="tab"
          aria-selected={value === item.id}
          aria-controls={`${idPrefix}-panel-${item.id}`}
          tabIndex={value === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => move(event, index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

const bytes = (value?: number) =>
  value === undefined
    ? "?"
    : value < 1024 * 1024
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / 1048576).toFixed(1)} MB`;

function SystemPanel() {
  const { data, profileKey, ready, error } = useApp();
  const cloud = useCloud();
  const voices = useEnglishVoices();
  const [storage, setStorage] = useState(() =>
    typeof navigator !== "undefined" && "storage" in navigator ? "Đang đo…" : "Trình duyệt không hỗ trợ",
  );
  useEffect(() => {
    let active = true;
    navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (active) setStorage(`${bytes(estimate.usage)} / ${bytes(estimate.quota)}`);
      })
      .catch(() => {
        if (active) setStorage("Không đo được");
      });
    return () => {
      active = false;
    };
  }, []);
  const learned = countLearnedWords(data.progress, () => true);
  const rows: [string, string][] = [
    ["Hồ sơ dữ liệu", profileKey],
    ["Trạng thái", ready ? "Đã mở" : error ? `Lỗi: ${error}` : "Đang mở"],
    ["IndexedDB", "vocab-learn-v2"],
    ["schemaVersion", String(data.schemaVersion)],
    ["revision", String(data.revision)],
    ["Từ đã ghi nhớ", String(learned)],
    ["Câu trả lời (events)", String(data.events.length)],
    ["Lượt đã xong (history)", String(data.history.length)],
    ["Lượt hiện tại", data.session ? `${data.session.title} · ${data.session.phase}` : "Không có"],
    ["Từ đã lưu / từ riêng", `${data.savedWords?.length ?? 0} / ${data.customWords.length}`],
    ["Dung lượng trình duyệt", storage],
  ];
  const account: [string, string][] = [
    ["Đăng nhập", cloud.user ? "Có" : "Không (khách)"],
    ["Username", cloud.account ? `@${cloud.account.username}` : "—"],
    ["Đồng bộ", cloud.user ? syncLabels[cloud.status] : "Chỉ lưu trên máy"],
    ["Lỗi đồng bộ", cloud.error || "Không có"],
    ["Giọng đọc tiếng Anh", `${voices.length}`],
    ["Môi trường", process.env.NODE_ENV ?? "?"],
  ];
  return (
    <div className="admin-stack">
      <div className="admin-columns">
        <section className="panel" aria-labelledby="admin-local-title">
          <h2 id="admin-local-title">Dữ liệu trên máy</h2>
          <Facts rows={rows} />
        </section>
        <section className="panel" aria-labelledby="admin-account-title">
          <h2 id="admin-account-title">Tài khoản & thiết bị</h2>
          <Facts rows={account} />
        </section>
      </div>
      <section className="panel" aria-labelledby="admin-books-title">
        <h2 id="admin-books-title">Giáo trình</h2>
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Bảng giáo trình">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Tên</th>
                <th scope="col">Phiên bản catalog</th>
                <th scope="col">Từ</th>
                <th scope="col">Bài</th>
                <th scope="col">Chủ đề</th>
                <th scope="col">Gói bài tập</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td>
                    <code>{book.id}</code>
                  </td>
                  <td>{book.shortTitle}</td>
                  <td>
                    <code>{book.catalog.version}</code>
                  </td>
                  <td>{book.catalog.words.length}</td>
                  <td>{book.catalog.lessons.length}</td>
                  <td>{book.catalog.topics.length}</td>
                  <td>{book.exercises.lessons.filter((lesson) => lesson.count).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="admin-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AvatarPanel() {
  const { data } = useApp();
  const seed = data.settings.avatarSeed ?? (data.settings.name.trim() || "Vocab guest");
  const [words, setWords] = useState(0);
  const realm = cultivationOf(words);
  const max = cultivationRealms[cultivationRealms.length - 1].words;
  const set = (value: number) => setWords(Math.max(0, Math.min(max, Math.floor(value) || 0)));
  return (
    <div className="admin-stack">
      <section className="panel admin-avatar-live" aria-labelledby="admin-realm-title">
        <CultivationAvatar words={words} seed={seed} />
        <div className="admin-avatar-controls">
          <p className="eyebrow">
            CẢNH GIỚI {realm.index + 1}/{cultivationRealms.length}
          </p>
          <h2 id="admin-realm-title">{realm.name}</h2>
          <p className="muted">
            {realm.next === null ? "Cảnh giới cao nhất." : `Còn ${realm.next - words} từ để lên cảnh giới tiếp theo.`}
          </p>
          <label className="admin-field">
            Số từ đã ghi nhớ
            <input type="range" min={0} max={max} value={words} onChange={(event) => set(Number(event.target.value))} />
          </label>
          <label className="admin-field admin-field--inline">
            Nhập số từ
            <input
              type="number"
              min={0}
              max={max}
              value={words}
              onChange={(event) => set(Number(event.target.value))}
            />
          </label>
        </div>
      </section>
      <section aria-labelledby="admin-realms-title">
        <h2 id="admin-realms-title" className="admin-section-title">
          Khung theo {cultivationRealms.length} cảnh giới
        </h2>
        <ul className="admin-realm-grid">
          {cultivationRealms.map((item, index) => (
            <li key={item.name}>
              <button type="button" aria-pressed={realm.index === index} onClick={() => setWords(item.words)}>
                <CultivationAvatar words={item.words} seed={seed} decorative />
                <strong>{item.name}</strong>
                <span>từ {item.words} từ</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="admin-avatars-title">
        <h2 id="admin-avatars-title" className="admin-section-title">
          {avatarSeeds.length} avatar ở cảnh giới {realm.name}
        </h2>
        <ul className="admin-avatar-grid">
          {avatarSeeds.map((item, index) => (
            <li key={item}>
              <CultivationAvatar words={words} seed={item} decorative />
              <span>#{index + 1}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const presets: [string, SimulatedProgress][] = [
  ["Người mới", { learned: 0, due: 0, streak: 0, introducedToday: 0 }],
  ["Đang học đều", { learned: 50, due: 5, streak: 6, introducedToday: 4 }],
  ["Tồn nhiều từ ôn", { learned: 220, due: 90, streak: 0, introducedToday: 0 }],
  ["Học hết sách", { learned: 600, due: 0, streak: 45, introducedToday: 0 }],
];
const progressFields: [keyof SimulatedProgress, string][] = [
  ["learned", "Từ đã ghi nhớ"],
  ["due", "Từ đến hạn ôn"],
  ["introducedToday", "Từ mới hôm nay"],
  ["streak", "Chuỗi ngày học"],
];
function ProgressPanel() {
  const { data } = useApp();
  const book = activeBook(data.settings);
  const [form, setForm] = useState<SimulatedProgress>(presets[1][1]);
  const [sim, setSim] = useState(() => ({
    run: 0,
    snapshot: simulateSnapshot(data.settings, book.catalog, presets[1][1]),
  }));
  const apply = (values: SimulatedProgress) => {
    setForm(values);
    setSim((previous) => ({ run: previous.run + 1, snapshot: simulateSnapshot(data.settings, book.catalog, values) }));
  };
  return (
    <div className="admin-stack">
      <section className="panel" aria-labelledby="admin-sim-title">
        <h2 id="admin-sim-title">Dữ liệu giả lập</h2>
        <p className="muted">
          Màn Hôm nay bên dưới chạy bằng dữ liệu giả trong bộ nhớ, chỉ để xem. Tiến độ thật, bảng xếp hạng và đồng bộ
          không bị ảnh hưởng.
        </p>
        <div className="admin-presets">
          {presets.map(([label, values]) => (
            <button key={label} type="button" className="button secondary" onClick={() => apply(values)}>
              {label}
            </button>
          ))}
        </div>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            apply(form);
          }}
        >
          {progressFields.map(([key, label]) => (
            <label key={key} className="admin-field">
              {label}
              <input
                type="number"
                min={0}
                max={key === "streak" ? 3650 : book.catalog.words.length}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <button className="button primary" type="submit">
            Áp dụng
          </button>
        </form>
      </section>
      <section className="admin-sandbox" aria-label="Xem trước màn Hôm nay với dữ liệu giả lập" inert>
        <SandboxProvider key={sim.run} initial={sim.snapshot}>
          <Today />
        </SandboxProvider>
      </section>
    </div>
  );
}

type RunFormat = "learn" | PreviewFormat;
const runFormats: readonly (readonly [RunFormat, string])[] = [["learn", "Học từ mới (5 từ)"], ...previewFormats];
interface Run {
  id: number;
  title: string;
  words?: Word[];
  questions?: Question[];
}
function ExercisePanel() {
  const { data } = useApp();
  const [bookId, setBookId] = useState(activeBook(data.settings).id);
  const book = bookById(bookId) ?? activeBook(data.settings);
  const [lessonId, setLessonId] = useState(book.catalog.lessons[0].id);
  const lesson = book.catalog.lessons.find((item) => item.id === lessonId) ?? book.catalog.lessons[0];
  const [format, setFormat] = useState<RunFormat>("learn");
  const [run, setRun] = useState<Run>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const label = runFormats.find(([value]) => value === format)?.[1] ?? format;
  const launch = async () => {
    setError("");
    const title = `Sandbox · ${label} · Bài ${lesson.id}`;
    if (format === "learn") {
      const words = book.catalog.words.filter((word) => word.lesson === lesson.id).slice(0, 5);
      return setRun({ id: Date.now(), title, words });
    }
    setLoading(true);
    try {
      const authored =
        needsAuthoredPack(format) && exerciseEntry(book, lesson.id)?.count
          ? await loadClozeLesson(book, lesson.id)
          : [];
      const questions = previewQuestions(format, book, lesson, authored, `admin:${book.id}:${lesson.id}:${Date.now()}`);
      if (questions.length) setRun({ id: Date.now(), title, questions });
      else {
        setRun(undefined);
        setError("Bài này chưa có câu phù hợp cho dạng đã chọn.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được bài tập.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="admin-stack">
      <section className="panel" aria-labelledby="admin-run-title">
        <h2 id="admin-run-title">Chạy thử một dạng bài</h2>
        <p className="muted">
          Dùng đúng màn học thật nhưng lượt chỉ nằm trong bộ nhớ: không tạo câu trả lời, không đổi hộp ôn, mất khi tải
          lại trang.
        </p>
        <div className="review-controls">
          <label>
            Giáo trình
            <select
              value={book.id}
              onChange={(event) => {
                setBookId(event.target.value);
                setLessonId((bookById(event.target.value) ?? book).catalog.lessons[0].id);
              }}
            >
              {books.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.shortTitle}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bài học
            <select value={lesson.id} onChange={(event) => setLessonId(Number(event.target.value))}>
              {book.catalog.lessons.map((item) => (
                <option key={item.id} value={item.id}>
                  Bài {item.id} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dạng bài
            <select value={format} onChange={(event) => setFormat(event.target.value as RunFormat)}>
              {runFormats.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-presets">
          <button className="button primary" type="button" disabled={loading} onClick={() => void launch()}>
            {loading ? "Đang tải…" : run ? "Chạy lại" : "Chạy thử"}
          </button>
          {run && (
            <button className="button secondary" type="button" onClick={() => setRun(undefined)}>
              Đóng lượt thử
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
      </section>
      {run && (
        <section className="admin-sandbox admin-sandbox--live" aria-label="Lượt thử trong sandbox">
          <SandboxProvider key={run.id} initial={{ ...emptySnapshot(), settings: { ...data.settings } }}>
            <SandboxRun run={run} />
          </SandboxProvider>
        </section>
      )}
    </div>
  );
}

function SandboxRun({ run }: { run: Run }) {
  const { ready, data, error, start, startExercises, change } = useApp();
  const started = useRef(false);
  const [word, setWord] = useState<Word | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    void (run.words ? start(run.words, "learn", run.title) : startExercises(run.questions ?? [], run.title));
  }, [ready, run, start, startExercises]);
  // Same peek rule as the real shell, applied to the sandbox session only.
  const inspect = async (selected: Word) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const session = data.session;
    if (session?.phase === "question" && session.questions[session.index].wordId === selected.id) {
      const saved = await change((state: Snapshot) =>
        state.session?.id === session.id && state.session.index === session.index
          ? { ...state, session: { ...state.session, peeked: true } }
          : state,
      );
      if (!saved) return;
    }
    setWord(selected);
  };
  return (
    <WordContext.Provider value={(selected) => void inspect(selected)}>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {data.session ? <StudySession /> : !error && <p role="status">Đang mở lượt thử…</p>}
      <WordDialog word={word} close={() => setWord(null)} opener={opener} />
    </WordContext.Provider>
  );
}
