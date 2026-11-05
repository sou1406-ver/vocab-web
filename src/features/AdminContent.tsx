"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useApp, useAppStore } from "../state/provider";
import { useCloud } from "../state/cloud-provider";
import { activeBook, bookById, books, type Book } from "../data/catalog";
import {
  appliedEdits,
  isCatalogExample,
  isExerciseQuestion,
  originalOf,
  rejectedEdits,
  type ContentEdit,
} from "../data/content-edits";
import { loadBundledPack } from "../data/cloze";
import { refreshContentEdits } from "../state/content-sync";
import { isWord } from "../data/validation";
import type { ClozeChoiceQuestion, Word } from "../domain/types";

// Shared save/revert plumbing: writes to Firestore, then re-reads and applies at once in this browser.
function useEditActions() {
  const store = useAppStore();
  const cloud = useCloud();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string }>();
  const run = async (
    work: (api: typeof import("../data/content-edits-cloud"), uid: string) => Promise<void>,
    done: string,
  ) => {
    const uid = cloud.user?.uid;
    if (!uid) return setMessage({ tone: "error", text: "Cần đăng nhập tài khoản admin." });
    setBusy(true);
    setMessage(undefined);
    try {
      const api = await import("../data/content-edits-cloud");
      await work(api, uid);
      await refreshContentEdits(store, true);
      setMessage({ tone: "ok", text: done });
      return true;
    } catch (error) {
      const denied = error && typeof error === "object" && "code" in error && error.code === "permission-denied";
      setMessage({
        tone: "error",
        text: denied
          ? "Firestore từ chối ghi: tài khoản chưa có quyền admin hoặc quy tắc Firestore mới chưa được deploy."
          : error instanceof Error
            ? error.message
            : "Không lưu được. Hãy thử lại.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, run };
}

function Notice({ message }: { message?: { tone: "ok" | "error"; text: string } }) {
  if (!message) return null;
  return (
    <p
      role={message.tone === "error" ? "alert" : "status"}
      className={message.tone === "error" ? "inline-error" : "admin-ok"}
    >
      {message.text}
    </p>
  );
}

const editsFor = (book: Book, kind: ContentEdit["kind"]) =>
  new Map(
    appliedEdits()
      .filter((edit) => edit.bookId === book.id && edit.kind === kind)
      .map((edit) => [edit.target, edit]),
  );
const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "word";

export function WordEditor() {
  const { data } = useApp();
  const [bookId, setBookId] = useState(activeBook(data.settings).id);
  const book = bookById(bookId) ?? activeBook(data.settings);
  const [lessonId, setLessonId] = useState(book.catalog.lessons[0].id);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Word | "new" | null>(null);
  const { busy, message, run } = useEditActions();
  const edits = editsFor(book, "word");
  const original = originalOf(book);
  // Every word of the lesson, including hidden ones (from the bundle or from earlier additions).
  // Recomputed every render: cheap, and edits change outside React state.
  const rows = (() => {
    const added = [...edits.values()].flatMap((edit) =>
      isWord(edit.data) && !original.words.some((word) => word.id === edit.target) ? [edit.data] : [],
    );
    return [...original.words, ...added]
      .map((word) => {
        const edit = edits.get(word.id);
        const ignored = rejectedEdits().some((item) => item.id === edit?.id);
        const current = !ignored && edit && isWord(edit.data) ? edit.data : word;
        return { word: current, edit, ignored, added: !original.words.some((item) => item.id === word.id) };
      })
      .filter(({ word }) => word.lesson === lessonId)
      .filter(
        ({ word }) =>
          !search.trim() || `${word.text} ${word.meaning}`.toLowerCase().includes(search.trim().toLowerCase()),
      );
  })();
  const hide = (word: Word, edit?: ContentEdit) =>
    run(
      (api, uid) =>
        api.saveContentEdit(
          { kind: "word", bookId: book.id, target: word.id, data: edit?.data ?? null, hidden: true },
          uid,
        ),
      `Đã ẩn “${word.text}”. Tiến độ của người học vẫn được giữ.`,
    );
  const unhide = (word: Word, edit: ContentEdit) =>
    run(
      (api, uid) =>
        edit.data
          ? api.saveContentEdit({ kind: "word", bookId: book.id, target: word.id, data: edit.data, hidden: false }, uid)
          : api.removeContentEdit(edit.id),
      `Đã hiện lại “${word.text}”.`,
    );
  const revert = (word: Word, edit: ContentEdit) =>
    run((api) => api.removeContentEdit(edit.id), `Đã đưa “${word.text}” về bản gốc.`);
  return (
    <div className="admin-stack">
      <section className="panel" aria-labelledby="word-editor-title">
        <h2 id="word-editor-title">Từ vựng</h2>
        <p className="muted">
          Lưu thẳng vào Firestore: trình duyệt này thấy ngay, người học khác thấy trong vòng 15 phút. Ẩn từ không xoá
          tiến độ; “Hoàn tác” đưa từ về nội dung gốc.
        </p>
        <div className="review-controls">
          <label>
            Giáo trình
            <select
              value={book.id}
              onChange={(event) => {
                setBookId(event.target.value);
                setLessonId((bookById(event.target.value) ?? book).catalog.lessons[0].id);
                setEditing(null);
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
            <select
              value={lessonId}
              onChange={(event) => {
                setLessonId(Number(event.target.value));
                setEditing(null);
              }}
            >
              {book.catalog.lessons.map((item) => (
                <option key={item.id} value={item.id}>
                  Bài {item.id} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tìm trong bài
            <input
              className="admin-input"
              type="search"
              value={search}
              placeholder="Từ hoặc nghĩa…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="admin-presets">
          <button className="button primary" type="button" disabled={busy} onClick={() => setEditing("new")}>
            Thêm từ vào bài {lessonId}
          </button>
        </div>
        <Notice message={message} />
      </section>
      {editing && (
        <WordForm
          key={editing === "new" ? `new:${lessonId}` : editing.id}
          book={book}
          word={editing === "new" ? null : editing}
          lessonId={lessonId}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (word) => {
            const saved = await run(
              (api, uid) =>
                api.saveContentEdit({ kind: "word", bookId: book.id, target: word.id, data: word, hidden: false }, uid),
              `Đã lưu “${word.text}”.`,
            );
            if (saved) {
              setEditing(null);
              setLessonId(word.lesson);
            }
          }}
        />
      )}
      <section className="panel" aria-labelledby="word-list-title">
        <div className="section-heading">
          <h2 id="word-list-title">Bài {lessonId}</h2>
          <span className="muted">{rows.length} từ</span>
        </div>
        <ul className="admin-word-list">
          {rows.map(({ word, edit, ignored, added }) => (
            <li key={word.id} className={edit?.hidden ? "is-hidden" : undefined}>
              <div className="admin-word-main">
                <b lang="en">{word.text}</b>
                <span className="pos" data-pos={word.pos}>
                  {word.pos}
                </span>
                <span className="muted">{word.meaning}</span>
              </div>
              <div className="admin-word-tags">
                {added && <span className="status-badge reviewing">Mới</span>}
                {edit && !added && isWord(edit.data) && (
                  <span className="status-badge learning">{ignored ? "Bản sửa chưa áp dụng" : "Đã sửa"}</span>
                )}
                {ignored && (
                  <span className="muted">
                    Bản sửa cũ thiếu dữ liệu từng nghĩa đã duyệt. Có thể hoàn tác để bỏ bản sửa.
                  </span>
                )}
                {edit?.hidden && <span className="status-badge">Đã ẩn</span>}
              </div>
              <div className="admin-word-actions">
                <button className="text-link" type="button" disabled={busy} onClick={() => setEditing(word)}>
                  Sửa
                </button>
                {edit?.hidden ? (
                  <button className="text-link" type="button" disabled={busy} onClick={() => void unhide(word, edit)}>
                    Hiện lại
                  </button>
                ) : (
                  <button className="text-link" type="button" disabled={busy} onClick={() => void hide(word, edit)}>
                    Ẩn
                  </button>
                )}
                {edit && !added && (
                  <button className="text-link" type="button" disabled={busy} onClick={() => void revert(word, edit)}>
                    Hoàn tác
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {!rows.length && <p className="muted">Không có từ phù hợp.</p>}
      </section>
    </div>
  );
}

function WordForm({
  book,
  word,
  lessonId,
  busy,
  onCancel,
  onSave,
}: {
  book: Book;
  word: Word | null;
  lessonId: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (word: Word) => Promise<void>;
}) {
  const [form, setForm] = useState({
    text: word?.text ?? "",
    pos: word?.pos ?? "n",
    ipa: word?.ipa ?? "",
    meaning: word?.meaning ?? "",
    definition: word?.definition ?? "",
    lesson: word?.lesson ?? lessonId,
    synonyms: (word?.synonyms ?? []).join(", "),
    antonyms: (word?.antonyms ?? []).join(", "),
    parts: (word?.parts ?? []).join(", "),
  });
  const [examples, setExamples] = useState(word?.examples.length ? word.examples : [{ text: "", translation: "" }]);
  const [family, setFamily] = useState(
    (word?.family ?? []).map((item) => ({ ...item, parts: (item.parts ?? []).join(" + ") })),
  );
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [key]: key === "lesson" ? Number(event.target.value) : event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.text.trim() || !form.meaning.trim()) return setError("Cần nhập từ và nghĩa.");
    const next: Word = {
      id: word?.id ?? `${book.id}:${slug(form.text)}-${crypto.randomUUID().slice(0, 4)}`,
      lesson: form.lesson,
      text: form.text.trim(),
      pos: form.pos.trim(),
      ipa: form.ipa.trim(),
      meaning: form.meaning.trim(),
      definition: form.definition.trim(),
      examples: examples
        .map((item) => ({ text: item.text.trim(), translation: item.translation.trim() }))
        .filter((item) => item.text),
      family: family
        .filter((item) => item.text.trim())
        .map((item) => {
          const parts = item.parts
            .split("+")
            .map((part) => part.trim())
            .filter(Boolean);
          return {
            text: item.text.trim(),
            pos: item.pos.trim(),
            meaning: item.meaning.trim(),
            ...(parts.length ? { parts } : {}),
          };
        }),
      synonyms: list(form.synonyms),
      antonyms: list(form.antonyms),
      parts: list(form.parts),
    };
    setError("");
    void onSave(next);
  };
  if (word?.lexeme)
    return (
      <section className="panel admin-form-panel" aria-labelledby="word-form-title">
        <h2 id="word-form-title">Nội dung theo từng nghĩa: {word.text}</h2>
        <p>Từ này đã được biên soạn và duyệt theo từng nghĩa. Trình sửa hiện tại chưa hỗ trợ nội dung này.</p>
        <button type="button" className="button secondary" onClick={onCancel}>
          Đóng
        </button>
      </section>
    );
  return (
    <form className="panel admin-form-panel" aria-labelledby="word-form-title" onSubmit={submit}>
      <h2 id="word-form-title">{word ? `Sửa “${word.text}”` : "Thêm từ mới"}</h2>
      <div className="admin-grid">
        <label className="admin-field">
          Từ *
          <input className="admin-input" value={form.text} onChange={set("text")} required lang="en" />
        </label>
        <label className="admin-field">
          Loại từ
          <input className="admin-input" value={form.pos} onChange={set("pos")} placeholder="n, v, adj, adv" />
        </label>
        <label className="admin-field">
          IPA
          <input className="admin-input" value={form.ipa} onChange={set("ipa")} placeholder="/əˈɡriːmənt/" />
        </label>
        <label className="admin-field">
          Bài
          <select className="admin-input" value={form.lesson} onChange={set("lesson")}>
            {book.catalog.lessons.map((item) => (
              <option key={item.id} value={item.id}>
                Bài {item.id} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-span">
          Nghĩa tiếng Việt *
          <input className="admin-input" value={form.meaning} onChange={set("meaning")} required />
        </label>
        <label className="admin-field admin-span">
          Định nghĩa tiếng Anh
          <textarea className="admin-input" rows={2} value={form.definition} onChange={set("definition")} lang="en" />
        </label>
        <label className="admin-field">
          Đồng nghĩa (cách nhau dấu phẩy)
          <input className="admin-input" value={form.synonyms} onChange={set("synonyms")} lang="en" />
        </label>
        <label className="admin-field">
          Trái nghĩa (cách nhau dấu phẩy)
          <input className="admin-input" value={form.antonyms} onChange={set("antonyms")} lang="en" />
        </label>
        <label className="admin-field admin-span">
          Mảnh từ (cách nhau dấu phẩy)
          <input
            className="admin-input"
            value={form.parts}
            onChange={set("parts")}
            placeholder="agree, -ment"
            lang="en"
          />
        </label>
      </div>
      <fieldset className="admin-repeat">
        <legend>Ví dụ</legend>
        {examples.map((item, index) => (
          <div className="admin-repeat-row" key={index}>
            <label className="admin-field">
              Câu tiếng Anh {index + 1}
              <input
                className="admin-input"
                lang="en"
                value={item.text}
                onChange={(event) =>
                  setExamples((rows) =>
                    rows.map((row, at) => (at === index ? { ...row, text: event.target.value } : row)),
                  )
                }
              />
            </label>
            <label className="admin-field">
              Bản dịch {index + 1}
              <input
                className="admin-input"
                value={item.translation}
                onChange={(event) =>
                  setExamples((rows) =>
                    rows.map((row, at) => (at === index ? { ...row, translation: event.target.value } : row)),
                  )
                }
              />
            </label>
            <button
              className="text-link"
              type="button"
              onClick={() => setExamples((rows) => rows.filter((_, at) => at !== index))}
            >
              Bỏ ví dụ {index + 1}
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          type="button"
          onClick={() => setExamples((rows) => [...rows, { text: "", translation: "" }])}
        >
          Thêm ví dụ
        </button>
      </fieldset>
      <fieldset className="admin-repeat">
        <legend>Họ từ</legend>
        {family.map((item, index) => (
          <div className="admin-repeat-row admin-repeat-row--family" key={index}>
            {(
              [
                ["text", "Từ"],
                ["pos", "Loại"],
                ["meaning", "Nghĩa"],
                ["parts", "Mảnh (a + b)"],
              ] as const
            ).map(([key, label]) => (
              <label className="admin-field" key={key}>
                {label} {index + 1}
                <input
                  className="admin-input"
                  value={item[key]}
                  lang={key === "meaning" ? "vi" : "en"}
                  onChange={(event) =>
                    setFamily((rows) =>
                      rows.map((row, at) => (at === index ? { ...row, [key]: event.target.value } : row)),
                    )
                  }
                />
              </label>
            ))}
            <button
              className="text-link"
              type="button"
              onClick={() => setFamily((rows) => rows.filter((_, at) => at !== index))}
            >
              Bỏ dòng {index + 1}
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          type="button"
          onClick={() => setFamily((rows) => [...rows, { text: "", pos: "", meaning: "", parts: "" }])}
        >
          Thêm dạng trong họ từ
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <div className="admin-presets">
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
        <button className="button secondary" type="button" disabled={busy} onClick={onCancel}>
          Huỷ
        </button>
      </div>
    </form>
  );
}

export function LessonEditor() {
  const { data } = useApp();
  const [bookId, setBookId] = useState(activeBook(data.settings).id);
  const book = bookById(bookId) ?? activeBook(data.settings);
  const { busy, message, run } = useEditActions();
  const original = originalOf(book);
  const lessonEdits = editsFor(book, "lesson");
  const topicEdits = editsFor(book, "topic");
  return (
    <div className="admin-stack">
      <section className="panel" aria-labelledby="lesson-editor-title">
        <h2 id="lesson-editor-title">Bài & chủ đề</h2>
        <p className="muted">Đổi tên bài, bản dịch tên bài và tên chủ đề. “Hoàn tác” trả về tên gốc.</p>
        <label className="admin-field admin-field--inline">
          Giáo trình
          <select className="admin-input" value={book.id} onChange={(event) => setBookId(event.target.value)}>
            {books.map((item) => (
              <option key={item.id} value={item.id}>
                {item.shortTitle}
              </option>
            ))}
          </select>
        </label>
        <Notice message={message} />
      </section>
      <section className="panel" aria-labelledby="topic-editor-title">
        <h2 id="topic-editor-title">Chủ đề</h2>
        <ul className="admin-rename-list">
          {original.topics.map((topic) => {
            const current = book.catalog.topics.find((item) => item.id === topic.id) ?? topic;
            const edit = topicEdits.get(topic.id);
            return (
              <RenameRow
                key={`${book.id}:${topic.id}:${current.title}`}
                label={topic.title}
                fields={[{ key: "title", label: "Tên chủ đề", value: current.title, required: true }]}
                edited={Boolean(edit)}
                busy={busy}
                onSave={(values) =>
                  void run(
                    (api, uid) =>
                      api.saveContentEdit(
                        {
                          kind: "topic",
                          bookId: book.id,
                          target: topic.id,
                          data: { title: values.title },
                          hidden: false,
                        },
                        uid,
                      ),
                    `Đã đổi tên chủ đề thành “${values.title}”.`,
                  )
                }
                onRevert={() => edit && void run((api) => api.removeContentEdit(edit.id), "Đã trả chủ đề về tên gốc.")}
              />
            );
          })}
        </ul>
      </section>
      <section className="panel" aria-labelledby="lesson-list-title">
        <h2 id="lesson-list-title">Bài học</h2>
        <ul className="admin-rename-list">
          {original.lessons.map((lesson) => {
            const current = book.catalog.lessons.find((item) => item.id === lesson.id) ?? lesson;
            const edit = lessonEdits.get(String(lesson.id));
            return (
              <RenameRow
                key={`${book.id}:${lesson.id}:${current.title}:${current.translation}`}
                label={`Bài ${lesson.id}`}
                fields={[
                  { key: "title", label: "Tên bài", value: current.title, required: true },
                  { key: "translation", label: "Bản dịch", value: current.translation, required: false },
                ]}
                edited={Boolean(edit)}
                busy={busy}
                onSave={(values) =>
                  void run(
                    (api, uid) =>
                      api.saveContentEdit(
                        {
                          kind: "lesson",
                          bookId: book.id,
                          target: String(lesson.id),
                          data: { title: values.title, translation: values.translation },
                          hidden: false,
                        },
                        uid,
                      ),
                    `Đã lưu bài ${lesson.id}.`,
                  )
                }
                onRevert={() =>
                  edit && void run((api) => api.removeContentEdit(edit.id), `Đã trả bài ${lesson.id} về tên gốc.`)
                }
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function RenameRow({
  label,
  fields,
  edited,
  busy,
  onSave,
  onRevert,
}: {
  label: string;
  fields: { key: string; label: string; value: string; required: boolean }[];
  edited: boolean;
  busy: boolean;
  onSave: (values: Record<string, string>) => void;
  onRevert: () => void;
}) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.key, field.value])));
  const changed = fields.some((field) => values[field.key] !== field.value);
  const valid = fields.every((field) => !field.required || values[field.key].trim());
  return (
    <li>
      <form
        className="admin-rename-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (changed && valid)
            onSave(Object.fromEntries(fields.map((field) => [field.key, values[field.key].trim()])));
        }}
      >
        <span className="admin-rename-label">
          {label}
          {edited && <span className="status-badge learning">Đã sửa</span>}
        </span>
        {fields.map((field) => (
          <label className="admin-field" key={field.key}>
            <span className="sr-only">
              {field.label} · {label}
            </span>
            <input
              className="admin-input"
              value={values[field.key]}
              placeholder={field.label}
              onChange={(event) => setValues((previous) => ({ ...previous, [field.key]: event.target.value }))}
            />
          </label>
        ))}
        <button className="button secondary" type="submit" disabled={busy || !changed || !valid}>
          Lưu
        </button>
        {edited && (
          <button className="text-link" type="button" disabled={busy} onClick={onRevert}>
            Hoàn tác
          </button>
        )}
      </form>
    </li>
  );
}

const kindLabels = { "cloze-choice": "Điền chỗ trống", "word-form-choice": "Dạng từ" } as const;

export function ExerciseEditor() {
  const { data } = useApp();
  const [bookId, setBookId] = useState(activeBook(data.settings).id);
  const book = bookById(bookId) ?? activeBook(data.settings);
  const [lessonId, setLessonId] = useState(book.catalog.lessons[0].id);
  const [pack, setPack] = useState<{ key: string; questions: ClozeChoiceQuestion[]; error: string }>();
  const [editing, setEditing] = useState<ClozeChoiceQuestion | "new" | null>(null);
  const { busy, message, run } = useEditActions();
  const key = `${book.id}:${lessonId}`;
  useEffect(() => {
    const controller = new AbortController();
    void loadBundledPack(book, lessonId, controller.signal)
      .then((questions) => {
        if (!controller.signal.aborted) setPack({ key, questions, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setPack({
            key,
            questions: [],
            error: error instanceof Error ? error.message : "Không tải được gói bài tập.",
          });
      });
    return () => controller.abort();
  }, [book, lessonId, key]);
  const edits = new Map(
    appliedEdits()
      .filter((edit) => edit.bookId === book.id && edit.kind === "exercise" && edit.lessonId === lessonId)
      .map((edit) => [edit.target, edit]),
  );
  const base = pack?.key === key ? pack.questions : [];
  const rows = [
    ...base.map((question) => {
      const edit = edits.get(question.sourceId);
      const current = edit && isExerciseQuestion(edit.data, question.sourceId) ? edit.data : question;
      return { question: current, edit, added: false };
    }),
    ...[...edits.values()].flatMap((edit) =>
      !base.some((question) => question.sourceId === edit.target) && isExerciseQuestion(edit.data, edit.target)
        ? [{ question: edit.data, edit, added: true }]
        : [],
    ),
  ];
  const words = book.catalog.words.filter((word) => word.lesson === lessonId);
  const save = (question: ClozeChoiceQuestion, hidden: boolean, done: string) =>
    run(
      (api, uid) =>
        api.saveContentEdit(
          { kind: "exercise", bookId: book.id, target: question.sourceId, data: question, hidden, lessonId },
          uid,
        ),
      done,
    );
  return (
    <div className="admin-stack">
      <section className="panel" aria-labelledby="exercise-editor-title">
        <h2 id="exercise-editor-title">Câu bài tập</h2>
        <p className="muted">
          Câu điền chỗ trống và dạng từ biên soạn theo bài. Câu lấy từ ví dụ trong từ vựng có đáp án nhiễu tự sinh khi
          học, nên chỉ sửa được câu đề.
        </p>
        <div className="review-controls">
          <label>
            Giáo trình
            <select
              value={book.id}
              onChange={(event) => {
                setBookId(event.target.value);
                setLessonId((bookById(event.target.value) ?? book).catalog.lessons[0].id);
                setEditing(null);
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
            <select
              value={lessonId}
              onChange={(event) => {
                setLessonId(Number(event.target.value));
                setEditing(null);
              }}
            >
              {book.catalog.lessons.map((item) => (
                <option key={item.id} value={item.id}>
                  Bài {item.id} · {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-presets">
          <button
            className="button primary"
            type="button"
            disabled={busy || !words.length}
            onClick={() => setEditing("new")}
          >
            Thêm câu vào bài {lessonId}
          </button>
        </div>
        <Notice message={message} />
      </section>
      {editing && (
        <ExerciseForm
          key={editing === "new" ? `new:${key}` : editing.sourceId}
          question={editing === "new" ? null : editing}
          lessonId={lessonId}
          words={words}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (question) => {
            if (await save(question, false, "Đã lưu câu bài tập.")) setEditing(null);
          }}
        />
      )}
      <section className="panel" aria-labelledby="exercise-list-title">
        <div className="section-heading">
          <h2 id="exercise-list-title">Bài {lessonId}</h2>
          <span className="muted">{rows.length} câu</span>
        </div>
        {pack?.key !== key ? (
          <p role="status">Đang tải gói bài tập…</p>
        ) : pack.error ? (
          <p role="alert" className="inline-error">
            {pack.error}
          </p>
        ) : !rows.length ? (
          <p className="muted">Bài này chưa có câu biên soạn. Có thể thêm câu mới.</p>
        ) : (
          <ol className="admin-exercise-list">
            {rows.map(({ question, edit, added }) => {
              const word = book.catalog.words.find((item) => item.id === question.wordId);
              return (
                <li key={question.sourceId} className={edit?.hidden ? "is-hidden" : undefined}>
                  <div className="admin-exercise-head">
                    <span className="status-badge">{kindLabels[question.kind]}</span>
                    <b lang="en">{word?.text ?? "(từ đã ẩn)"}</b>
                    {added && <span className="status-badge reviewing">Mới</span>}
                    {edit && !added && !edit.hidden && <span className="status-badge learning">Đã sửa</span>}
                    {edit?.hidden && <span className="status-badge">Đã ẩn</span>}
                  </div>
                  <p className="admin-exercise-prompt" lang="en">
                    {question.prompt}
                  </p>
                  <p className="muted">
                    Đáp án: <strong lang="en">{question.answer}</strong>
                    {isCatalogExample(question.sourceId)
                      ? " · Đáp án nhiễu tự sinh"
                      : ` · Lựa chọn: ${question.options.join(" · ")}`}
                  </p>
                  <div className="admin-word-actions">
                    <button className="text-link" type="button" disabled={busy} onClick={() => setEditing(question)}>
                      Sửa
                    </button>
                    {edit?.hidden ? (
                      <button
                        className="text-link"
                        type="button"
                        disabled={busy}
                        onClick={() => void save(question, false, "Đã hiện lại câu bài tập.")}
                      >
                        Hiện lại
                      </button>
                    ) : (
                      <button
                        className="text-link"
                        type="button"
                        disabled={busy}
                        onClick={() => void save(question, true, "Đã ẩn câu bài tập.")}
                      >
                        Ẩn
                      </button>
                    )}
                    {edit && !added && (
                      <button
                        className="text-link"
                        type="button"
                        disabled={busy}
                        onClick={() => void run((api) => api.removeContentEdit(edit.id), "Đã đưa câu về bản gốc.")}
                      >
                        Hoàn tác
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function ExerciseForm({
  question,
  lessonId,
  words,
  busy,
  onCancel,
  onSave,
}: {
  question: ClozeChoiceQuestion | null;
  lessonId: number;
  words: Word[];
  busy: boolean;
  onCancel: () => void;
  onSave: (question: ClozeChoiceQuestion) => Promise<void>;
}) {
  const example = question ? isCatalogExample(question.sourceId) : false;
  const [kind, setKind] = useState<ClozeChoiceQuestion["kind"]>(question?.kind ?? "cloze-choice");
  const [wordId, setWordId] = useState(question?.wordId ?? words[0]?.id ?? "");
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [answer, setAnswer] = useState(question?.answer ?? words[0]?.text ?? "");
  const [options, setOptions] = useState((question?.options ?? []).join(", "));
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const sourceId = question?.sourceId ?? `admin:${lessonId}:${crypto.randomUUID().slice(0, 8)}`;
    const choices = example ? [] : list(options);
    const next: ClozeChoiceQuestion = {
      kind,
      wordId,
      prompt: prompt.trim(),
      answer: answer.trim(),
      options: example ? [] : choices.includes(answer.trim()) ? choices : [answer.trim(), ...choices],
      sourceId,
      sourceVersion: question?.sourceVersion ?? "admin",
    };
    if (!isExerciseQuestion(next, sourceId))
      return setError(
        example
          ? "Câu đề cần đúng một chỗ trống ___."
          : "Cần câu đề có đúng một chỗ trống ___, đáp án và 2–6 lựa chọn khác nhau (gồm cả đáp án).",
      );
    setError("");
    void onSave(next);
  };
  return (
    <form className="panel admin-form-panel" aria-labelledby="exercise-form-title" onSubmit={submit}>
      <h2 id="exercise-form-title">{question ? "Sửa câu bài tập" : "Thêm câu bài tập"}</h2>
      <div className="admin-grid">
        <label className="admin-field">
          Dạng câu
          <select
            className="admin-input"
            value={kind}
            disabled={Boolean(question)}
            onChange={(event) => setKind(event.target.value as ClozeChoiceQuestion["kind"])}
          >
            <option value="cloze-choice">Điền chỗ trống</option>
            <option value="word-form-choice">Dạng từ</option>
          </select>
        </label>
        <label className="admin-field">
          Từ của bài
          <select
            className="admin-input"
            value={wordId}
            disabled={example}
            onChange={(event) => {
              setWordId(event.target.value);
              if (!question) setAnswer(words.find((word) => word.id === event.target.value)?.text ?? "");
            }}
          >
            {words.map((word) => (
              <option key={word.id} value={word.id}>
                {word.text}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-span">
          Câu đề (dùng ___ cho chỗ trống) *
          <textarea
            className="admin-input"
            rows={2}
            lang="en"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <label className="admin-field">
          Đáp án *
          <input
            className="admin-input"
            lang="en"
            value={answer}
            readOnly={example}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </label>
        {!example && (
          <label className="admin-field">
            Các lựa chọn (cách nhau dấu phẩy)
            <input
              className="admin-input"
              lang="en"
              value={options}
              onChange={(event) => setOptions(event.target.value)}
            />
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <div className="admin-presets">
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
        <button className="button secondary" type="button" disabled={busy} onClick={onCancel}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
