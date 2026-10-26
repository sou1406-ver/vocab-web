import { Explain } from "../Explain";
import { Ipa } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { typedAnswerMatches } from "@/lib/quiz";
import { speak } from "@/lib/speech";
import { LetterSlotsInput } from "../LetterSlotsInput";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";
export function Recall(props: QuestionProps) {
  if (props.q.kind === "adaptive-recall") return <AdaptiveRecall {...props} />;
  if (props.q.kind === "recall") return <BookRecall {...props} />;
  return null;
}
function AdaptiveRecall({ q, onNext }: QuestionProps) {
  const {
    st,
    inputRef,
    hintCount,
    hintPenalty,
    typedValue,
    setTypedValue,
    typingError,
    setTypingError,
    wrongAttempts,
    submitTypedAnswer,
    revealNextLetter,
  } = useTypedAnswerState();
  if (q.kind !== "adaptive-recall") return null;
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
function BookRecall({ q, onAnswer, onNext }: QuestionProps) {
  const { st, inputRef } = useTypedAnswerState();
  if (q.kind !== "recall") return null;
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
