import { Explain } from "../Explain";
import { cx } from "@/lib/util";
import { useTypedAnswerState, type QuestionProps } from "../useTypedAnswer";

export function Match({ q, onAnswer, onNext }: QuestionProps) {
  const { st, matchWord, setMatchWord, matchPairs, setMatchPairs } = useTypedAnswerState();
  if (q.kind !== "adaptive-match") return null;
    const complete = Object.keys(matchPairs).length === q.words.length;
    return (
      <>
        <div className="q-box">
          <div className="eyebrow">Bậc 2 · Nối mỗi từ tiếng Anh với nghĩa tương ứng:</div>
          <div className="match-grid">
            <div className="match-column" aria-label="Từ tiếng Anh">
              {q.words.map((word, index) => (
                <button
                  key={word.id}
                  type="button"
                  className={cx(
                    "match-choice",
                    matchWord === index && "active",
                    matchPairs[index] !== undefined && "paired",
                  )}
                  onClick={() => setMatchWord(index)}
                  disabled={st.answered}
                >
                  {word.word}
                </button>
              ))}
            </div>
            <div className="match-column" aria-label="Nghĩa tiếng Việt">
              {q.meanings.map((word, index) => {
                const pairedWord = Object.entries(matchPairs).find(([, meaningIndex]) => meaningIndex === index)?.[0];
                return (
                  <button
                    key={word.id}
                    type="button"
                    className={cx("match-choice", pairedWord !== undefined && "paired")}
                    disabled={st.answered || matchWord === null}
                    onClick={() => {
                      if (matchWord === null) return;
                      setMatchPairs((pairs) => ({ ...pairs, [matchWord]: index }));
                      setMatchWord(null);
                    }}
                  >
                    {word.vi}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {!st.answered && complete && (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const results = q.words.map((word, index) => ({
                id: word.id,
                ok: q.meanings[matchPairs[index]] === word,
              }));
              onAnswer(
                results.every((result) => result.ok),
                undefined,
                false,
                true,
                results,
              );
            }}
          >
            Kiểm tra cặp nối
          </button>
        )}
        {st.answered && st.last && (
          <Explain
            ok={st.last.ok}
            root={q.root}
            extra={
              st.last.ok ? (
                "Đã nối đúng cả 4 cặp."
              ) : (
                <>Đáp án: {q.words.map((word) => `${word.word} — ${word.vi}`).join(" · ")}</>
              )
            }
            onNext={onNext}
          />
        )}
      </>
    );
}
