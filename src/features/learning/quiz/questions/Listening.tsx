import { Explain } from "../Explain";
import { LetterSlotsInput } from "../LetterSlotsInput";
import { Ipa } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { speak } from "@/lib/speech";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Listening({ q, onNext }: QuestionProps) {
  const { st, inputRef, hintCount, hintPenalty, typedValue, setTypedValue, typingError, setTypingError, wrongAttempts, submitTypedAnswer, revealNextLetter } = useTypedAnswerState();
  if (q.kind !== "listening") return null;
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
