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

export default function Study() {
  const { data, busy, advance, answer, finish, start } = useApp();
  const router = useRouter();
  const inspect = useWord();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const session = data.session;
  useEffect(() => {
    setInput("");
    if (session?.phase === "learn" || session?.phase === "question") window.scrollTo(0, 0);
    if (session?.phase === "question") inputRef.current?.focus({ preventScroll: true });
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
            : question.kind === "meaning"
              ? "Chọn nghĩa phù hợp"
              : question.kind === "cloze"
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
            <div className={`question-prompt ${question.kind === "cloze" ? "sentence-prompt" : ""}`}>
              <span className="small-label">
                {question.kind === "meaning"
                  ? "TỪ NÀY CÓ NGHĨA LÀ GÌ?"
                  : question.kind === "cloze"
                    ? "HOÀN THÀNH CÂU TIẾNG ANH"
                    : "VIẾT TỪ TIẾNG ANH CÓ NGHĨA"}
              </span>
              <p lang={question.kind === "recall" ? "vi" : "en"}>{question.prompt}</p>
              <span className="pos">{word.pos}</span>
            </div>
            {question.kind === "meaning" ? (
              <div className="answer-options">
                {question.options.map((option, i) => (
                  <button
                    key={option}
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
                  if (input.trim() && session.phase === "question") void answer(input);
                }}
              >
                <label htmlFor="typed-answer">Đáp án của bạn</label>
                <div>
                  <LetterSlotsInput
                    key={`${session.id}:${session.index}`}
                    inputRef={inputRef}
                    id="typed-answer"
                    answer={question.answer}
                    value={session.phase === "feedback" ? (feedback?.input ?? "") : input}
                    disabled={busy || session.phase === "feedback"}
                    onChange={setInput}
                  />
                  {session.phase === "question" && (
                    <button className="button primary" disabled={!input.trim() || busy} type="submit">
                      Kiểm tra <Icon name="arrow" size={17} />
                    </button>
                  )}
                </div>
              </form>
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
                  Đáp án: <strong lang={question.kind === "meaning" ? "vi" : "en"}>{question.answer}</strong>
                </p>
                <p className="feedback-example" lang="en">
                  {word.examples[0]?.text}
                </p>
                {word.examples[0]?.translation && <p className="muted">{word.examples[0].translation}</p>}
                <button className="button primary" ref={nextRef} disabled={busy} onClick={() => void advance()}>
                  {session.index + 1 === session.questions.length ? "Xem kết quả" : "Từ tiếp theo"}
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            ) : (
              <div className="question-help">
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
