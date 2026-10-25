"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "../state/provider";
import { answerMatchPair, matchGroup } from "../domain/match";
import { shuffleSeeded } from "../domain/random";
import { Icon, ProgressBar, Speak } from "../shared/ui";
import type { StudySession } from "../domain/types";

export function MatchBoard({ session }: { session: StudySession }) {
  const { data, busy, change, advance, finish } = useApp();
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const pairs = matchGroup(session).map((question, offset) => ({ question, index: session.index + offset }));
  const right = shuffleSeeded(pairs, `${session.id}:${session.index}:match:right`);
  const eventFor = (index: number) => data.events.find((event) => event.id === `${session.id}:${index}`);
  const resolved = pairs.filter(({ index }) => eventFor(index)).length;
  const clean = pairs.filter(({ index }) => eventFor(index)?.correct).length;
  const complete = session.phase === "feedback";
  const focusLeft = (index?: number) =>
    requestAnimationFrame(() => {
      const target =
        index === undefined
          ? boardRef.current?.querySelector<HTMLButtonElement>(".match-left button:not(:disabled)")
          : boardRef.current?.querySelector<HTMLButtonElement>(`[data-match-index="${index}"]`);
      target?.focus({ preventScroll: true });
    });
  useEffect(() => {
    if (session.phase === "feedback") {
      feedbackRef.current?.focus({ preventScroll: true });
      feedbackRef.current?.scrollIntoView({ block: "nearest" });
    } else
      boardRef.current
        ?.querySelector<HTMLButtonElement>(".match-left button:not(:disabled)")
        ?.focus({ preventScroll: true });
  }, [session.phase]);
  const connect = async (rightIndex: number) => {
    if (selected === null || busy) return;
    const leftIndex = selected;
    const correct = leftIndex === rightIndex;
    if (await change((snapshot) => answerMatchPair(snapshot, session.id, session.index, leftIndex, rightIndex))) {
      setSelected(null);
      setNotice(correct ? "Đã nối đúng và khóa cặp." : "Chưa đúng. Chọn lại từ tiếng Anh rồi thử nghĩa khác.");
      if (correct) focusLeft();
      else focusLeft(leftIndex);
    }
  };
  return (
    <div className="page study-page">
      <div className="study-top">
        <Link className="back-link" href="/lessons">
          ← Tạm dừng
        </Link>
        <span>{session.title}</span>
        <span className="study-counter">{resolved} / 6 cặp</span>
      </div>
      <ProgressBar value={(resolved / 6) * 100} label="Tiến độ nối từ" />
      <div className="study-heading">
        <p className="eyebrow">LUYỆN THÊM · NỐI TỪ THEO CHỦ ĐỀ</p>
        <h1 tabIndex={-1}>Nối từ với nghĩa</h1>
        <p id="match-instructions" className="page-subtitle">
          Chọn một từ tiếng Anh bên trái, rồi chọn nghĩa bên phải. Cặp từng nối sai sẽ không tính đúng từ lần đầu.
        </p>
      </div>
      <section className="study-card match-card" aria-describedby="match-instructions">
        <div ref={boardRef} className="match-board">
          <section className="match-column match-left" aria-label="Từ tiếng Anh">
            <h2>Tiếng Anh</h2>
            {pairs.map(({ question, index }) => {
              const locked = Boolean(eventFor(index));
              return (
                <button
                  key={index}
                  type="button"
                  data-match-index={index}
                  className={`match-tile${locked ? " is-matched" : ""}`}
                  lang="en"
                  disabled={busy || locked || complete}
                  aria-label={`Từ: ${question.prompt}`}
                  aria-pressed={selected === index}
                  onClick={() => {
                    setSelected(selected === index ? null : index);
                    setNotice("");
                  }}
                >
                  {question.prompt}
                  {locked && (
                    <>
                      <Icon name="check" size={16} />
                      <span className="sr-only">Đã nối</span>
                    </>
                  )}
                </button>
              );
            })}
          </section>
          <section className="match-column" aria-label="Nghĩa tiếng Việt">
            <h2>Nghĩa</h2>
            {right.map(({ question, index }) => {
              const locked = Boolean(eventFor(index));
              return (
                <button
                  key={index}
                  type="button"
                  className={`match-tile${locked ? " is-matched" : ""}`}
                  lang="vi"
                  disabled={busy || locked || complete || selected === null}
                  aria-label={`Nghĩa: ${question.answer}`}
                  onClick={() => void connect(index)}
                >
                  {question.answer}
                  {locked && (
                    <>
                      <Icon name="check" size={16} />
                      <span className="sr-only">Đã nối</span>
                    </>
                  )}
                </button>
              );
            })}
          </section>
        </div>
        {!complete && (
          <div className="match-status" role="status">
            <p>
              {notice || (selected === null ? "Chọn một từ tiếng Anh để bắt đầu." : "Chọn nghĩa tiếng Việt phù hợp.")}
            </p>
            <p className="muted">
              {pairs.filter(({ index }) => session.matchMistakes?.includes(index)).length} cặp đã có lần nối sai.
            </p>
          </div>
        )}
        {complete && (
          <div ref={feedbackRef} tabIndex={-1} className="answer-feedback" role="status">
            <h2>Đã nối đủ 6 cặp</h2>
            <p>{clean}/6 cặp đúng từ lần đầu.</p>
            <ul className="match-feedback-list">
              {pairs.map(({ question, index }) => (
                <li key={index}>
                  <strong lang="en">{question.prompt}</strong> — {question.answer} <Speak text={question.prompt} />
                  <span className="muted">{eventFor(index)?.correct ? "Đúng từ lần đầu" : "Đã có lần nối sai"}</span>
                </li>
              ))}
            </ul>
            <button className="button primary" disabled={busy} onClick={() => void advance()}>
              {session.index + 6 === session.questions.length ? "Xem kết quả" : "Bảng tiếp theo"}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        )}
      </section>
      <div className="study-bottom">
        <span>
          <Icon name="check" size={15} /> Lưu sau mỗi lần nối · Không tăng bậc ôn
        </span>
        <button className="text-link" disabled={busy} onClick={() => void finish()}>
          Kết thúc tại đây
        </button>
      </div>
    </div>
  );
}
