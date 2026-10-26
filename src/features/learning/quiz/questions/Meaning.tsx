import { Explain } from "../Explain";
import { Ipa, PosTag, SpeakBtn } from "@/components/bits";
import { FreqMeter } from "@/components/FreqMeter";
import { familyOf, termInfo } from "@/lib/data";
import { isRightChoice } from "@/lib/quiz";
import { cx, same } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Meaning({ q, onAnswer, onNext }: QuestionProps) {
  const { st } = useTypedAnswerState();
  if (q.kind !== "meaning") return null;
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
