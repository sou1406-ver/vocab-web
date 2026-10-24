import { Explain } from "../Explain";
import { PosTag } from "@/components/bits";
import { affixType, POS_LABEL } from "@/lib/data";
import { cx } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Build({ q, onAnswer, onNext }: QuestionProps) {
  const { st, setQuiz } = useTypedAnswerState();
  if (q.kind !== "build") return null;
  const f = q.f;
  return (
    <>
      <div className="q-box" style={{ textAlign: "center" }}>
        <div className="eyebrow">Ghép tiền tố, từ gốc và hậu tố để tạo thành một từ có nghĩa:</div>
        <div className="q-big" style={{ fontSize: "1.45rem", marginTop: 8 }}>
          {f.vi}
        </div>
        <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
          <PosTag pos={f.pos} />
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {POS_LABEL[f.pos] ?? ""} · họ từ “{q.root.word}” · cần {f.parts.length} mảnh
          </span>
        </div>
        <div className="slots">
          {st.picked.length ? (
            st.picked.map((i) => (
              <button
                key={i}
                className={`morph ${affixType(q.tiles[i])}`}
                disabled={st.answered}
                onClick={() => setQuiz({ picked: st.picked.filter((x) => x !== i) })}
              >
                {q.tiles[i]}
              </button>
            ))
          ) : (
            <span className="muted" style={{ fontSize: ".82rem" }}>
              Bấm các mảnh bên dưới theo đúng thứ tự
            </span>
          )}
        </div>
        <div className="tiles">
          {q.tiles.map((t, i) => (
            <button
              key={i}
              className={cx("morph", affixType(t), st.picked.includes(i) && "used")}
              disabled={st.answered}
              onClick={() => !st.picked.includes(i) && setQuiz({ picked: [...st.picked, i] })}
            >
              {t}
            </button>
          ))}
        </div>
        {!st.answered && (
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <button className="btn" onClick={() => setQuiz({ picked: [] })}>
              Xoá
            </button>
            <button
              className="btn primary"
              disabled={!st.picked.length}
              onClick={() => onAnswer(st.picked.map((i) => q.tiles[i]).join("|") === f.parts.join("|"))}
            >
              Kiểm tra
            </button>
          </div>
        )}
      </div>
      {st.answered && st.last && (
        <Explain
          ok={st.last.ok}
          entry={f}
          root={q.root}
          extra={st.last.ok ? null : "Thứ tự đúng ở trên."}
          onNext={onNext}
        />
      )}
    </>
  );
}
