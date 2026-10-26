import { Explain } from "../Explain";
import { Ipa } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { isRightChoice } from "@/lib/quiz";
import { speak } from "@/lib/speech";
import { cx, same } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function ListenChoice({ q, onAnswer, onNext }: QuestionProps) {
  const { st } = useTypedAnswerState();
  if (q.kind !== "adaptive-listen-choice") return null;
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
