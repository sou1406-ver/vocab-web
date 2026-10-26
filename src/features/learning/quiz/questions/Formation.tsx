import { Explain } from "../Explain";
import { LetterSlotsInput } from "../LetterSlotsInput";
import { Icon } from "@/components/Icon";
import { POS_LABEL } from "@/lib/data";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Formation({ q, onNext }: QuestionProps) {
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
  if (q.kind !== "adaptive-formation") return null;
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
