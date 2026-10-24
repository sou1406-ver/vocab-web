import { Explain } from "../Explain";
import { isRightChoice } from "@/lib/quiz";
import { cx, same } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Cloze({ q, onAnswer, onNext }: QuestionProps) {
  const { st, wrongAttempts } = useTypedAnswerState();
  if (q.kind !== "adaptive-cloze") return null;
  const choices = <T,>(opts: T[], label: (o: T) => string, right: (o: T) => boolean) => (
    <div className="choices">
      {opts.map((o, i) => {
        const cls = st.answered ? (right(o) ? "right" : st.last?.pick === i ? "wrong" : "") : "";
        return (
          <button key={i} className={cx("choice", cls)} disabled={st.answered} onClick={() => onAnswer(isRightChoice(q, i), i)}>
            <span className="k">{i + 1}</span>{label(o)}
          </button>
        );
      })}
    </div>
  );
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
