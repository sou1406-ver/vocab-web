import { Explain } from "../Explain";
import { isRightChoice } from "@/lib/quiz";
import { cx, same } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function SynonymSentence({ q, onAnswer, onNext }: QuestionProps) {
  const { st } = useTypedAnswerState();
  if (q.kind !== "adaptive-synonym-sentence") return null;
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
