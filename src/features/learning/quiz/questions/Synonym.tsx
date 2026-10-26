import { Explain } from "../Explain";
import { Ipa, PosTag, SpeakBtn } from "@/components/bits";
import { FreqMeter } from "@/components/FreqMeter";
import { termInfo } from "@/lib/data";
import { isRightChoice } from "@/lib/quiz";
import { cx, same } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Synonym({ q, onAnswer, onNext }: QuestionProps) {
  const { st } = useTypedAnswerState();
  if (q.kind !== "synonym") return null;
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
        <div className="eyebrow">Chọn từ {q.ant ? "trái nghĩa" : "đồng nghĩa"} với từ sau:</div>
        <div className="row" style={{ marginTop: 8 }}>
          <span className="q-big">{q.root.word}</span>
          <FreqMeter z={termInfo(q.root.word).z} />
          <Ipa ipa={q.root.ipa} />
          <PosTag pos={q.root.pos} />
          <SpeakBtn text={q.root.word} size="" />
        </div>
        <div className="q-hint">Nghĩa: {q.root.vi}</div>
      </div>
      {choices(
        q.options,
        (o) => o,
        (o) => same(o, q.correct),
      )}
      {st.answered && st.last && (
        <Explain
          ok={st.last.ok}
          root={q.root}
          extra={
            <>
              {q.ant ? "Trái nghĩa" : "Đồng nghĩa"} của <b>{q.root.word}</b>:{" "}
              {(q.ant ? q.root.ant : q.root.syn).join(", ")}.
            </>
          }
          onNext={onNext}
        />
      )}
    </>
  );
}
