"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../state/provider";
import { activeBook, bookById, books } from "../data/catalog";
import { makeQuestions, makeRecognitionQuestions, questionAnswerText } from "../domain/learning";
import { makeBuildQuestions } from "../data/build";
import { makeSynonymQuestions } from "../data/synonyms";
import { makeListeningQuestions } from "../data/listening";
import { makeMatchQuestions } from "../data/match";
import { exerciseEntry, loadClozeLesson, makeCatalogClozeQuestions, makeWordFormQuestions } from "../data/cloze";
import type { ClozeChoiceQuestion, Question } from "../domain/types";

const formats = [
  ["recall", "Gõ từ / điền câu"],
  ["recognition", "Chọn nghĩa / chọn từ"],
  ["cloze-choice", "Điền chỗ trống · chọn"],
  ["word-form-choice", "Dạng từ · chọn"],
  ["word-form", "Dạng từ · gõ"],
  ["build", "Ghép từ"],
  ["synonym-choice", "Đồng nghĩa / trái nghĩa"],
  ["synonym-context", "Gần nghĩa trong câu"],
  ["match", "Nối từ theo chủ đề"],
  ["listen-choice", "Nghe · chọn"],
  ["listen-type", "Nghe · gõ"],
] as const;
type Format = (typeof formats)[number][0];

export default function ContentReviewTools() {
  const { data } = useApp();
  const [bookId, setBookId] = useState(activeBook(data.settings).id);
  const book = bookById(bookId) ?? activeBook(data.settings);
  const [lessonId, setLessonId] = useState(book.catalog.lessons[0].id);
  const lesson = book.catalog.lessons.find((item) => item.id === lessonId) ?? book.catalog.lessons[0];
  const [format, setFormat] = useState<Format>("recognition");
  const [pack, setPack] = useState<{ key: string; questions: ClozeChoiceQuestion[]; error: string }>();
  const key = `${book.id}:${lesson.id}`;
  useEffect(() => {
    if (!exerciseEntry(book, lesson.id)?.count) return;
    const controller = new AbortController();
    void loadClozeLesson(book, lesson.id, controller.signal)
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
  }, [book, lesson.id, key]);
  const authored = useMemo(() => (pack?.key === key ? pack.questions : []), [pack, key]);
  const questions = useMemo((): Question[] => {
    const words = book.catalog.words.filter((word) => word.lesson === lesson.id);
    const seed = `content-review:${key}:${format}`;
    switch (format) {
      case "recall":
        return makeQuestions(words, book.catalog.words, "practice", seed, {});
      case "recognition":
        return makeRecognitionQuestions(words, book.catalog.words, seed, {});
      case "cloze-choice":
      case "word-form-choice":
        return makeCatalogClozeQuestions(
          authored.filter((q) => q.kind === format),
          book.catalog,
          seed,
          {},
        );
      case "word-form":
        return makeWordFormQuestions(authored, book.catalog.words);
      case "build":
        return makeBuildQuestions(words, seed);
      case "synonym-choice":
      case "synonym-context":
        return makeSynonymQuestions(words, book.catalog.words, format, seed, {});
      case "match":
        return makeMatchQuestions(book.catalog, lesson.topicId, {}, seed);
      case "listen-choice":
      case "listen-type":
        return makeListeningQuestions(words, book.catalog, format, seed, {});
    }
  }, [book, lesson, key, format, authored]);
  const authoredFormat = format === "cloze-choice" || format === "word-form-choice" || format === "word-form";
  const loading = authoredFormat && !!exerciseEntry(book, lesson.id)?.count && pack?.key !== key;
  return (
    <div className="page content-review-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHỈ XEM · KHÔNG GHI KẾT QUẢ</p>
          <h1 tabIndex={-1}>Kiểm tra nội dung</h1>
          <p className="page-subtitle">
            Xem đề, đáp án và đáp án nhiễu theo đúng bộ sinh bài tập. Không tạo lượt học hoặc thay tiến độ.
          </p>
        </div>
      </div>
      <section className="panel review-controls" aria-label="Bộ lọc nội dung">
        <label>
          Giáo trình
          <select value={book.id} onChange={(event) => setBookId(event.target.value)}>
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
          <select value={format} onChange={(event) => setFormat(event.target.value as Format)}>
            {formats.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <p className="muted">
        {questions.length} câu · Đáp án nhiễu xem theo trường hợp chưa học từ ở bài khác.
        {format === "match" ? " Nối từ lấy theo chủ đề của bài." : ""}
      </p>
      {loading ? (
        <p role="status">Đang tải gói bài tập…</p>
      ) : authoredFormat && pack?.key === key && pack.error ? (
        <p role="alert" className="inline-error">
          {pack.error}
        </p>
      ) : !questions.length ? (
        <p className="panel">Bài này chưa có câu phù hợp cho dạng đã chọn.</p>
      ) : (
        <div className="review-question-list">
          {questions.map((question, index) => {
            const word = book.catalog.words.find((item) => item.id === question.wordId);
            const answer = questionAnswerText(question);
            return (
              <article className="panel review-question" key={`${question.wordId}:${question.kind}:${index}`}>
                <div className="section-heading">
                  <h2>
                    {index + 1}. {word?.text ?? question.wordId}
                  </h2>
                  <span className="status-badge">{question.kind}</span>
                </div>
                {"direction" in question && question.direction === "antonym" && <strong>TRÁI NGHĨA</strong>}
                <p className="review-prompt" lang={question.kind === "build" ? "vi" : "en"}>
                  {question.prompt}
                </p>
                {"target" in question && question.target && (
                  <p>
                    Từ được hỏi: <strong lang="en">{question.target}</strong>
                  </p>
                )}
                <p className="review-answer">
                  Đáp án: <strong lang="en">{answer}</strong>
                </p>
                {question.kind === "build" && (
                  <>
                    <p>Thứ tự mảnh: {question.answer.join(" → ")}</p>
                    <p>Các mảnh: {question.tiles.join(" · ")}</p>
                  </>
                )}
                {"options" in question && !!question.options?.length && (
                  <ol className="review-options">
                    {question.options.map((option, optionIndex) => (
                      <li
                        key={`${option}:${optionIndex}`}
                        className={option === answer ? "review-option-correct" : undefined}
                        lang="en"
                      >
                        {option}
                        {option === answer ? " ✓" : ""}
                      </li>
                    ))}
                  </ol>
                )}
                {"sourceId" in question && question.sourceId && (
                  <p className="quiet-note">Nguồn: {question.sourceId}</p>
                )}
                {word?.examples[0] && (
                  <details>
                    <summary>Ví dụ trong từ vựng</summary>
                    <p lang="en">{word.examples[0].text}</p>
                    <p>{word.examples[0].translation}</p>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
