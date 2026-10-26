import { Explain } from "../Explain";
import { LetterSlotsInput } from "../LetterSlotsInput";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Hint({ q, onNext }: QuestionProps) {
  const {
    st,
    inputRef,
    hintPenalty,
    typedValue,
    setTypedValue,
    typingError,
    setTypingError,
    wrongAttempts,
    submitTypedAnswer,
  } = useTypedAnswerState();
  if (q.kind !== "adaptive-hint") return null;
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
