"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { catalog } from "../data/catalog";
import { useApp } from "../state/provider";
import { Empty, Icon, ProgressBar, WordContent } from "../shared/ui";
import { useWord } from "../app/context";
import type { Word } from "../domain/types";
import { LetterSlotsInput } from "../components/LetterSlotsInput";
import { projectRevealed } from "../components/letter-slots-edit";
import { hintAllowance, revealQuestionLetter, questionAnswerText } from "../domain/learning";
import { shuffleSeeded } from "../domain/random";
import { BuildAnswer } from "../components/BuildAnswer";
import { singleWordMatch } from "../domain/word-match";

export default function Study() {
  const { data, busy, advance, answer, finish, start, startExercises, change } = useApp();
  const router = useRouter();
  const inspect = useWord();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const choiceRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const session = data.session;
  const revealed = session?.revealed ?? [];
  useEffect(() => {
    setInput("");
    if (session?.phase === "learn" || session?.phase === "question") window.scrollTo(0, 0);
    if (session?.phase === "question") (inputRef.current ?? choiceRef.current)?.focus({ preventScroll: true });
    else nextRef.current?.focus({ preventScroll: true });
    if (session?.phase === "feedback") feedbackRef.current?.scrollIntoView({ block: "nearest" });
  }, [session?.id, session?.index, session?.phase]);
  if (!session)
    return (
      <div className="page">
        <Empty title="Bắt đầu một lượt học nhỏ">
          <p>Chọn bài hoặc mở Hôm nay để tìm lượt học phù hợp.</p>
          <Link className="button primary" href="/">
            Về Hôm nay <Icon name="arrow" />
          </Link>
        </Empty>
      </div>
    );
  const all = [...catalog.words, ...data.customWords];
  const events = data.events.filter((e) => e.sessionId === session.id);
  const correct = events.filter((e) => e.correct).length;
  if (session.phase === "complete") {
    const wrongWords = [...new Set(events.filter((e) => !e.correct).map((e) => e.wordId))]
      .map((id) => all.find((w) => w.id === id))
      .filter((w): w is Word => Boolean(w));
    const retry = async () => {
      const questions =
        session.mode === "practice"
          ? session.questions.filter((_, index) => events.some((e) => !e.correct && e.id === `${session.id}:${index}`))
          : [];
      if (questions.length) {
        if (
          await startExercises(
            (id) =>
              questions.map((q) =>
                q.kind === "meaning" ||
                q.kind === "word-choice" ||
                q.kind === "synonym-choice" ||
                q.kind === "synonym-context"
                  ? { ...q, options: shuffleSeeded(q.options, `${id}:${q.wordId}:${q.kind}`) }
                  : q.kind === "build"
                    ? { ...q, tiles: shuffleSeeded(q.tiles, `${id}:${q.sourceId ?? q.wordId}:tiles`) }
                    : q,
              ),
            "Luyện lại câu vừa sai",
            session.returnTo,
          )
        )
          router.push("/study");
        return;
      }
      if (await start(wrongWords, "practice", "Luyện lại từ vừa sai", session.returnTo)) router.push("/study");
    };
    return (
      <div className="page result-page">
        <div className="result-symbol">
          <Icon name="leaf" size={35} />
        </div>
        <h1 tabIndex={-1}>
          Một lượt học, thêm vững vàng<span className="heading-dot">.</span>
        </h1>
        <p className="page-subtitle">{session.title}</p>
        <div className="result-score">
          <b>
            {correct}
            <span>/{events.length}</span>
          </b>
          <p>câu tự trả lời đúng</p>
        </div>
        <div className="result-notes">
          <span>
            <Icon name="check" size={18} /> Đã lưu kết quả trên máy
          </span>
          <span>
            <Icon name="repeat" size={18} />
            {session.mode === "practice"
              ? "Luyện thêm không tăng bậc ôn"
              : "Lịch ôn đã được cập nhật cho từ đủ điều kiện"}
          </span>
        </div>
        {wrongWords.length > 0 && (
          <section className="panel missed-panel">
            <h2>{wrongWords.length} từ cần thêm một lần gặp</h2>
            <div className="missed-list">
              {wrongWords.map((word) => (
                <button key={word.id} onClick={() => inspect(word)}>
                  <b lang="en">{word.text}</b>
                  <span>{word.meaning}</span>
                  <Icon name="arrow" size={17} />
                </button>
              ))}
            </div>
          </section>
        )}
        <div className="result-actions">
          {wrongWords.length > 0 && (
            <button className="button primary" onClick={() => void retry()} disabled={busy}>
              Luyện lại từ vừa sai <Icon name="repeat" size={18} />
            </button>
          )}
          <Link className={`button ${wrongWords.length ? "secondary" : "primary"}`} href="/">
            Hoàn tất <Icon name="check" size={18} />
          </Link>
          <Link className="text-link" href="/lessons">
            Chọn bài khác <Icon name="arrow" size={16} />
          </Link>
        </div>
        {session.returnTo && (
          <Link className="reading-return" href={session.returnTo} scroll={false}>
            Quay lại bài đang đọc
          </Link>
        )}
        <p className="quiet-note">Đây là kết quả của lượt học, không phải bài kiểm tra qua bài.</p>
      </div>
    );
  }
  if (session.contentVersion !== catalog.version)
    return (
      <div className="page">
        <Empty title="Nội dung bài học đã cập nhật">
          <p>Kết quả đã trả lời vẫn được giữ. Kết thúc lượt cũ rồi bắt đầu lượt mới để học nội dung hiện tại.</p>
          <button className="button primary" onClick={() => void finish()}>
            Giữ kết quả và kết thúc lượt
          </button>
        </Empty>
      </div>
    );
  const question = session.questions[session.index];
  const word = all.find((w) => w.id === question.wordId);
  if (!word)
    return (
      <div className="page">
        <Empty title="Không tìm thấy từ của lượt này">
          <p>Kết quả đã trả lời vẫn được giữ.</p>
          <button className="button primary" onClick={() => void finish()}>
            Kết thúc lượt
          </button>
        </Empty>
      </div>
    );
  const feedback = session.feedback;
  const synonymMatch =
    question.kind === "synonym-context" ? singleWordMatch(question.prompt, question.target ?? word.text) : null;
  const typed = question.kind === "cloze" || question.kind === "recall" || question.kind === "word-form";
  const answerText = questionAnswerText(question);
  const typedValue = projectRevealed(input, answerText, revealed);
  const hintLimit = hintAllowance(answerText);
  const hintIndex = Array.from(answerText).findIndex((char, index) => /\p{L}/u.test(char) && !revealed.includes(index));
  const revealLetter = async () => {
    if (!typed || hintIndex < 0 || session.phase !== "question") return;
    const saved = await change((state) => revealQuestionLetter(state, session.id, session.index));
    if (saved) {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  };
  return (
    <div className="page study-page">
      <div className="study-top">
        <Link className="back-link" href="/">
          ← Tạm dừng
        </Link>
        <span>
          <Icon name="book" size={16} />
          {session.title}
        </span>
        <span className="study-counter">
          {session.index + 1} / {session.questions.length}
        </span>
      </div>
      <ProgressBar
        value={((session.index + Number(session.phase === "feedback")) / session.questions.length) * 100}
        label="Tiến độ lượt học"
      />
      <div className="study-heading">
        <p className="eyebrow">
          {session.mode === "learn"
            ? "HỌC MỘT TỪ, HIỂU MỘT CHÚT"
            : session.mode === "review"
              ? "GẶP LẠI ĐỂ NHỚ LÂU"
              : "THÊM MỘT LẦN LUYỆN"}
        </p>
        <h1 tabIndex={-1}>
          {session.phase === "learn"
            ? "Làm quen với từ này"
            : question.kind === "synonym-choice"
              ? question.direction === "antonym"
                ? "Chọn từ trái nghĩa"
                : "Chọn từ đồng nghĩa"
              : question.kind === "synonym-context"
                ? "Từ nào gần nghĩa nhất với từ gạch chân?"
                : question.kind === "build"
                  ? "Ghép gốc và phụ tố"
                  : question.kind === "meaning"
                    ? "Chọn nghĩa phù hợp"
                    : question.kind === "word-choice"
                      ? "Chọn từ phù hợp"
                      : question.kind === "word-form-choice"
                        ? "Chọn dạng từ phù hợp"
                        : question.kind === "word-form"
                          ? "Gõ dạng từ phù hợp"
                          : question.kind === "cloze" || question.kind === "cloze-choice"
                            ? "Điền từ còn thiếu"
                            : "Bạn nhớ từ nào?"}
        </h1>
      </div>
      <section className="study-card" aria-label="Nội dung lượt học">
        {session.phase === "learn" ? (
          <>
            <WordContent word={word} />
            <div className="study-card-actions">
              <span className="muted">Đọc ví dụ, nghe và thử ghi nhớ.</span>
              <button ref={nextRef} className="button primary" disabled={busy} onClick={() => void advance()}>
                Đã xem, thử nhớ lại <Icon name="arrow" size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className={`question-prompt ${question.kind === "cloze" || question.kind === "cloze-choice" || question.kind === "word-form-choice" || question.kind === "word-form" || question.kind === "synonym-context" ? "sentence-prompt" : ""}`}
            >
              <span className="small-label">
                {question.kind === "meaning"
                  ? "TỪ NÀY CÓ NGHĨA LÀ GÌ?"
                  : question.kind === "synonym-choice"
                    ? question.direction === "antonym"
                      ? "TRÁI NGHĨA"
                      : "ĐỒNG NGHĨA"
                    : question.kind === "synonym-context"
                      ? "GẦN NGHĨA NHẤT TRONG NGỮ CẢNH"
                      : question.kind === "build"
                        ? "GHÉP TỪ THEO NGHĨA"
                        : question.kind === "word-choice"
                          ? "CHỌN TỪ TIẾNG ANH PHÙ HỢP"
                          : question.kind === "word-form-choice"
                            ? "CHỌN DẠNG TỪ PHÙ HỢP"
                            : question.kind === "word-form"
                              ? "VIẾT DẠNG TỪ PHÙ HỢP"
                              : question.kind === "cloze" || question.kind === "cloze-choice"
                                ? "HOÀN THÀNH CÂU TIẾNG ANH"
                                : "VIẾT TỪ TIẾNG ANH CÓ NGHĨA"}
              </span>
              <p
                lang={
                  question.kind === "recall" || question.kind === "word-choice" || question.kind === "build"
                    ? "vi"
                    : "en"
                }
              >
                {synonymMatch ? (
                  <>
                    {question.prompt.slice(0, synonymMatch.start)}
                    <u className="synonym-target">{question.prompt.slice(synonymMatch.start, synonymMatch.end)}</u>
                    {question.prompt.slice(synonymMatch.end)}
                  </>
                ) : question.kind === "synonym-choice" ? (
                  question.prompt.replace(/^TRÁI NGHĨA:\s*/, "")
                ) : (
                  question.prompt
                )}
              </p>
              {synonymMatch && (
                <span className="sr-only">
                  Từ được gạch chân: {question.prompt.slice(synonymMatch.start, synonymMatch.end)}.
                </span>
              )}
              {question.kind !== "cloze-choice" &&
                question.kind !== "word-form-choice" &&
                question.kind !== "word-form" &&
                question.kind !== "build" && <span className="pos">{word.pos}</span>}
            </div>
            {question.kind === "build" ? (
              <BuildAnswer
                key={`${session.id}:${session.index}`}
                question={question}
                feedback={feedback}
                busy={busy}
                firstTileRef={choiceRef}
                onAnswer={(parts) => void answer(parts)}
              />
            ) : question.kind === "meaning" ||
              question.kind === "cloze-choice" ||
              question.kind === "word-form-choice" ||
              question.kind === "synonym-choice" ||
              question.kind === "synonym-context" ||
              question.kind === "word-choice" ? (
              <div className="answer-options">
                {question.options.map((option, i) => (
                  <button
                    ref={i === 0 ? choiceRef : undefined}
                    key={option}
                    lang={question.kind === "meaning" ? "vi" : "en"}
                    className={`answer-option${feedback && option === question.answer ? " correct-option" : ""}${feedback && !feedback.correct && option === feedback.input ? " wrong-option" : ""}`}
                    disabled={busy || session.phase === "feedback"}
                    onClick={() => void answer(option)}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {option}
                    {feedback && option === question.answer && <Icon name="check" size={18} />}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="typing-answer"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typedValue.trim() && session.phase === "question") void answer(typedValue);
                }}
              >
                <label htmlFor="typed-answer">Đáp án của bạn</label>
                <div>
                  <LetterSlotsInput
                    key={`${session.id}:${session.index}`}
                    inputRef={inputRef}
                    id="typed-answer"
                    answer={answerText}
                    revealed={revealed}
                    value={session.phase === "feedback" ? (feedback?.input ?? "") : typedValue}
                    disabled={busy || session.phase === "feedback"}
                    onChange={setInput}
                  />
                  {session.phase === "question" && (
                    <button className="button primary" disabled={!typedValue.trim() || busy} type="submit">
                      Kiểm tra <Icon name="arrow" size={17} />
                    </button>
                  )}
                </div>
              </form>
            )}
            {typed && session.phase === "question" && (
              <p className="muted" role="status">
                Gợi ý: {revealed.length}/{hintLimit} chữ trong hạn mức.{" "}
                {revealed.length > hintLimit
                  ? "Đã vượt hạn mức, câu này được tính là có hỗ trợ."
                  : "Đúng trong hạn mức vẫn được tính điểm bình thường."}
              </p>
            )}
            {session.phase === "feedback" && feedback ? (
              <div
                ref={feedbackRef}
                className={`answer-feedback ${feedback.correct ? "is-correct" : "needs-practice"}`}
                role="status"
              >
                <div className="feedback-title">
                  <Icon name={feedback.correct ? "check" : "repeat"} size={22} />
                  <b>
                    {feedback.correct
                      ? "Chính xác. Bạn nhớ rồi!"
                      : feedback.assisted
                        ? "Gặp lại thêm một lần nhé."
                        : "Chưa đúng, cùng xem lại nhé."}
                  </b>
                </div>
                <p>
                  Đáp án: <strong lang={question.kind === "meaning" ? "vi" : "en"}>{answerText}</strong>
                </p>
                {question.kind !== "build" && (
                  <p className="feedback-example" lang="en">
                    {question.kind === "synonym-context"
                      ? question.prompt
                      : question.kind === "cloze-choice" ||
                          question.kind === "word-form-choice" ||
                          question.kind === "word-form"
                        ? (question.kind === "word-form"
                            ? question.prompt.replace(/\s+\([^()]*\)\s*$/, "")
                            : question.prompt
                          ).replace(/_{3,}/, question.answer)
                        : word.examples[0]?.text}
                  </p>
                )}
                {question.kind !== "cloze-choice" &&
                  question.kind !== "word-form-choice" &&
                  question.kind !== "word-form" &&
                  question.kind !== "build" &&
                  question.kind !== "synonym-context" &&
                  word.examples[0]?.translation && <p className="muted">{word.examples[0].translation}</p>}
                <button className="button primary" ref={nextRef} disabled={busy} onClick={() => void advance()}>
                  {session.index + 1 === session.questions.length ? "Xem kết quả" : "Từ tiếp theo"}
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            ) : (
              <div className="question-help">
                {typed && (
                  <button className="text-link" disabled={busy || hintIndex < 0} onClick={() => void revealLetter()}>
                    Gợi ý một chữ
                  </button>
                )}
                <button className="text-link" disabled={busy} onClick={() => void answer("", true)}>
                  Chưa nhớ, xem đáp án
                </button>
                <button className="text-link" disabled={busy} onClick={() => inspect(word)}>
                  <Icon name="help" size={16} /> Xem lại từ
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <div className="study-bottom">
        <span>
          <Icon name="check" size={15} /> Tiến độ được lưu sau mỗi câu
        </span>
        <button className="text-link" disabled={busy} onClick={() => void finish()}>
          Kết thúc tại đây
        </button>
      </div>
    </div>
  );
}
