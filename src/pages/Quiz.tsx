import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Chips, Empty, Ipa, netHref, PosTag, SpeakBtn } from "@/components/bits";
import { Icon, type IconName } from "@/components/Icon";
import { FreqMeter } from "@/components/FreqMeter";
import { LessonNav, ScopeSelects } from "@/components/LessonNav";
import ClickSpark, { type ClickSparkHandle } from "@/components/reactbits/ClickSpark";
import { affixType, familyOf, LESSON_BY_N, POS_LABEL, termInfo } from "@/lib/data";
import { isRightChoice, typedAnswerMatches, typedAnswerQuality, type Question } from "@/lib/quiz";
import { displayedStatus, dueReviewIds } from "@/lib/srs";
import { speak } from "@/lib/speech";
import type { FamilyEntry, Word } from "@/lib/types";
import { cx, lower, same, scrollBehavior } from "@/lib/util";
import { ensureBookLesson, startQuiz, useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { toast, useUI, type QuizType } from "@/state/ui";
import { BookExercises } from "./Book";

const QUIZ_TYPES: Record<QuizType, { label: string; icon: IconName }> = {
  formation: { label: "Biến đổi từ loại", icon: "branch" },
  synonym: { label: "Đồng nghĩa & Trái nghĩa", icon: "compare" },
  meaning: { label: "Nghĩa của từ", icon: "book" },
  build: { label: "Ghép từ", icon: "puzzle" },
  recall: { label: "Điền từ vào câu", icon: "book" },
  listening: { label: "Nghe & gõ từ", icon: "volume" },
  mixed: { label: "Theo bậc", icon: "layers" },
};

function LetterSlotsInput({
  word,
  value,
  onChange,
  inputRef,
  revealCount = 0,
  lockedCount = revealCount,
  placeholder,
}: {
  word: string;
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  revealCount?: number;
  lockedCount?: number;
  placeholder: string;
}) {
  const letters = Array.from(word);
  const typed = Array.from(value.toLocaleLowerCase().replace(/\s/g, ""));
  let typedIndex = 0;
  return (
    <div className="letter-slot-input" aria-label={`${letters.filter((char) => char !== " ").length} ô chữ cái`}>
      <div className="letter-slots" aria-hidden="true">
        {letters.map((char, index) => {
          if (char === " ") {
            return <span className="letter-slot-space" key={`space-${index}`} />;
          }
          const typedChar = typed[typedIndex++];
          const revealedLetters = Array.from(word.slice(0, index)).filter((letter) => letter !== " ").length;
          const shown = typedChar || (revealedLetters < revealCount ? char.toLocaleLowerCase() : "");
          return (
            <span className={cx("letter-slot", shown && "filled")} key={`${char}-${index}`}>
              {shown || "_"}
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        className="letter-slot-native-input"
        value={value}
        onChange={(event) => onChange(applyFixedHintLetters(event.target.value, word, lockedCount))}
        maxLength={word.length}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

function applyFixedHintLetters(value: string, word: string, lockedCount: number) {
  const answerLetters = Array.from(word.toLocaleLowerCase().replace(/\s/g, ""));
  const inputLetters = Array.from(value.toLocaleLowerCase().replace(/\s/g, "")).slice(0, answerLetters.length);
  for (let index = 0; index < Math.min(lockedCount, answerLetters.length); index++)
    inputLetters[index] = answerLetters[index];

  let letterIndex = 0;
  let result = "";
  for (const character of word) {
    if (character === " ") {
      if (inputLetters.length > letterIndex) result += " ";
    } else {
      result += inputLetters[letterIndex] ?? "";
      letterIndex++;
    }
  }
  return result.trimEnd();
}

export function QuizPage() {
  const mode = useUI((s) => s.quiz.mode);
  const setQuiz = useUI((s) => s.setQuiz);
  useEffect(() => {
    if (mode === "book") ensureBookLesson();
  }, [mode]);
  return (
    <>
      <div className="mode-switch" role="tablist">
        <button
          role="tab"
          aria-selected={mode === "book"}
          className={cx(mode === "book" && "active")}
          onClick={() => setQuiz({ mode: "book" })}
        >
          <Icon name="book" size="sm" /> Bài tập trong sách
        </button>
        <button
          role="tab"
          aria-selected={mode === "auto"}
          className={cx(mode === "auto" && "active")}
          onClick={() => setQuiz({ mode: "auto" })}
        >
          <Icon name="layers" size="sm" /> Tự luyện từ vựng
        </button>
      </div>
      {mode === "book" ? <BookExercises /> : <AutoQuiz />}
    </>
  );
}

function Explain({
  ok,
  close = false,
  entry,
  root,
  extra,
  onNext,
}: {
  ok: boolean;
  close?: boolean;
  entry?: FamilyEntry | null;
  root: Word;
  extra?: ReactNode;
  onNext: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
    // Trên màn hình nhỏ, kéo phần giải thích vào tầm nhìn
    if (box.current && box.current.getBoundingClientRect().bottom > window.innerHeight)
      box.current.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, []);
  return (
    <div className={cx("explain", close ? "close" : ok ? "ok" : "bad")} ref={box}>
      <div style={{ flex: "1 1 300px" }}>
        <h4>{close ? "💡 Gần đúng — giữ nguyên bậc" : ok ? "✅ Đúng rồi!" : "❌ Chưa đúng"}</h4>
        {entry && entry.parts && entry.parts.length > 1 && (
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Chips parts={entry.parts} />
            <span className="plus">→</span>
            <b>{entry.w}</b>
            <PosTag pos={entry.pos} />
          </div>
        )}
        <p>
          {close ? (
            <>Sai một ký tự hoặc dùng dạng khác trong họ từ nên lượt này không tăng hay giảm hộp ôn. {extra}</>
          ) : (
            extra
          )}
          {entry && (
            <>
              {" "}
              <b>{entry.w}</b> {entry.pos ? `(${POS_LABEL[entry.pos] ?? entry.pos})` : ""}: {entry.vi}.
            </>
          )}
          {entry?.note && (
            <>
              <br />
              <span className="note">{entry.note}</span>
            </>
          )}
        </p>
        <p style={{ fontSize: ".78rem" }}>
          <Link to={netHref(root.id, entry ? entry.w : root.word)}>Mở trường từ “{root.word}” →</Link>
        </p>
      </div>
      <button className="btn dark" id="quiz-next" ref={btn} onClick={onNext}>
        Câu tiếp <Icon name="right" size="sm" />
      </button>
    </div>
  );
}

function QuestionView({
  q,
  onAnswer,
  onNext,
}: {
  q: Question;
  onAnswer: (
    ok: boolean,
    pick?: number,
    close?: boolean,
    masteryCredit?: boolean,
    reviewResults?: { id: string; ok: boolean }[],
  ) => void;
  onNext: () => void;
}) {
  const st = useUI((s) => s.quiz);
  const setQuiz = useUI((s) => s.setQuiz);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hintCount, setHintCount] = useState(0);
  const [hintPenalty, setHintPenalty] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [typingError, setTypingError] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const wrongAttemptsRef = useRef(0);
  const [matchWord, setMatchWord] = useState<number | null>(null);
  const [matchPairs, setMatchPairs] = useState<Record<number, number>>({});

  const submitTypedAnswer = (answer: string, target: string, alternatives?: string[]) => {
    if (!answer.trim()) return;
    const quality = typedAnswerQuality(answer, target, alternatives);
    if (quality === "correct") {
      setTypingError(false);
      onAnswer(true, undefined, false, !hintPenalty);
      return;
    }
    if (quality === "close") {
      setTypingError(false);
      onAnswer(false, undefined, true);
      return;
    }
    setTypingError(true);
    setTypedValue("");
    const attempts = wrongAttemptsRef.current + 1;
    wrongAttemptsRef.current = attempts;
    setWrongAttempts(attempts);
    if (attempts >= 3) onAnswer(false);
  };

  const revealNextLetter = (word: string) => {
    const letterCount = Array.from(word).filter((letter) => letter !== " ").length;
    if (hintCount >= letterCount) return;
    const nextCount = hintCount + 1;
    setHintCount(nextCount);
    setTypedValue((value) => applyFixedHintLetters(value, word, nextCount));
    inputRef.current?.focus();
    if (nextCount > 2 && !hintPenalty) {
      setHintPenalty(true);
      setTypingError(true);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [q]);

  const choices = <T,>(opts: T[], label: (o: T) => string, right: (o: T) => boolean) => (
    <div className="choices">
      {opts.map((o, i) => {
        const cls = st.answered ? (right(o) ? "right" : st.last?.pick === i ? "wrong" : "") : "";
        return (
          <button
            key={i}
            className={cx("choice", cls)}
            disabled={st.answered}
            onClick={() => onAnswer(isRightChoice(q, i), i)}
          >
            <span className="k">{i + 1}</span>
            {label(o)}
          </button>
        );
      })}
    </div>
  );

  if (q.kind === "adaptive-listen-choice") {
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 1 · Nghe phát âm rồi chọn từ:</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn soft" type="button" onClick={() => speak(q.root.word)}>
              <Icon name="volume" size="sm" /> Nghe lại
            </button>
            <Ipa ipa={q.root.ipa} />
          </div>
        </div>
        {choices(
          q.options,
          (option) => option,
          (option) => same(option, q.root.word),
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.root.word}</b>.
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-match") {
    const complete = Object.keys(matchPairs).length === q.words.length;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 2 · Nối mỗi từ tiếng Anh với nghĩa tương ứng:</div>
          <div className="match-grid">
            <div className="match-column" aria-label="Từ tiếng Anh">
              {q.words.map((word, index) => (
                <button
                  key={word.id}
                  type="button"
                  className={cx(
                    "match-choice",
                    matchWord === index && "active",
                    matchPairs[index] !== undefined && "paired",
                  )}
                  onClick={() => setMatchWord(index)}
                  disabled={st.answered}
                >
                  {word.word}
                </button>
              ))}
            </div>
            <div className="match-column" aria-label="Nghĩa tiếng Việt">
              {q.meanings.map((word, index) => {
                const pairedWord = Object.entries(matchPairs).find(([, meaningIndex]) => meaningIndex === index)?.[0];
                return (
                  <button
                    key={word.id}
                    type="button"
                    className={cx("match-choice", pairedWord !== undefined && "paired")}
                    disabled={st.answered || matchWord === null}
                    onClick={() => {
                      if (matchWord === null) return;
                      setMatchPairs((pairs) => ({ ...pairs, [matchWord]: index }));
                      setMatchWord(null);
                    }}
                  >
                    {word.vi}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {!st.answered && complete && (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const results = q.words.map((word, index) => ({
                id: word.id,
                ok: q.meanings[matchPairs[index]] === word,
              }));
              onAnswer(
                results.every((result) => result.ok),
                undefined,
                false,
                true,
                results,
              );
            }}
          >
            Kiểm tra cặp nối
          </button>
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              st.last.ok ? (
                "Đã nối đúng cả 4 cặp."
              ) : (
                <>Đáp án: {q.words.map((word) => `${word.word} — ${word.vi}`).join(" · ")}</>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-synonym-sentence") {
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 3 · Chọn từ gần nghĩa nhất với từ được khuyết:</div>
          <div className="q-text">{q.sentence}</div>
          <div className="q-hint">
            Từ gốc: <b>{q.root.word}</b> · {q.root.vi}
          </div>
        </div>
        {choices(
          q.options,
          (option) => option,
          (option) => same(option, q.synonym),
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              <>
                Từ gần nghĩa: <b>{q.synonym}</b>.
              </>
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-form-fix") {
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 4 · Câu sau dùng sai dạng từ. Chọn dạng đúng:</div>
          <div className="q-text">{q.sentence}</div>
          <div className="q-hint">
            Từ đang dùng sai: <b>{q.wrongForm}</b> · {q.entry.vi}
          </div>
        </div>
        {choices(
          q.options,
          (option) => option,
          (option) => same(option, q.correctForm),
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            entry={q.entry}
            root={q.root}
            extra={
              <>
                Dạng đúng là <b>{q.correctForm}</b>.
              </>
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-choice") {
    const title = q.level === 1 ? "Nhận mặt từ" : "Phân biệt từ";
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">
            Bậc {q.level} · {title} · Chọn từ khớp với nghĩa:
          </div>
          <div className="q-big" style={{ fontSize: "1.5rem", marginTop: 8 }}>
            {q.root.vi}
          </div>
        </div>
        {choices(
          q.options,
          (option) => option,
          (option) => same(option, q.root.word),
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.root.word}</b>.
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-cloze") {
    const before = q.s.slice(0, q.m.index);
    const after = q.s.slice(q.m.index + q.m.text.length);
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 3 · Điền dạng từ đúng vào câu:</div>
          <div className="q-text">
            {before}
            <span className="blank">{st.answered ? q.m.text : "______"}</span>
            {after}
          </div>
          {q.entry.vi && <div className="q-hint">Nghĩa của dạng từ: {q.entry.vi}</div>}
        </div>
        {choices(
          q.options,
          (option) => option,
          (option) => same(option, q.m.text),
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            entry={q.entry}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.m.text}</b>.
                  {wrongAttempts >= 3 && " Từ này đã được đánh dấu chưa thuộc; bạn có thể ôn lại sau."}
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-hint") {
    const before = q.s.slice(0, q.m.index);
    const after = q.s.slice(q.m.index + q.m.text.length);
    const answerComplete = typedValue.replace(/\s/g, "").length >= q.m.text.replace(/\s/g, "").length;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 4 · Tự điền từ — có gợi ý:</div>
          <div className="q-text">
            {before}
            <span className="blank">{st.answered ? q.m.text : "______"}</span>
            {after}
          </div>
          {q.translation && <div className="q-hint">{q.translation}</div>}
          <div className="q-hint">
            Bắt đầu bằng <b>{q.m.text[0]?.toLocaleLowerCase()}</b> · {q.m.text.replace(/\s/g, "").length} chữ cái
          </div>
        </div>
        {!st.answered && (
          <form
            className="type-row type-row-slots"
            onSubmit={(event) => {
              event.preventDefault();
              submitTypedAnswer(typedValue, q.m.text, q.alternatives);
            }}
          >
            <label className="eyebrow" htmlFor="quiz-input">
              Từ còn thiếu
            </label>
            <LetterSlotsInput
              word={q.m.text}
              value={typedValue}
              onChange={(value) => {
                setTypedValue(value);
                setTypingError(false);
              }}
              inputRef={inputRef}
              revealCount={1}
              lockedCount={1}
              placeholder="Nhập từ còn thiếu"
            />
            {typingError && (
              <div className="typing-error" role="alert">
                {hintPenalty && wrongAttempts === 0
                  ? "Lượt này không tăng hay giảm hộp ôn vì đã dùng quá 2 gợi ý."
                  : `Chưa đúng, còn ${3 - wrongAttempts} lượt.`}
              </div>
            )}
            {answerComplete && <button className="btn primary">Kiểm tra</button>}
          </form>
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            close={st.last.close}
            root={q.root}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.m.text}</b>.
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-formation") {
    const before = q.s.slice(0, q.m.index);
    const after = q.s.slice(q.m.index + q.m.text.length);
    const answerComplete = typedValue.replace(/\s/g, "").length >= q.m.text.replace(/\s/g, "").length;
    const hintTotal = Array.from(q.m.text).filter((letter) => letter !== " ").length;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 4 · Biến đổi từ loại — điền dạng đúng:</div>
          <div className="q-text">
            {before}
            <span className="blank">{st.answered ? q.m.text : "______"}</span>
            {after}
          </div>
          <div className="q-hint">
            Từ gốc: <b>{q.root.word}</b> · cần <b>{POS_LABEL[q.f.pos] ?? q.f.pos}</b> mang nghĩa “{q.f.vi}”.
          </div>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          {!st.answered && hintCount < hintTotal && (
            <button className="btn sm soft" type="button" onClick={() => revealNextLetter(q.m.text)}>
              <Icon name="book" size="sm" /> Gợi ý chữ tiếp theo
            </button>
          )}
          {hintPenalty && <span className="badge b-amber">Quá 2 gợi ý · hộp ôn không đổi</span>}
        </div>
        {!st.answered && (
          <form
            className="type-row type-row-slots"
            onSubmit={(event) => {
              event.preventDefault();
              submitTypedAnswer(typedValue, q.m.text, q.alternatives);
            }}
          >
            <label className="eyebrow" htmlFor="quiz-input">
              Từ đã biến đổi
            </label>
            <LetterSlotsInput
              word={q.m.text}
              value={typedValue}
              onChange={(value) => {
                setTypedValue(value);
                setTypingError(false);
              }}
              inputRef={inputRef}
              revealCount={1}
              lockedCount={1}
              placeholder="Nhập dạng từ đúng"
            />
            {typingError && (
              <div className="typing-error" role="alert">
                {hintPenalty && wrongAttempts === 0
                  ? "Lượt này không tăng hay giảm hộp ôn vì đã dùng quá 2 gợi ý."
                  : `Chưa đúng, còn ${3 - wrongAttempts} lượt.`}
              </div>
            )}
            {answerComplete && <button className="btn primary">Kiểm tra</button>}
          </form>
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            close={st.last.close}
            root={q.root}
            entry={q.f}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.m.text}</b>.
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "adaptive-recall") {
    const hintTotal = Array.from(q.root.word).filter((letter) => letter !== " ").length;
    const answerComplete = typedValue.replace(/\s/g, "").length >= hintTotal;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">
            Bậc {q.level} · {q.listening ? "Nghe từ và gõ đáp án:" : "Tự nhớ từ và gõ đáp án:"}
          </div>
          {q.listening ? (
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn soft" type="button" onClick={() => speak(q.root.word)}>
                <Icon name="volume" size="sm" /> Nghe từ
              </button>
              <Ipa ipa={q.root.ipa} />
            </div>
          ) : (
            <>
              <div className="q-big" style={{ fontSize: "1.5rem", marginTop: 8 }}>
                {q.root.vi}
              </div>
              <div style={{ marginTop: 8 }}>
                <Ipa ipa={q.root.ipa} />
              </div>
            </>
          )}
          <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {hintCount < hintTotal && (
              <button className="btn sm soft" type="button" onClick={() => revealNextLetter(q.root.word)}>
                <Icon name="book" size="sm" /> Gợi ý chữ tiếp theo
              </button>
            )}
            {hintPenalty && <span className="badge b-amber">Quá 2 gợi ý · hộp ôn không đổi</span>}
          </div>
        </div>
        {!st.answered && (
          <form
            className="type-row type-row-slots"
            onSubmit={(event) => {
              event.preventDefault();
              submitTypedAnswer(typedValue, q.root.word, q.alternatives);
            }}
          >
            <label className="eyebrow" htmlFor="quiz-input">
              Từ tiếng Anh
            </label>
            <LetterSlotsInput
              word={q.root.word}
              value={typedValue}
              onChange={(value) => {
                setTypedValue(value);
                setTypingError(false);
              }}
              inputRef={inputRef}
              revealCount={hintCount}
              lockedCount={hintCount}
              placeholder="Gõ từ bạn nhớ"
            />
            {typingError && (
              <div className="typing-error" role="alert">
                {hintPenalty && wrongAttempts === 0
                  ? "Lượt này không tăng hay giảm hộp ôn vì đã dùng quá 2 gợi ý."
                  : `Chưa đúng, còn ${3 - wrongAttempts} lượt.`}
              </div>
            )}
            {answerComplete && <button className="btn primary">Kiểm tra</button>}
          </form>
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            close={st.last.close}
            root={q.root}
            extra={
              st.last.ok ? (
                hintPenalty ? (
                  "Đúng, nhưng lượt này không thay đổi hộp ôn vì đã dùng quá 2 gợi ý."
                ) : null
              ) : (
                <>
                  Đáp án: <b>{q.root.word}</b>.
                  {wrongAttempts >= 3 && " Từ này đã được đánh dấu chưa thuộc; bạn có thể ôn lại sau."}
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "listening") {
    const hintTotal = Array.from(q.root.word).filter((letter) => letter !== " ").length;
    const answerComplete = typedValue.replace(/\s/g, "").length >= hintTotal;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Nghe phát âm rồi tự gõ lại từ:</div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn soft" type="button" onClick={() => speak(q.root.word)}>
              <Icon name="volume" size="sm" /> Nghe lại
            </button>
            <Ipa ipa={q.root.ipa} />
          </div>
          <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {hintCount < hintTotal && (
              <button className="btn sm soft" type="button" onClick={() => revealNextLetter(q.root.word)}>
                <Icon name="book" size="sm" /> Gợi ý chữ tiếp theo
              </button>
            )}
            {hintPenalty && <span className="badge b-amber">Quá 2 gợi ý · hộp ôn không đổi</span>}
          </div>
        </div>
        {!st.answered && (
          <form
            className="type-row type-row-slots"
            onSubmit={(e) => {
              e.preventDefault();
              submitTypedAnswer(typedValue, q.root.word);
            }}
          >
            <label className="eyebrow" htmlFor="quiz-input">
              Từ bạn nghe được
            </label>
            <LetterSlotsInput
              word={q.root.word}
              value={typedValue}
              onChange={(value) => {
                setTypedValue(value);
                setTypingError(false);
              }}
              inputRef={inputRef}
              revealCount={hintCount}
              lockedCount={hintCount}
              placeholder="Gõ từ vừa nghe"
            />
            {typingError && (
              <div className="typing-error" role="alert">
                {hintPenalty && wrongAttempts === 0
                  ? "Lượt này không tăng hay giảm hộp ôn vì đã dùng quá 2 gợi ý."
                  : `Chưa đúng, còn ${3 - wrongAttempts} lượt.`}
              </div>
            )}
            {answerComplete && <button className="btn primary">Kiểm tra</button>}
          </form>
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              st.last.ok ? (
                hintPenalty ? (
                  "Đúng, nhưng lượt này không thay đổi hộp ôn vì đã dùng quá 2 gợi ý."
                ) : null
              ) : (
                <>
                  Đáp án: <b>{q.root.word}</b>.
                  {wrongAttempts >= 3 && " Từ này đã được đánh dấu chưa thuộc; bạn có thể ôn lại sau."}
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "recall") {
    const before = q.s.slice(0, q.m.index);
    const after = q.s.slice(q.m.index + q.m.text.length);
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Gõ từ còn thiếu trong câu ví dụ:</div>
          <div className="q-text">
            {before}
            <span className="blank">{st.answered ? q.m.text : "______"}</span>
            {after}
          </div>
          <div className="q-hint">Nghĩa: {q.root.vi}</div>
        </div>
        {!st.answered && (
          <form
            className="type-row"
            onSubmit={(e) => {
              e.preventDefault();
              const answer = inputRef.current?.value ?? "";
              if (!answer.trim()) return;
              onAnswer(typedAnswerMatches(answer, q.m.text));
            }}
          >
            <label className="eyebrow" htmlFor="quiz-input">
              Từ còn thiếu
            </label>
            <input
              ref={inputRef}
              className="input"
              id="quiz-input"
              autoComplete="off"
              spellCheck={false}
              placeholder="Nhập từ còn thiếu…"
              aria-label="Từ còn thiếu trong câu ví dụ"
            />
            <button className="btn primary">Kiểm tra</button>
          </form>
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.m.text}</b>.
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "formation" || q.kind === "adaptive-formation-choice") {
    const adaptiveFormation = q.kind === "adaptive-formation-choice";
    const before = q.s.slice(0, q.m.index);
    const after = q.s.slice(q.m.index + q.m.text.length);
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">
            {adaptiveFormation
              ? "Bậc 3 · Chọn dạng từ đúng để hoàn thành câu:"
              : "Chọn dạng đúng của từ trong ngoặc để hoàn thành câu:"}
          </div>
          <div className="q-text">
            {before}
            <span className="blank">{st.answered ? q.m.text : "______"}</span>
            {!adaptiveFormation && " "}
            {!adaptiveFormation && <span className="base">({q.base.toUpperCase()})</span>}
            {after}
          </div>
          <div className="q-hint">
            {adaptiveFormation && (
              <>
                Từ gốc: <b>{q.base}</b> ·{" "}
              </>
            )}
            💡 Gợi ý: cần một <b>{POS_LABEL[q.f.pos] ?? q.f.pos}</b> mang nghĩa “{q.f.vi}”.
          </div>
        </div>
        {!adaptiveFormation && st.style === "typing" ? (
          <form
            className="type-row"
            onSubmit={(e) => {
              e.preventDefault();
              const v = lower(inputRef.current?.value ?? "");
              if (!v || st.answered) return;
              onAnswer(typedAnswerMatches(v, q.m.text) || typedAnswerMatches(v, q.f.w));
            }}
          >
            <input
              ref={inputRef}
              className="input"
              id="quiz-input"
              autoComplete="off"
              spellCheck={false}
              placeholder="Gõ từ đã biến đổi…"
              aria-label="Từ đã biến đổi"
              disabled={st.answered}
            />
            <button className="btn primary" disabled={st.answered}>
              Kiểm tra
            </button>
          </form>
        ) : (
          choices(
            q.options,
            (o) => o,
            (o) => same(o, q.m.text),
          )
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            entry={q.f}
            root={q.root}
            extra={
              st.last.ok ? null : (
                <>
                  Đáp án: <b>{q.m.text}</b>.
                </>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "synonym") {
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Chọn từ {q.ant ? "trái nghĩa" : "đồng nghĩa"} với từ sau:</div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="q-big">{q.root.word}</span>
            <FreqMeter z={termInfo(q.root.word).z} />
            <Ipa ipa={q.root.ipa} />
            <PosTag pos={q.root.pos} />
            <SpeakBtn text={q.root.word} size="" />
          </div>
          <div className="q-hint">Nghĩa: {q.root.vi}</div>
        </div>
        {choices(
          q.options,
          (o) => o,
          (o) => same(o, q.correct),
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              <>
                {q.ant ? "Trái nghĩa" : "Đồng nghĩa"} của <b>{q.root.word}</b>:{" "}
                {(q.ant ? q.root.ant : q.root.syn).join(", ")}.
              </>
            }
            onNext={onNext}
          />
        )}
      </>
    );
  }

  if (q.kind === "meaning") {
    const w = q.root;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">{q.reverse ? "Từ nào có nghĩa là:" : "Nghĩa của từ:"}</div>
          {q.reverse ? (
            <div className="q-big" style={{ fontSize: "1.5rem", marginTop: 8 }}>
              {w.vi}
            </div>
          ) : (
            <div className="row" style={{ marginTop: 8 }}>
              <span className="q-big">{w.word}</span>
              <FreqMeter z={termInfo(w.word).z} />
              <Ipa ipa={w.ipa} />
              <PosTag pos={w.pos} />
              <SpeakBtn text={w.word} size="" />
            </div>
          )}
          {w.def && <div className="q-hint">Định nghĩa (sách): {w.def}</div>}
        </div>
        {choices(
          q.options,
          (o) => (q.reverse ? o.word : o.vi),
          (o) => o === w,
        )}
        {st.answered && st.last && (
          <Explain ok={st.last.ok} entry={familyOf(w).find((f) => same(f.w, w.word))} root={w} onNext={onNext} />
        )}
      </>
    );
  }

  // Ghép từ
  const f = q.f;
  return (
    <>
      <div className="q-box" style={{ textAlign: "center" }}>
        <div className="eyebrow">Ghép tiền tố, từ gốc và hậu tố để tạo thành một từ có nghĩa:</div>
        <div className="q-big" style={{ fontSize: "1.45rem", marginTop: 8 }}>
          {f.vi}
        </div>
        <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
          <PosTag pos={f.pos} />
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {POS_LABEL[f.pos] ?? ""} · họ từ “{q.root.word}” · cần {f.parts.length} mảnh
          </span>
        </div>
        <div className="slots">
          {st.picked.length ? (
            st.picked.map((i) => (
              <button
                key={i}
                className={`morph ${affixType(q.tiles[i])}`}
                disabled={st.answered}
                onClick={() => setQuiz({ picked: st.picked.filter((x) => x !== i) })}
              >
                {q.tiles[i]}
              </button>
            ))
          ) : (
            <span className="muted" style={{ fontSize: ".82rem" }}>
              Bấm các mảnh bên dưới theo đúng thứ tự
            </span>
          )}
        </div>
        <div className="tiles">
          {q.tiles.map((t, i) => (
            <button
              key={i}
              className={cx("morph", affixType(t), st.picked.includes(i) && "used")}
              disabled={st.answered}
              onClick={() => !st.picked.includes(i) && setQuiz({ picked: [...st.picked, i] })}
            >
              {t}
            </button>
          ))}
        </div>
        {!st.answered && (
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <button className="btn" onClick={() => setQuiz({ picked: [] })}>
              Xoá
            </button>
            <button
              className="btn primary"
              disabled={!st.picked.length}
              onClick={() => onAnswer(st.picked.map((i) => q.tiles[i]).join("|") === f.parts.join("|"))}
            >
              Kiểm tra
            </button>
          </div>
        )}
      </div>
      {st.answered && st.last && (
        <Explain
          ok={st.last.ok}
          entry={f}
          root={q.root}
          extra={st.last.ok ? null : "Thứ tự đúng ở trên."}
          onNext={onNext}
        />
      )}
    </>
  );
}

function AutoQuiz() {
  const act = useActions();
  const st = useUI((s) => s.quiz);
  const setQuiz = useUI((s) => s.setQuiz);
  const { catalog, recordAnswer, status, statusAt, srs, reviewedToday } = useProfile();
  const spark = useRef<ClickSparkHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (st.stale) startQuiz();
  }, [st.stale]);

  const q = st.qs[st.i];

  const answer = (
    ok: boolean,
    pick?: number,
    close = false,
    masteryCredit = true,
    reviewResults?: { id: string; ok: boolean }[],
  ) => {
    const s = useUI.getState().quiz;
    if (s.answered || !q) return;
    const before = useProfile.getState();
    const targets = reviewResults ?? [{ id: q.root.id, ok }];
    const confirming = new Set(
      targets
        .filter(({ id }) => before.srs?.[id]?.confirming || before.status[id] === "confirming")
        .map(({ id }) => id),
    );
    if (!close && masteryCredit) for (const result of targets) recordAnswer(result.id, result.ok);
    const missed = new Set(s.missed);
    for (const result of targets) {
      if (!result.ok) missed.add(result.id);
      else missed.delete(result.id);
    }
    setQuiz({
      answered: true,
      last: { ok, pick, close },
      right: s.right + (ok ? 1 : 0),
      wrong: s.wrong + (!ok && !close && masteryCredit ? 1 : 0),
      close: s.close + (close ? 1 : 0),
      missed: close || !masteryCredit ? s.missed : [...missed],
    });
    for (const id of confirming) {
      if (useProfile.getState().status[id] === "mastered")
        toast(`${useProfile.getState().catalog.byId[id]?.word ?? id}: Đã xác nhận thuộc sau 3 lượt đúng cách quãng!`);
    }
    // Trả lời đúng: bắn tia sáng (React Bits · ClickSpark) từ nút vừa chọn
    if (ok && spark.current && cardRef.current) {
      const target =
        pick != null ? cardRef.current.querySelectorAll(".choice")[pick] : cardRef.current.querySelector(".q-box");
      const host = cardRef.current.getBoundingClientRect();
      const r = (target as HTMLElement | null)?.getBoundingClientRect();
      if (r) spark.current.spark(r.left - host.left + r.width / 2, r.top - host.top + r.height / 2);
    }
  };
  const nextQ = () => setQuiz({ i: useUI.getState().quiz.i + 1, answered: false, picked: [], last: null });
  const restart = (p: Partial<typeof st> = {}) => {
    setQuiz(p);
    startQuiz();
  };

  const dueCount = dueReviewIds(
    Object.keys(catalog.byId),
    status,
    srs ?? {},
    statusAt,
    Date.now(),
    undefined,
    reviewedToday,
  ).length;
  const learningCount = catalog.all.filter((word) => {
    const current = displayedStatus(word.id, status, srs ?? {});
    return current === "learning" || current === "confirming";
  }).length;
  const practiceGroups: { title: string; types: QuizType[] }[] = [
    { title: "Nghĩa", types: ["meaning", "synonym"] },
    { title: "Dạng từ", types: ["formation", "build"] },
    { title: "Nhớ ra", types: ["recall", "listening"] },
  ];

  // Phím 1–4 chọn đáp án, Enter sang câu tiếp
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || useUI.getState().modal) return;
      const s = useUI.getState().quiz;
      const cur = s.qs[s.i];
      if (!cur) return;
      const n = parseInt(e.key, 10);
      const typing =
        cur.kind === "recall" ||
        cur.kind === "listening" ||
        cur.kind === "adaptive-hint" ||
        cur.kind === "adaptive-formation" ||
        cur.kind === "adaptive-recall" ||
        (cur.kind === "formation" && s.style === "typing");
      if (
        !s.answered &&
        !typing &&
        cur.kind !== "build" &&
        cur.kind !== "adaptive-match" &&
        n >= 1 &&
        n <= (cur.options?.length ?? 0)
      )
        answer(isRightChoice(cur, n - 1), n - 1);
      else if (s.answered && e.key === "Enter" && (e.target as HTMLElement).id !== "quiz-next") {
        e.preventDefault();
        nextQ();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const header = (
    <>
      <section className="card quiz-start-card">
        <div>
          <p className="eyebrow">Luyện hôm nay</p>
          <h2>Ôn đúng những từ cần nhớ</h2>
          <p className="muted">
            {Math.min(10, dueCount + learningCount)} câu · {dueCount} từ đến hạn · {learningCount} từ đang học
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() =>
            // chưa có từ nào cần ôn (người mới) → luyện trên toàn bộ từ thay vì ra đề rỗng
            restart({
              type: "mixed",
              scope: dueCount + learningCount ? "due" : "all",
              unit: "all",
              lesson: "all",
              only: "all",
              forWord: null,
            })
          }
        >
          <Icon name="layers" size="sm" /> {dueCount + learningCount ? "Bắt đầu luyện" : "Luyện từ mới"}
        </button>
      </section>
      <div className="quiz-controls card">
        <div className="quiz-scope-row" role="group" aria-label="Phạm vi luyện tập">
          {(
            [
              ["due", "Từ cần ôn"],
              ["lesson", "Theo bài…"],
              ["all", "Tất cả"],
            ] as const
          ).map(([scope, label]) => (
            <button
              key={scope}
              className={cx("quiz-scope", st.scope === scope && "active")}
              aria-pressed={st.scope === scope}
              onClick={() =>
                restart({
                  scope,
                  only: "all",
                  forWord: null,
                  ...(scope === "all" ? { unit: "all", lesson: "all" } : {}),
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        {st.forWord && catalog.byId[st.forWord] ? (
          <span className="badge b-violet">Trường từ: {catalog.byId[st.forWord].word}</span>
        ) : st.scope === "lesson" ? (
          <>
            <ScopeSelects
              unit={st.unit}
              lesson={st.lesson}
              onUnit={(v) => restart({ unit: v, lesson: "all" })}
              onLesson={(v) => restart({ lesson: v })}
            />
            <LessonNav unit={st.unit} lesson={st.lesson} where="quiz" />
          </>
        ) : null}
        <div className="quiz-control-actions">
          <details className="quiz-custom-types">
            <summary>▸ Luyện riêng một dạng</summary>
            <div className="quiz-type-groups">
              {practiceGroups.map((group) => (
                <div key={group.title} className="quiz-type-group">
                  <span className="eyebrow">{group.title}</span>
                  {group.types.map((type) => (
                    <button
                      key={type}
                      className={cx("quiz-type-option", st.type === type && "active")}
                      onClick={() => restart({ type })}
                    >
                      <Icon name={QUIZ_TYPES[type].icon} size="sm" /> {QUIZ_TYPES[type].label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
          <button className="btn sm soft" onClick={() => restart()}>
            <Icon name="repeat" size="sm" /> Đề mới
          </button>
        </div>
      </div>
      {st.type === "mixed" && (
        <p className="muted">Theo bậc sẽ tự đổi dạng và độ khó cho từng từ, từ nhận diện đến tự nhớ đáp án.</p>
      )}
    </>
  );

  // Phạm vi "Từ cần ôn" nhưng hôm nay chưa có từ nào đến hạn → chỉ lối khác, không báo lỗi dạng bài
  if (!st.qs.length && st.scope === "due" && !st.forWord)
    return (
      <div className="stack">
        {header}
        <Empty title="Hôm nay chưa có từ nào cần ôn">
          Từ bạn đã học sẽ quay lại đây khi đến hạn ôn. Trong lúc chờ, luyện thêm từ mới nhé.
          <br />
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn primary" onClick={() => restart({ scope: "all", unit: "all", lesson: "all" })}>
              Luyện tất cả từ
            </button>
            <button className="btn" onClick={() => restart({ scope: "lesson" })}>
              Luyện theo bài
            </button>
          </div>
        </Empty>
      </div>
    );

  if (!st.qs.length)
    return (
      <div className="stack">
        {header}
        <Empty title={`Chưa có câu hỏi dạng “${QUIZ_TYPES[st.type].label}” ở phạm vi này`}>
          Các từ trong phạm vi này không có dữ liệu cho dạng bài đó.
          <br />
          {st.type !== "mixed" ? (
            <button className="btn" onClick={() => restart({ type: "mixed" })}>
              Làm dạng Theo bậc
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => restart({ scope: "all", unit: "all", lesson: "all", forWord: null })}
            >
              Luyện tất cả từ
            </button>
          )}
        </Empty>
      </div>
    );

  if (st.i >= st.qs.length) {
    const graded = st.right + st.wrong;
    const p = graded ? Math.round((st.right / graded) * 100) : 0;
    const nextLesson = !st.forWord && st.lesson !== "all" ? LESSON_BY_N[+st.lesson + 1] : undefined;
    return (
      <div className="stack">
        {header}
        <div className="card quiz-card" style={{ textAlign: "center", maxWidth: 640 }}>
          <div className="topic-icon" style={{ margin: "0 auto" }}>
            <Icon name="award" size="lg" />
          </div>
          <h3 style={{ fontSize: "1.5rem", marginTop: 14 }}>Hoàn thành lượt luyện!</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            {st.missed.length > 0
              ? `Có ${st.missed.length} từ cần ôn lại. ${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Hãy xem lại trước khi tiếp tục nhé.`
              : p >= 80
                ? `${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Rất tốt! Bạn đang nắm khá vững phần này.`
                : p >= 50
                  ? `${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Bạn làm khá tốt. Hãy xem lại những câu còn nhầm nhé.`
                  : `${st.close ? `${st.close} câu gần đúng được giữ nguyên bậc. ` : ""}Hãy xem lại các từ và phần giải thích, rồi thử lại nhé.`}
          </p>
          <div
            className="grid grid-2"
            style={{ margin: "20px 0", background: "var(--surface-2)", padding: 16, borderRadius: 16 }}
          >
            <div>
              <div className="muted" style={{ fontSize: ".78rem" }}>
                Đúng / câu đã chấm
              </div>
              <div className="q-big" style={{ color: "var(--indigo)" }}>
                {st.right} / {graded}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: ".78rem" }}>
                Tỷ lệ chính xác
              </div>
              <div className="q-big" style={{ color: "var(--emerald)" }}>
                {graded ? `${p}%` : "—"}
              </div>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            {st.missed.length > 0 && (
              <button className="btn primary" onClick={() => act.reviewWords(st.missed)}>
                <Icon name="repeat" size="sm" /> Ôn {st.missed.length} từ vừa sai
              </button>
            )}
            {nextLesson && (
              <button
                className={cx("btn", st.missed.length === 0 && "primary")}
                onClick={() => act.openLesson(nextLesson.n)}
              >
                <Icon name="right" size="sm" /> Học tiếp bài {nextLesson.n}
              </button>
            )}
            <button className={cx("btn", st.missed.length === 0 && !nextLesson && "primary")} onClick={() => restart()}>
              <Icon name="undo" size="sm" /> Làm bài mới
            </button>
            <button className="btn" onClick={() => act.navigate("/network")}>
              <Icon name="network" size="sm" /> Xem lại Sơ đồ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const kindLabel = {
    formation: "Biến đổi từ loại",
    synonym: q.kind === "synonym" && q.ant ? "Trái nghĩa" : "Đồng nghĩa",
    meaning: "Nghĩa của từ",
    build: "Ghép từ",
    recall: "Điền từ vào câu",
    listening: "Nghe & gõ từ",
    "adaptive-choice": `Bậc ${q.kind === "adaptive-choice" ? q.level : ""}`,
    "adaptive-cloze": "Bậc 3 · Điền câu",
    "adaptive-hint": "Bậc 4 · Gõ có gợi ý",
    "adaptive-formation-choice": "Bậc 3 · Biến đổi từ loại",
    "adaptive-formation": "Bậc 4 · Biến đổi từ loại",
    "adaptive-recall":
      q.kind === "adaptive-recall" ? `Bậc ${q.level} · ${q.listening ? "Nghe & gõ" : "Tự nhớ"}` : "Bậc 5–6 · Tự nhớ",
    "adaptive-listen-choice": "Bậc 1 · Nghe chọn từ",
    "adaptive-match": "Bậc 2 · Nối nghĩa",
    "adaptive-synonym-sentence": "Bậc 3 · Đồng nghĩa trong câu",
    "adaptive-form-fix": "Bậc 4 · Sửa dạng từ",
  }[q.kind];
  const adaptive = q.kind.startsWith("adaptive-");

  return (
    <div className="stack">
      {header}
      <div className="bar" style={{ maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}>
        <span style={{ width: `${(st.i / st.qs.length) * 100}%` }} />
      </div>
      <ClickSpark
        ref={spark}
        auto={false}
        sparkColor={["#2f7a55", "#c08a2e", "#2f4b8f"]}
        sparkCount={12}
        sparkRadius={34}
        sparkSize={12}
        duration={520}
        style={{ height: "auto" }}
      >
        <div className="card quiz-card" ref={cardRef}>
          <div className="row between">
            <div className="row" style={{ gap: 6 }}>
              <span className="badge b-indigo">
                Câu {st.i + 1} / {st.qs.length}
              </span>
              <span className="badge b-sky">{kindLabel}</span>
              {!adaptive && <span className="badge b-violet mono">Gốc: {q.root.word.toUpperCase()}</span>}
            </div>
            <div className="row">
              <span className="score-pill" style={{ color: "var(--emerald)" }}>
                <Icon name="check2" size="sm" /> {st.right}
              </span>
              <span className="score-pill" style={{ color: "var(--rose)" }}>
                <Icon name="x" size="sm" /> {st.wrong}
              </span>
              {st.close > 0 && (
                <span className="score-pill" style={{ color: "var(--amber-text)" }}>
                  ~ {st.close}
                </span>
              )}
            </div>
          </div>
          <QuestionView key={st.i} q={q} onAnswer={answer} onNext={nextQ} />
        </div>
      </ClickSpark>
    </div>
  );
}
