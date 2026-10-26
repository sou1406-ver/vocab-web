import { Explain } from "../Explain";
import { isRightChoice } from "@/lib/quiz";
import { cx, same } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Choice({ q, onAnswer, onNext }: QuestionProps) {
  const { st } = useTypedAnswerState();
  if (q.kind !== "adaptive-choice") return null;
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
