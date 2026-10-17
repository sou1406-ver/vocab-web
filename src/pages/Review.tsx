import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { lessonLabel } from "@/lib/data";
import { useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";

export function ReviewPage() {
  const [filter, setFilter] = useState<"all" | "weak" | "learning">("all");
  const { catalog, status, stats } = useProfile();
  const act = useActions();
  const words = catalog
    .scope("all", "all")
    .map((word) => ({ word, misses: stats[word.id]?.w ?? 0, learning: status[word.id] === "learning" }))
    .filter(({ word, misses, learning }) => learning || (misses > 0 && status[word.id] !== "mastered"))
    .sort(
      (a, b) =>
        b.misses - a.misses || Number(b.learning) - Number(a.learning) || a.word.word.localeCompare(b.word.word),
    );
  const weakCount = words.filter(({ misses }) => misses > 0).length;
  const learningCount = words.filter(({ learning }) => learning).length;
  const visibleWords = words.filter(({ misses, learning }) => filter === "all" || (filter === "weak" ? misses > 0 : learning));

  return (
    <div className="review-page">
      <header className="home-head">
        <div>
          <p className="kicker">HỌC CÓ TRỌNG TÂM</p>
          <h1>Ôn tập</h1>
          <p className="lede">Tập trung vào những từ bạn đang học và những từ từng trả lời sai.</p>
        </div>
        {visibleWords.length > 0 && (
          <button className="btn primary" onClick={() => act.reviewWords(visibleWords.map(({ word }) => word.id))}>
            <Icon name="repeat" size="sm" /> Ôn {visibleWords.length} từ bằng flashcard
          </button>
        )}
      </header>

      <section className="d-stats review-stats" aria-label="Tổng quan ôn tập">
        <div className="d-stat">
          <b>{words.length}</b>
          <span>từ cần ôn</span>
        </div>
        <div className="d-stat">
          <b>{weakCount}</b>
          <span>từ từng làm sai</span>
        </div>
        <div className="d-stat">
          <b>{learningCount}</b>
          <span>đang học</span>
        </div>
      </section>

      {words.length ? (
        <>
          <div className="review-filters" role="group" aria-label="Lọc từ cần ôn">
            {([
              ["all", `Tất cả (${words.length})`],
              ["weak", `Hay sai (${weakCount})`],
              ["learning", `Đang học (${learningCount})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn sm${filter === key ? " primary" : ""}`}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {visibleWords.length ? (
            <section className="review-list" aria-label="Danh sách từ cần ôn">
              {visibleWords.map(({ word, misses, learning }) => (
                <article className="card review-item" key={word.id}>
                  <div className="review-word">
                    <Link to={`/network/${word.id}`}>
                      <b>{word.word}</b>
                    </Link>
                    <span className="muted">{word.vi}</span>
                    <small className="muted">{lessonLabel(word)}</small>
                  </div>
                  <div className="review-flags">
                    {misses > 0 && <span className="badge b-rose">Sai {misses} lần</span>}
                    {learning && <span className="badge b-amber">Đang học</span>}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <Empty title="Không có từ nào trong nhóm này" />
          )}
        </>
      ) : (
        <Empty title="Chưa có từ nào cần ôn">
          <p className="muted">Khi bạn trả lời sai hoặc đánh dấu một từ là đang học, từ đó sẽ xuất hiện ở đây.</p>
          <Link className="btn primary" to="/topics">
            Chọn bài để học
          </Link>
        </Empty>
      )}
    </div>
  );
}
