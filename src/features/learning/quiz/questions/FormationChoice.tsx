import { Explain } from "../Explain";
import { POS_LABEL } from "@/lib/data";
import { isRightChoice, typedAnswerMatches } from "@/lib/quiz";
import { cx, lower, same } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function FormationChoice({ q, onAnswer, onNext }: QuestionProps) {
  const { st, inputRef } = useTypedAnswerState();
  if (q.kind !== "formation" && q.kind !== "adaptive-formation-choice") return null;
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
